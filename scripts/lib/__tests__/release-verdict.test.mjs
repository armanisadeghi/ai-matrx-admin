// Post-build checks fail locally (write time) and scream-but-pass on Vercel / CI / the release path.
// Each check is run for real against a planted failing build output.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { failOrScream, isReleaseRun } from "../release-verdict.mjs";

const SCRIPTS = process.env.RELEASE_VERDICT_SCRIPTS_DIR || resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function plantedDist(kind) {
  const root = mkdtempSync(join(tmpdir(), "release-verdict-"));
  const dist = join(root, ".next");
  if (kind === "identities") {
    mkdirSync(join(dist, "server", "chunks"), { recursive: true });
    writeFileSync(join(dist, "server", "chunks", "app_0abcdef.js"), "");
  } else if (kind === "bindings") {
    mkdirSync(join(dist, "static"), { recursive: true }); // no client chunks: the check throws
  } else if (kind === "bindings-leak") {
    // The v0.4.3449 live shape: a chunk that compiled, with one raw binding in an export getter.
    mkdirSync(join(dist, "static", "chunks"), { recursive: true });
    writeFileSync(
      join(dist, "static", "chunks", "17p76-6melrad.js"),
      'e.s(["VisualElement",()=>__TURBOPACK__imported__module__60386__.F,"wrap",()=>et.f],7583957)',
    );
  } else {
    mkdirSync(join(root, "migrations"), { recursive: true });
    mkdirSync(join(dist, "server", "app"), { recursive: true });
    writeFileSync(join(dist, "server", "app", "page.js.nft.json"), JSON.stringify({ files: ["../../../migrations/a.sql"] }));
  }
  return dist;
}

const CHECKS = [
  ["check-turbopack-chunk-identities.mjs", "identities"],
  ["check-turbopack-unbound-bindings.mjs", "bindings"],
  ["check-turbopack-unbound-bindings.mjs", "bindings-leak"],
  ["check-server-trace-scope.mjs", "trace"],
];
const CLEAN = { ...process.env, VERCEL: "", CI: "", MATRX_RELEASE_PATH: "" };

for (const [script, kind] of CHECKS) {
  const run = (extra) =>
    spawnSync(process.execPath, [join(SCRIPTS, script)], { env: { ...CLEAN, NEXT_DISTDIR: plantedDist(kind), ...extra }, encoding: "utf8" });
  test(`${script} fails locally on a planted ${kind} failure`, () => {
    assert.equal(run({}).status, 1);
  });
  for (const extra of [{ VERCEL: "1" }, { CI: "true" }, { MATRX_RELEASE_PATH: "1" }]) {
    test(`${script} (${kind}) screams and exits 0 with ${Object.keys(extra)[0]}`, () => {
      const r = run(extra);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stderr, /RELEASE WARNING/);
    });
  }
}

test("isReleaseRun reads VERCEL, CI and MATRX_RELEASE_PATH; empty/0/false are off", () => {
  assert.equal(isReleaseRun({}), false);
  assert.equal(isReleaseRun({ CI: "false", VERCEL: "0", MATRX_RELEASE_PATH: "" }), false);
  assert.equal(isReleaseRun({ VERCEL: "1" }), true);
  assert.equal(isReleaseRun({ CI: "true" }), true);
  assert.equal(isReleaseRun({ MATRX_RELEASE_PATH: "1" }), true);
});

test("failOrScream: 1 locally, 0 plus a banner on a release run", () => {
  const lines = [];
  assert.equal(failOrScream("x", "m", { env: {}, log: (l) => lines.push(l) }), 1);
  assert.equal(lines.length, 0);
  assert.equal(failOrScream("x", "boom", { env: { VERCEL: "1" }, log: (l) => lines.push(l) }), 0);
  assert.match(lines[0], /RELEASE WARNING — x FAILED[\s\S]*boom/);
});
