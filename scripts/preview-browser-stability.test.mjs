// scripts/preview-browser-stability.test.mjs — the in-browser half of `pnpm preview:ready` must FAIL
// on a page that keeps reloading (the 2026-10-15 storm: a server fetch said READY while every real
// tab reloaded about once a second) and PASS on a page that holds still. Real headless Chromium,
// a throwaway local HTTP server, no Next server.
//   node --test scripts/preview-browser-stability.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { browserStability, judgeStability } from "./lib/preview-browser-stability.mjs";

function serve(html) {
  return new Promise((resolve) => {
    const server = http.createServer((_, res) => {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(html);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("a page that reloads itself every second is NOT stable", { timeout: 60000 }, async () => {
  const server = await serve("<!doctype html><title>storm</title><script>setTimeout(() => location.reload(), 1000)</script>");
  try {
    const { port } = server.address();
    const r = await browserStability({ url: `http://127.0.0.1:${port}/`, port, windowSec: 8 });
    if (r.skipped) return assert.fail(`no headless browser: ${r.why}`);
    assert.equal(r.ok, false);
    assert.match(r.why, /reloaded|clock reset/);
  } finally {
    server.close();
  }
});

test("a page that holds still is stable", { timeout: 60000 }, async () => {
  const server = await serve("<!doctype html><title>still</title><p>hello</p>");
  try {
    const { port } = server.address();
    const r = await browserStability({ url: `http://127.0.0.1:${port}/`, port, windowSec: 6 });
    if (r.skipped) return assert.fail(`no headless browser: ${r.why}`);
    assert.deepEqual(r, { ok: true, why: "" });
  } finally {
    server.close();
  }
});

test("a same-document URL update after load (router.replace) is NOT a reload", { timeout: 60000 }, async () => {
  const server = await serve("<!doctype html><title>replace</title><script>setTimeout(() => history.replaceState(null, '', '/notes?view=all'), 1500)</script>");
  try {
    const { port } = server.address();
    const r = await browserStability({ url: `http://127.0.0.1:${port}/`, port, windowSec: 6 });
    if (r.skipped) return assert.fail(`no headless browser: ${r.why}`);
    assert.deepEqual(r, { ok: true, why: "" });
  } finally {
    server.close();
  }
});

test("the verdict names the server's restart signals as the cause", () => {
  const v = judgeStability({
    samples: [{ up: 5000, origin: 1, state: "loading" }, { up: 900, origin: 2, state: "loading" }],
    hmrRestarts: 24,
    windowSec: 20,
  });
  assert.equal(v.ok, false);
  assert.match(v.why, /reloaded 1 time/);
  assert.match(v.why, /clock reset 1/);
  assert.match(v.why, /never finished loading/);
  assert.match(v.why, /24 hot-reload "restart"/);
});
