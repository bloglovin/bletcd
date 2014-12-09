/* jshint node: true */
'use strict';

var events = require('events');

module.exports = createWatcher;

function createWatcher(etcd, key, options) {
  var retryAttempts = 0;
  var requestOpts = {};
  var req;
  var stopped = false;
  var emitter = new events.EventEmitter();

  Object.getOwnPropertyNames(options).forEach(function setOption(name) {
    requestOpts[name] = options[name];
  });

  function wait() {
    if (stopped) { return; }

    requestOpts.wait = true;
    req = etcd.get(key, requestOpts, result);
  }

  function result(error, op, headers) {
    if (stopped) { return; }
    req = undefined;

    if (error) {
      emitter.emit('error', error);

      setTimeout(wait, backOff(retryAttempts));
      retryAttempts++;
    } else if (op === undefined && headers['x-etcd-index']) {
      // Empty timout response from etcd
      requestOpts.waitIndex = parseInt(headers['x-etcd-index'], 10) + 1;
      wait();
    } else {
      retryAttempts = 0;
      requestOpts.waitIndex = op.node.modifiedIndex + 1;

      emitter.emit('change', op);
      wait();
    }
  }

  function backOff(retryAttempts) {
    return Math.pow(2, retryAttempts)*300 + Math.round(Math.random() * 1000);
  }

  function stop() {
    stopped = true;
    if (req) {
      req.abort();
      req = undefined;
    }
  }

  wait();

  return Object.freeze({
    on: function(event, handler) {
      emitter.on(event, handler);
    },
    stop: stop,
  });
}
