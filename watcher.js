/* jshint node: true */
'use strict';

var lib = {
  util: require('util'),
  events: require('events')
};

module.exports = Watcher;

function Watcher(etcd, key, options) {
  var watcher = this;
  var retryAttempts = 0;
  var requestOpts = {};

  watcher._stopped = false;

  Object.getOwnPropertyNames(options).forEach(function setOption(name) {
    requestOpts[name] = options[name];
  });

  function wait() {
    if (watcher._stopped) return;

    requestOpts.wait = true;
    watcher._req = etcd.get(key, requestOpts, result);
  }

  function result(error, op) {
    watcher._req = null;

    if (error) {
      watcher.emit('error', error);

      setTimeout(wait, watcher.backOff(retryAttempts));
      retryAttempts++;
    } else {
      retryAttempts = 0;
      requestOpts.waitIndex = op.node.modifiedIndex + 1;

      watcher.emit('change', op);
      wait();
    }
  }

  wait();
}
lib.util.inherits(Watcher, lib.events.EventEmitter);

Watcher.prototype.backOff = function (retryAttempts) {
  return Math.pow(2, retryAttempts)*300 + Math.round(Math.random() * 1000);
};

Watcher.prototype.stop = function () {
  this._stopped = true;
  if (this._req) {
    this._req.abort();
    this._req = null;
  }
};
