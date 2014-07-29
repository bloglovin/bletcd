/* jshint node: true */
'use strict';

var lib = {
  url: require('url'),
  querystring: require('querystring'),
  http: require('http'),
  https: require('https'),
  Watcher: require('./watcher')
};

module.exports = Etcd;

function Etcd(hostname, port, sslOpts) {
  this.api = '/v2/keys/';
  this.hostname = hostname || '127.0.0.1';
  this.port = port || 4001;

  this.https = !!sslOpts;
  this.httpLib = this.https ? lib.https : lib.http;
  this.sslOpts = sslOpts;
  if (this.sslOpts) {
    this.agent = new this.httpLib.Agent(sslOpts);
  }
}

Etcd.prototype.get = function (key, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  return this._request('GET', key, options, false, callback);
};

Etcd.prototype.set = function (key, value, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || {};
  options.value = value;

  return this._request('PUT', key, options, true, callback);
};

Etcd.prototype.create = function (key, value, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  options = options || {};
  options.value = value;

  return this._request('POST', key, options, true, callback);
};

Etcd.prototype.del = function (key, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  return this._request('DELETE', key, options, false, callback);
};

Etcd.prototype._request = function (method, key, parameters, body, callback) {
  var headers = {};
  var path = this.api + trimKey(key);

  if (parameters) {
    parameters = lib.querystring.stringify(parameters);
    if (body) {
      headers['Content-type'] = 'application/x-www-form-urlencoded';
      headers['Content-length'] = Buffer.byteLength(parameters);
    }
    else {
      path += '?' + parameters;
    }
  }

  var req = this.httpLib.request({
    hostname: this.hostname,
    port: this.port,
    method: method,
    headers: headers,
    path: path,
    agent: this.agent
  });

  if (body) {
    req.write(parameters);
  }

  req.on('response', etcdResponseHandler(callback));
  req.on('error', callback);

  req.end();
  return req;
};

Etcd.prototype.watcher = function (key, index, options) {
  if (typeof index === 'object') {
    options = index;
    index = null;
  }

  options = options || {};
  if (typeof index === 'number') {
    options.waitIndex = index;
  }

  return new lib.Watcher(this, key, options);
};

function trimKey(key) {
  return key.replace(/(^\/)|(\/$)/g, '');
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

      try {
        payload = JSON.parse(data);
      } catch (error) {
        return callback(error, null, res.headers);
      }

      if (res.statusCode < 200 || res.statusCode >= 300) {
        var error = new Error(payload.message);
        callback(error, payload, res.headers);
      }
      else {
        callback(null, payload, res.headers);
      }
    });
  };
}
