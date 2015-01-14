/* jshint node: true */
'use strict';

var util = require('util');
var VError = require('verror');

function BLEtcdError(message, reason, err) {
  if (err) {
    VError.call(this, err, message);
  }
  else {
    VError.call(this, message);
  }

  this.name = 'BLEtcdError';
  this.reason = reason;
}
util.inherits(BLEtcdError, VError);

BLEtcdError.reason = {
  requestFailed: 'RequestFailed',
  badResponse: 'BadResponse',
  leaderRedirect: 'LeaderRedirect',
  errorResponse: 'ErrorResponse',
};

module.exports = BLEtcdError;
