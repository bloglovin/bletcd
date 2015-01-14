/* jshint node: true */
/* global suite, test */
'use strict';

var lib = {
  nock: require('nock'),
  Etcd: require('../')
};

lib.nock('http://127.0.0.1:4001')
  .put('/v2/keys/bletcd-test/fooval', 'value=foovalue')
  .reply(307, '', {
    'location': 'http://127.0.0.1:4002/v2/keys/bletcd-test/fooval',
    'date': 'Wed, 14 Jan 2015 09:37:39 GMT',
    'content-type': 'text/plain; charset=utf-8',
    'transfer-encoding': 'chunked' });

lib.nock('http://127.0.0.1:4002')
  .put('/v2/keys/bletcd-test/fooval', 'value=foovalue')
  .reply(201, {'action':'set','node':{'key':'/bletcd-test/fooval','value':'foovalue','modifiedIndex':278,'createdIndex':278}}, {
    'content-type': 'application/json',
    'x-etcd-index': '278',
    'x-raft-index': '26391',
    'x-raft-term': '1',
    'date': 'Wed, 14 Jan 2015 09:37:39 GMT',
    'transfer-encoding': 'chunked' });

lib.nock('http://127.0.0.1:4002')
  .put('/v2/keys/bletcd-test/fooval', 'value=foovalue')
  .reply(201, {'action':'set','node':{'key':'/bletcd-test/fooval','value':'foovalue','modifiedIndex':279,'createdIndex':279}}, {
    'content-type': 'application/json',
    'x-etcd-index': '279',
    'x-raft-index': '26392',
    'x-raft-term': '1',
    'date': 'Wed, 14 Jan 2015 09:37:39 GMT',
    'transfer-encoding': 'chunked' });

suite('Failovers', function testClient() {
  var etcd = lib.Etcd();

  test('Client follows redirects to leader', function createNode(done) {
    etcd.set('bletcd-test/fooval', 'foovalue', function createResult(error) {
      done(error);
    });
  });

  test('Next request goes directly to leader', function createNode(done) {
    etcd.set('bletcd-test/fooval', 'foovalue', function createResult(error) {
      done(error);
    });
  });
});
