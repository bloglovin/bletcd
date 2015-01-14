/* jshint node: true */
'use strict';

var url = require('url');
var querystring = require('querystring');
var http = require('http');
var https = require('https');

var createWatcher = require('./lib/watcher');
var BLEtcdError = require('./lib/error');

module.exports = createClient;

function createClient(clientOptions) {
  clientOptions = shallowClone(clientOptions) || {};

  var hostUrl = clientOptions.url || 'http://127.0.0.1:4001';
  var host = url.parse(hostUrl);

  var leaderUrl = clientOptions.leaderUrl || hostUrl;
  var leaderHost = url.parse(leaderUrl);

  var apiRoot = '/v2/keys/';

  var agent;
  var ssl = host.protocol === 'https:';
  var httpLib = ssl ? https : http;
  if (ssl || clientOptions.agentConfig) {
    agent = new httpLib.Agent(clientOptions.agentConfig);
  }

  var api = Object.freeze({
    get: get,
    put: put,
    set: put,
    post: post,
    create: post,
    delete: del,
    del: del,
    watcher: watcher,
  });

  function get(key, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    var parameters = shallowClone(options.parameters) || {};
    // Pick up on some options as parameters
    if (options.recursive !== undefined) {
      parameters.recursive = options.recursive;
    }
    if (options.wait !== undefined) {
      parameters.wait = options.wait;
    }
    if (options.waitIndex !== undefined) {
      parameters.waitIndex = options.waitIndex;
    }

    return request('GET', key, {
      parameters: parameters,
      options: options,
    }, callback);
  }

  function put(key, value, options, callback) {
    return write('PUT', key, value, options, callback);
  }

  function post(key, value, options, callback) {
    return write('POST', key, value, options, callback);
  }

  function del(key, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    var parameters = options.parameters || {};
    definedSet(parameters, 'recursive', options.recursive);

    return request('DELETE', key, {
      parameters: parameters,
      options: options,
    }, callback);
  }

  function write(method, key, value, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    var body = shallowClone(options.attributes) || {};
    body.value = value;

    if (options.ttl !== undefined) {
      body.ttl = options.ttl;
    }

    return request(method, key, {
      parameters: shallowClone(options.parameters),
      body: body,
      options: options,
    }, callback);
  }

  function request(method, key, config, callback) {
    var headers = {};
    var options = config.options || {};
    var path = apiRoot + trimKey(key);

    var selectedHost = isWriteOp(method) ? leaderHost : host;

    if (config.parameters !== undefined) {
      var parameters = querystring.stringify(config.parameters);
      if (parameters.length) {
        path += '?' + parameters;
      }
    }

    var payload;
    if (config.body !== undefined) {
      payload = querystring.stringify(config.body);
      headers['Content-type'] = 'application/x-www-form-urlencoded';
      headers['Content-length'] = Buffer.byteLength(payload);
    }

    function performRequest() {
      var req = httpLib.request({
        hostname: selectedHost.hostname,
        port: selectedHost.port || 4001,
        method: method,
        headers: headers,
        path: path,
        agent: agent,
      });

      var timeout = clientOptions.timeout;
      if (options.timeout !== undefined) {
        timeout = options.timeout;
      }
      if (timeout !== undefined) {
        req.setTimeout(timeout);
      }

      if (payload) {
        req.write(payload);
      }

      req.on('response', etcdResponseHandler(function(err, result, headers) {
        if (err && err.reason === BLEtcdError.reason.leaderRedirect) {
          leaderHost = url.parse(headers.location);
          selectedHost = leaderHost;
          currentRequest = performRequest();
          return;
        }
        callback(err, result, headers);
      }));
      req.on('error', function (err) {
        currentRequest = undefined;
        var error = new BLEtcdError('Request failed', BLEtcdError.reason.requestFailed, err);
        callback(error);
      });
      req.end();
    }

    var currentRequest = performRequest();

    return Object.freeze({
      abort: function() {
        if (currentRequest) {
          currentRequest.abort();
        }
      },
    });
  }

  function watcher(key, index, options) {
    if (typeof index === 'object') {
      options = index;
      index = null;
    }

    options = options || {};
    if (typeof index === 'number') {
      options.waitIndex = index;
    }

    return createWatcher(api, key, options);
  }

  return api;
}

function shallowClone(obj) {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  var clone = {};
  Object.getOwnPropertyNames(obj).forEach(function(name) {
    clone[name] = obj[name];
  });
  return clone;
}

function definedSet(target, name, value) {
  if (value !== undefined) {
    target[name] = value;
  }
}

function trimKey(key) {
  return key.replace(/(^\/)|(\/$)/g, '');
}

function isWriteOp(method) {
  return ['POST', 'PUT', 'DELETE'].indexOf(method) !== -1;
}

function etcdResponseHandler(callback) {
  return function onResponse(res) {
    var data = '';

    res.setEncoding('utf8');
    res.on('data', function gotChunk(chunk) {
      data += chunk;
    });

    res.on('end', function gotFullResponse() {
      var payload;
      var error;

      try {
        payload = data.length ? JSON.parse(data) : undefined;
      } catch (err) {
        error = new BLEtcdError('Failed to parse JSON', BLEtcdError.reason.badResponse, err);
        return callback(error, null, res.headers);
      }

      if (res.statusCode === 307) {
        error = new BLEtcdError('Redirected to leader', BLEtcdError.reason.leaderRedirect);
        callback(error, payload, res.headers);
      }
      else if (res.statusCode < 200 || res.statusCode >= 300) {
        var message = payload && payload.message ? payload.message : 'Unknown error';
        error = new BLEtcdError(message, BLEtcdError.reason.errorResponse);
        callback(error, payload, res.headers);
      }
      else {
        callback(null, payload, res.headers);
      }
    });
  };
}
