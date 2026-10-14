// Exercise the installed Next rewrite transport with the actual callback config.
const assert = require("node:assert/strict");
const http = require("node:http");
const { parse } = require("node:url");
const { once } = require("node:events");
require("next/dist/server/require-hook").addHookAliases([
  ["webpack", require.resolve("next/dist/compiled/webpack/webpack")],
]);
const { proxyRequest } = require("next/dist/server/lib/router-utils/proxy-request");
const { AIDREAM_PRODUCTION_URL } = require("../lib/api/endpoints.ts");

async function main() {
  const config = require("../next.config.js")("phase-production-build");
  const all = await config.rewrites();
  const routes = all.filter((entry) => entry.source.endsWith("/deauthorize"));
  const products = ["facebook", "instagram", "threads"];
  assert.deepEqual(routes.map((entry) => entry.source), products.map((product) => `/api/social-oauth/${product}/deauthorize`));
  for (const entry of routes) {
    assert.equal(entry.destination, `${AIDREAM_PRODUCTION_URL}${entry.source}`);
  }
  const received = [];
  const upstream = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push({ path: req.url, method: req.method, contentType: req.headers["content-type"], body });
    const status = Number(new URLSearchParams(body).get("signed_request"));
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ status }));
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const target = `http://127.0.0.1:${upstream.address().port}`;
  const gateway = http.createServer((req, res) => {
    const entry = routes.find((route) => route.source === req.url);
    if (!entry) { res.writeHead(404); res.end(); return; }
    // Only replace the upstream origin: the source/path are the production config.
    const url = new URL(entry.destination);
    proxyRequest(req, res, parse(`${target}${url.pathname}`, true), undefined, undefined, 5000)
      .catch(() => { res.writeHead(500); res.end(); });
  });
  gateway.listen(0, "127.0.0.1");
  await once(gateway, "listening");
  const origin = `http://127.0.0.1:${gateway.address().port}`;
  try {
    for (const entry of routes) {
      for (const status of [200, 403, 409, 413, 415, 422, 503]) {
        const body = `signed_request=${status}`;
        const response = await fetch(`${origin}${entry.source}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, redirect: "manual" });
        assert.equal(response.status, status);
        assert.deepEqual(await response.json(), { status });
        assert.deepEqual(received.at(-1), { path: entry.source, method: "POST", contentType: "application/x-www-form-urlencoded", body });
      }
    }
    assert.equal((await fetch(`${origin}/api/social-oauth/other/deauthorize`, { method: "POST" })).status, 404);
    assert.equal(received.length, 21);
    console.log("PASS: three exact callbacks, 21 Next proxy status/body checks; unknown products are not exposed.");
  } finally {
    gateway.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise((resolve) => gateway.close(resolve)), new Promise((resolve) => upstream.close(resolve))]);
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
