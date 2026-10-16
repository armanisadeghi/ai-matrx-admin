import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { releaseWalkSlot } from './walk-release.mjs';

test('releaseWalkSlot posts the release to the session host and reports it', async () => {
  const seen = [];
  const srv = http.createServer((req, res) => {
    seen.push({ m: req.method, u: req.url, h: req.headers['x-matrx-walk-release'] });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ released: true }));
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  try {
    const r = await releaseWalkSlot(`http://runner.localhost:${port}/dashboard?x=1`, (url, init) => fetch(url.replace('runner.localhost', '127.0.0.1'), init));
    assert.deepEqual(r, { released: true });
    assert.deepEqual(seen, [{ m: 'POST', u: '/__dev-walk?release=1', h: '1' }]);
  } finally { srv.close(); }
});

test('releaseWalkSlot never throws and refuses non-localhost hosts', async () => {
  assert.equal((await releaseWalkSlot('https://example.com/x', () => { throw new Error('must not call'); })).released, false);
  assert.equal((await releaseWalkSlot('', () => { throw new Error('must not call'); })).released, false);
  assert.equal((await releaseWalkSlot('http://a.localhost:1/', () => Promise.reject(new Error('down')))).released, false);
});

test('test-browser.mjs shutdown (stop and idle stop) releases the slot before the browser closes', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../test-browser.mjs', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('async function shutdown()'), src.indexOf('const sel = '));
  assert.match(body, /await releaseWalkSlot\(page\.url\(\)\)/);
  assert.ok(body.indexOf('releaseWalkSlot') < body.indexOf('browser.close'));
  assert.match(src, /async stop\(\) \{ setTimeout\(shutdown/);
});
