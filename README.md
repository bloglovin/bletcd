# bletcd - The Bloglovin' etcd client

Bletcd is a minimalistic etcd client with convenient functionality for watching for changes.

# Usage

```js
var client = bletcd({
  url: 'http://127.0.0.1:4001',
});

var watcher = client.watcher('test/other-key');
watcher.on('error', function(err) {
  console.error('Watch error:', err);
  watcher.stop();
});
watcher.on('change', function(op) {
  console.log('Notified of change:', op);
});

client.put('test/other-key', 'a-value', function(err, response) {
  if (err) {
    console.error('Failed to write value', err);
    watcher.stop();
    return;
  }
  console.log('Wrote a value to etcd');

  client.get('test/other-key', function(err, response) {
    if (err) {
      console.error('Failed to fetch value', err);
    }
    else {
      console.log('Successfully fetched the key value:', response.node.value);
    }

    client.delete('test/other-key', function(err) {
      if (err) {
        console.error('Failed to delete value:', err);
      }
      else {
        console.log('Successfully deleted value');
      }
      watcher.stop();
    });
  });
});
```

Output:
```txt
Notified of change: { action: 'set',
  node:
   { key: '/test/other-key',
     value: 'a-value',
     modifiedIndex: 537,
     createdIndex: 537 } }
Wrote a value to etcd
Successfully fetched the key value: a-value
Notified of change: { action: 'delete',
  node: { key: '/test/other-key', modifiedIndex: 538, createdIndex: 537 },
  prevNode:
   { key: '/test/other-key',
     value: 'a-value',
     modifiedIndex: 537,
     createdIndex: 537 } }
Successfully deleted value
```
