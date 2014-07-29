/* jshint node: true */
/*global suite, test, before */
'use strict';

var lib = {
  assert: require('assert'),
  nock: require('nock'),
  Etcd: require('../')
};

var etcd = lib.nock('http://127.0.0.1:4001');

etcd.get('/v2/keys/bletcd-test/watched?wait=true').delay(10)
  .reply(200, {"action":"set","node":{"key":"/bletcd-test/watched","value":"foovalue","modifiedIndex":79263,"createdIndex":79263}}, { 'content-type': 'application/json',
  'x-etcd-index': '79262',
  'x-raft-index': '927182',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 08:35:22 GMT',
  'transfer-encoding': 'chunked' });

etcd.put('/v2/keys/bletcd-test/watched', "value=foovalue")
  .reply(201, {"action":"set","node":{"key":"/bletcd-test/watched","value":"foovalue","modifiedIndex":79263,"createdIndex":79263}}, { 'content-type': 'application/json',
  'x-etcd-index': '79263',
  'x-raft-index': '927183',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 08:35:22 GMT',
  'transfer-encoding': 'chunked' });

etcd.delete('/v2/keys/bletcd-test/watched')
  .reply(200, {"action":"delete","node":{"key":"/bletcd-test/watched","modifiedIndex":79264,"createdIndex":79263},"prevNode":{"key":"/bletcd-test/watched","value":"foovalue","modifiedIndex":79263,"createdIndex":79263}}, { 'content-type': 'application/json',
  'x-etcd-index': '79264',
  'x-raft-index': '927184',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 08:35:22 GMT',
  'transfer-encoding': 'chunked' });

etcd.get('/v2/keys/bletcd-test/watched?wait=true&waitIndex=79264').delay(10)
  .reply(200, {"action":"delete","node":{"key":"/bletcd-test/watched","modifiedIndex":79264,"createdIndex":79263},"prevNode":{"key":"/bletcd-test/watched","value":"foovalue","modifiedIndex":79263,"createdIndex":79263}}, { 'content-type': 'application/json',
  'x-etcd-index': '79264',
  'x-raft-index': '927184',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 08:35:22 GMT',
  'transfer-encoding': 'chunked' });

suite('Watching', function testClient() {
  var etcd = new lib.Etcd();

  test('Watch for changes', function testWatcher(done) {
    var watcher = etcd.watcher('bletcd-test/watched');

    function finished(error) {
      watcher.stop();
      done(error);
    }

    watcher.on('error', finished);

    watcher.on('change', function watcherReacted(op) {
      if (op.action === 'set') {
        etcd.del('bletcd-test/watched', function delResult(error) {
          if (error) finished(error);
        });
      }
      else if (op.action === 'delete') {
        finished();
      }
      else {
        finished(new Error('Unexpected change action ' + op.action));
      }
    });

    etcd.set('bletcd-test/watched', 'foovalue', function createResult(error, result) {
      if (error) finished(error);
    });
  });
});

etcd.get('/v2/keys/bletcd-test/watched?wait=true').times(2).reply(500, 'Fuu');

suite('Watch retry', function testClient() {
  var etcd = new lib.Etcd();

  test('Backoff', function testWatcher(done) {
    var watcher = etcd.watcher('bletcd-test/watched');
    var failCount = 0;
    var failT;

    watcher.on('error', function watcherError(error) {
      if (failCount) {
        watcher.stop();
        var delta = Date.now() - failT;

        if (delta < 300) {
          done(new Error('The watcher is not backing off'))
        }
        else {
          done();
        }
      }
      failCount++;
      failT = Date.now();
    });
  });
});