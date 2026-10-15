// scripts/preview-ready.test.mjs — the verdicts of `pnpm preview:ready` (scripts/lib/preview-ready-judge.mjs).
//
// The preflight is only worth running if READY is never a lie and NOT READY says the right cause.
// The 2026-10-15 case this pins: every page showed `Export GmailMark doesn't exist in target module`
// while the installed @ai-matrx/chat DID export it — a stale server, fixed by a restart — and one
// agent blamed another session's import instead. The judge must tell that from a real import that
// is ahead of the installed package.
//
//   node --test scripts/preview-ready.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diagnoseBuildError, verdictOf } from "./lib/preview-ready-judge.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const turbopackError = (file, name) =>
  `<html id="__next_error__"><body>Build Error\n./${file}:10:3\nExport ${name} doesn't exist in target module\n  8 | import {\n</body></html>`;

test("a 200 on the route itself is READY", () => {
  assert.deepEqual(verdictOf({ status: 200, body: "<html><div id=app></div></html>", finalPath: "/dashboard" }, "/dashboard"), { ok: true });
});

test("ending on /login is NOT READY — the sign-in did not stick", () => {
  const v = verdictOf({ status: 200, body: "<html>sign in</html>", finalPath: "/login?redirect=%2Fdashboard" }, "/dashboard");
  assert.equal(v.ok, false);
  assert.equal(v.kind, "signed-out");
});

test("a 500, an error page or a build error in the body is NOT READY even with status 200", () => {
  assert.equal(verdictOf({ status: 500, body: "x", finalPath: "/dashboard" }, "/dashboard").kind, "page-error");
  assert.equal(verdictOf({ status: 200, body: turbopackError("a.tsx", "X"), finalPath: "/dashboard" }, "/dashboard").kind, "page-error");
  assert.equal(verdictOf({ status: 0, error: "timeout", finalPath: "/dashboard" }, "/dashboard").kind, "timeout");
});

test("the walk cap's refusal and parking are named as such, not as a page error", () => {
  const h = (v) => ({ "x-matrx-walk-cap": v });
  assert.equal(verdictOf({ status: 503, headers: h("refused"), body: "", finalPath: "/dashboard" }, "/dashboard").kind, "walk-cap");
  assert.equal(verdictOf({ status: 409, headers: h("evicted"), body: "", finalPath: "/dashboard" }, "/dashboard").kind, "parked");
});

test("STALE SERVER: the installed package exports the name — a restart fixes it (the GmailMark case)", async () => {
  const d = await diagnoseBuildError(turbopackError("components/icons/google-brand.tsx", "GmailMark"), ROOT);
  assert.equal(d.stale, true, d.lines.join("\n"));
  assert.match(d.lines.join("\n"), /export GmailMark is missing \(imported in components\/icons\/google-brand\.tsx:10\)/);
  assert.match(d.lines.join("\n"), /STALE SERVER/);
});

test("CODE: an import ahead of the installed package is named with its owner, never restarted", async () => {
  // A throwaway checkout that sees the real node_modules, holding a file that imports a name
  // @ai-matrx/chat has never shipped.
  const root = mkdtempSync(join(tmpdir(), "preview-ready-judge-"));
  try {
    symlinkSync(join(ROOT, "node_modules"), join(root, "node_modules"));
    mkdirSync(join(root, "features"), { recursive: true });
    writeFileSync(join(root, "features", "x.tsx"), 'import { NoSuchMarkEverShipped } from "@ai-matrx/chat/utils/connectors/marks";\nexport const y = NoSuchMarkEverShipped;\n');
    const d = await diagnoseBuildError(turbopackError("features/x.tsx", "NoSuchMarkEverShipped"), root);
    assert.equal(d.stale, false, d.lines.join("\n"));
    assert.match(d.lines.join("\n"), /diagnosis: CODE/);
    assert.match(d.lines.join("\n"), /environment block for your test, not a defect of the page/);
    assert.equal(d.uncommitted, false, "a file git does not track as modified is not an edit in progress");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
