// node --test scripts/build-lab/next-assets.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { joinedFlightPayload, referencedAssets } from "./next-assets.mjs";

const push = (s) => `<script>self.__next_f.push([1,${JSON.stringify(s)}])</script>`;
const page = (...parts) =>
  `<html><head><script src="/_next/static/chunks/main-abc.js" async=""></script></head><body>` +
  `<script>(self.__next_f=self.__next_f||[]).push([0])</script>${parts.join("")}</body></html>`;

test("a chunk name split across two payload pushes is read whole", () => {
  const html = page(push('1:I["/_next/static/chunks/0gcx9cd'), push('xhob9n.js","x"]\n'));
  const assets = referencedAssets(html);
  assert.ok(assets.includes("/_next/static/chunks/0gcx9cdxhob9n.js"), assets.join("\n"));
  assert.ok(!assets.includes("/_next/static/chunks/0gcx9cd"), "half a name must never be reported");
});

test("markup assets still count; escaped payload strings decode", () => {
  // as Next writes it: a JSON string literal with escaped quotes and slashes
  const html = page('<script>self.__next_f.push([1,"2:HL[\\"\\/_next\\/static\\/css\\/app.css\\",\\"style\\"]"])</script>');
  assert.deepEqual(referencedAssets(html).sort(), ["/_next/static/chunks/main-abc.js", "/_next/static/css/app.css"]);
  assert.equal(joinedFlightPayload(html), '2:HL["/_next/static/css/app.css","style"]');
});

test("the raw-HTML scan this replaced does see the false half name (proves the case is real)", () => {
  const html = page(push('1:I["/_next/static/chunks/0gcx9cd'), push('xhob9n.js"]'));
  const naive = [...html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)].map((m) => m[0]);
  assert.ok(naive.includes("/_next/static/chunks/0gcx9cd"));
});
