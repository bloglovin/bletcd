/* jshint node: true */
/*global suite, test, before */
'use strict';

var lib = {
  assert: require('assert'),
  nock: require('nock'),
  Etcd: require('../')
};

var etcd = lib.nock('http://127.0.0.1:4001');

etcd.put('/v2/keys/bletcd-test/fooval', "value=foovalue")
  .reply(200, {"action":"set","node":{"key":"/bletcd-test/fooval","value":"foovalue","modifiedIndex":79154,"createdIndex":79154},"prevNode":{"key":"/bletcd-test/fooval","value":"barvalue","modifiedIndex":79150,"createdIndex":79150}}, { 'content-type': 'application/json',
  'x-etcd-index': '79154',
  'x-raft-index': '921236',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 07:46:42 GMT',
  'transfer-encoding': 'chunked' });

etcd.get('/v2/keys/bletcd-test/fooval')
  .reply(200, {"action":"get","node":{"key":"/bletcd-test/fooval","value":"foovalue","modifiedIndex":79143,"createdIndex":79143}}, { 'content-type': 'application/json',
  'x-etcd-index': '79143',
  'x-raft-index': '920461',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 07:40:20 GMT',
  'transfer-encoding': 'chunked' });

etcd.put('/v2/keys/bletcd-test/fooval', "value=barvalue")
  .reply(200, {"action":"set","node":{"key":"/bletcd-test/fooval","value":"barvalue","modifiedIndex":79147,"createdIndex":79147},"prevNode":{"key":"/bletcd-test/fooval","value":"foovalue","modifiedIndex":79146,"createdIndex":79146}}, { 'content-type': 'application/json',
  'x-etcd-index': '79147',
  'x-raft-index': '920713',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 07:42:25 GMT',
  'transfer-encoding': 'chunked' });

etcd.get('/v2/keys/bletcd-test/fooval')
  .reply(200, {"action":"get","node":{"key":"/bletcd-test/fooval","value":"barvalue","modifiedIndex":79150,"createdIndex":79150}}, { 'content-type': 'application/json',
  'x-etcd-index': '79150',
  'x-raft-index': '920881',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 07:43:47 GMT',
  'transfer-encoding': 'chunked' });

etcd.delete('/v2/keys/bletcd-test/fooval')
  .reply(200, {"action":"delete","node":{"key":"/bletcd-test/fooval","modifiedIndex":79165,"createdIndex":79164},"prevNode":{"key":"/bletcd-test/fooval","value":"barvalue","modifiedIndex":79164,"createdIndex":79164}}, { 'content-type': 'application/json',
  'x-etcd-index': '79165',
  'x-raft-index': '921790',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 07:51:14 GMT',
  'transfer-encoding': 'chunked' });

etcd.get('/v2/keys/bletcd-test/fooval')
  .reply(404, {"errorCode":100,"message":"Key not found","cause":"/bletcd-test/fooval","index":79187}, { 'content-type': 'application/json',
  'x-etcd-index': '79187',
  date: 'Tue, 29 Jul 2014 07:54:43 GMT',
  'transfer-encoding': 'chunked' });

etcd.post('/v2/keys/bletcd-test/foodir', "value=nodeval")
  .reply(201, {"action":"create","node":{"key":"/bletcd-test/foodir/79212","value":"nodeval","modifiedIndex":79212,"createdIndex":79212}}, { 'content-type': 'application/json',
  'x-etcd-index': '79212',
  'x-raft-index': '923537',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 08:05:24 GMT',
  'transfer-encoding': 'chunked' });

etcd.get('/v2/keys/bletcd-test/foodir?recursive=true')
  .reply(200, {"action":"get","node":{"key":"/bletcd-test/foodir","dir":true,"nodes":[{"key":"/bletcd-test/foodir/79212","value":"nodeval","modifiedIndex":79212,"createdIndex":79212}],"modifiedIndex":79212,"createdIndex":79212}}, { 'content-type': 'application/json',
  'x-etcd-index': '79212',
  'x-raft-index': '923537',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 08:05:24 GMT',
  'transfer-encoding': 'chunked' });

etcd.delete('/v2/keys/bletcd-test/foodir?recursive=true')
  .reply(200, {"action":"delete","node":{"key":"/bletcd-test/foodir","dir":true,"modifiedIndex":79213,"createdIndex":79212},"prevNode":{"key":"/bletcd-test/foodir","dir":true,"modifiedIndex":79212,"createdIndex":79212}}, { 'content-type': 'application/json',
  'x-etcd-index': '79213',
  'x-raft-index': '923538',
  'x-raft-term': '14',
  date: 'Tue, 29 Jul 2014 08:05:24 GMT',
  'transfer-encoding': 'chunked' });

var assert = lib.assert;

suite('CRUD', function testClient() {
  var etcd = new lib.Etcd();

  test('Create node', function createNode(done) {
    etcd.set('bletcd-test/fooval', 'foovalue', function createResult(error, result) {
      done(error);
    });
  });

  test('Get node', function getNode(done) {
    etcd.get('bletcd-test/fooval', function getResult(error, result) {
      if (error) return done(error);

      assert.equal(result.node.value, 'foovalue');
      done();
    });
  });

  test('Update node', function createNode(done) {
    etcd.set('bletcd-test/fooval', 'barvalue', function createResult(error, result) {
      done(error);
    });
  });

  test('Check update of node', function getNode(done) {
    etcd.get('bletcd-test/fooval', function getResult(error, result) {
      if (error) return done(error);

      assert.equal(result.node.value, 'barvalue');
      done();
    });
  });

  test('Delete node', function deleteNode(done) {
    etcd.del('bletcd-test/fooval', function delResult(error) {
      done(error);
    });
  });

  test('Check that node is gone', function getNode(done) {
    etcd.get('bletcd-test/fooval', function getResult(error, result) {
      assert.ok(!!error, 'Did not get an error');
      assert.equal(result.errorCode, 100);
      done();
    });
  });

  var sequentialKey;
  test('Create sequentially numbered node', function postNode(done) {
    etcd.create('bletcd-test/foodir', 'nodeval', function createResult(error, result) {
      if (error) return done(error);

      sequentialKey = result.node.key;
      done();
    });
  });

  test('Get directory', function getRecursive(done) {
    etcd.get('bletcd-test/foodir', {recursive:true}, function getResult(error, result) {
      if (error) return done(error);

      assert.ok(result.node.dir, 'The node is not a directory');
      assert.equal(result.node.nodes.length, 1, 'The node doesn\'t have the expected number of children');

      var child = result.node.nodes[0];
      if (child) {
        assert.equal(child.key, sequentialKey, 'The child has an unknown key');
      }

      done();
    });
  });

  test('Delete directory', function getRecursive(done) {
    etcd.del('bletcd-test/foodir', {recursive:true}, function deleteResult(error, result) {
      if (error) return done(error);
      done();
    });
  });
});
