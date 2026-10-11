// The build-cache switch: on only on Vercel, only for BUILD_CACHE_PROFILES, never for [no-cache].
import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
const { buildCacheDecision, BUILD_CACHE_PROFILES } = createRequire(import.meta.url)("./build-cache-policy.cjs");
const on = [...BUILD_CACHE_PROFILES][0];

test("on for a listed profile on Vercel", () => assert.equal(buildCacheDecision({ VERCEL: "1", MATRX_PROFILE: on }).on, true));
test("off for an unlisted profile", () => assert.equal(buildCacheDecision({ VERCEL: "1", MATRX_PROFILE: "not-a-profile" }).on, false));
test("off off Vercel (local builds and dev never touch it)", () => assert.equal(buildCacheDecision({ MATRX_PROFILE: on }).on, false));
test("[no-cache] turns one build off", () =>
  assert.equal(buildCacheDecision({ VERCEL: "1", MATRX_PROFILE: on, VERCEL_GIT_COMMIT_MESSAGE: "release: x [no-cache]" }).on, false));
test("[cold-build] keeps it on but cold", () => {
  const d = buildCacheDecision({ VERCEL: "1", MATRX_PROFILE: on, VERCEL_GIT_COMMIT_MESSAGE: "release: x [cold-build]" });
  assert.equal(d.on, true);
  assert.equal(d.cold, true);
});
