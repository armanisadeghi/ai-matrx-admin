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

test("a 429 from dev-login (auth host rate limit) is NOT READY, named as such", () => {
  const v = verdictOf({ status: 429, headers: { "retry-after": "10" }, body: '{"error":"The auth host is RATE-LIMITING this machine"}', finalPath: "/api/dev-login" }, "/notes");
  assert.equal(v.ok, false);
  assert.equal(v.kind, "rate-limited");
});

test("the walk cap's refusal and parking are named as such, not as a page error", () => {
  const h = (v) => ({ "x-matrx-walk-cap": v });
  assert.equal(verdictOf({ status: 503, headers: h("refused"), body: "", finalPath: "/dashboard" }, "/dashboard").kind, "walk-cap");
  assert.equal(verdictOf({ status: 409, headers: h("evicted"), body: "", finalPath: "/dashboard" }, "/dashboard").kind, "parked");
});

test("STALE SERVER: the installed package exports the name — a restart fixes it (the GmailMark case)", async () => {
  const root = mkdtempSync(join(tmpdir(), "preview-ready-judge-"));
  try {
    symlinkSync(join(ROOT, "node_modules"), join(root, "node_modules"));
    mkdirSync(join(root, "components", "icons"), { recursive: true });
    writeFileSync(
      join(root, "components", "icons", "google-brand.tsx"),
      'import {\n  GmailMark as PkgGmail,\n} from "@ai-matrx/chat/utils/connectors/marks";\nexport const m = PkgGmail;\n',
    );
    const d = await diagnoseBuildError(turbopackError("components/icons/google-brand.tsx", "GmailMark"), root);
    assert.equal(d.stale, true, d.lines.join("\n"));
    assert.match(d.lines.join("\n"), /export GmailMark is missing \(imported in components\/icons\/google-brand\.tsx:10\)/);
    assert.match(d.lines.join("\n"), /STALE SERVER/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an export missing from one of OUR modules is CODE even when the file also imports an @ai-matrx package", async () => {
  const root = mkdtempSync(join(tmpdir(), "preview-ready-judge-"));
  try {
    symlinkSync(join(ROOT, "node_modules"), join(root, "node_modules"));
    mkdirSync(join(root, "features"), { recursive: true });
    writeFileSync(
      join(root, "features", "y.tsx"),
      'import { Button } from "@ai-matrx/design-system/controls";\nimport { NotExportedHere } from "@/components/x";\nexport const z = [Button, NotExportedHere];\n',
    );
    const d = await diagnoseBuildError(turbopackError("features/y.tsx", "NotExportedHere"), root);
    assert.equal(d.stale, false, d.lines.join("\n"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a 200 from a public route without a sign-in cookie is NOT READY", () => {
  assert.equal(verdictOf({ status: 200, body: "<html></html>", finalPath: "/dashboard", signedInCookie: false }, "/dashboard").kind, "signed-out");
  assert.equal(verdictOf({ status: 200, body: "<html></html>", finalPath: "/dashboard", signedInCookie: true }, "/dashboard").ok, true);
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

test("STALE SERVER: the server runs an @ai-matrx package version that is no longer installed (module factory not available)", async () => {
  // 2026-10-21: every route answered 500 with "Module [project]/node_modules/.pnpm/@ai-matrx+chat@0.8.300_…/page-leaving.js
  // … but the module factory is not available" after an install moved chat to 0.8.303. Broken for every session, so a
  // restart is due even under other sessions' holds.
  const gone = "@ai-matrx+chat@0.0.1-never-installed_bd16bdfc69c8e56a155d0f75963f39cc";
  const text = `⨯ Error: Module [project]/node_modules/.pnpm/${gone}/node_modules/@ai-matrx/chat/dist/agents/redux/execution-system/utils/page-leaving.js [app-route] (ecmascript) was instantiated because it was required from module [project]/lib/diagnostics/errorCaptureStore.ts [app-route] (ecmascript), but the module factory is not available.`;
  const d = await diagnoseBuildError(text, ROOT);
  assert.equal(d.stale, true, d.lines.join("\n"));
  assert.equal(d.brokenForAll, true, d.lines.join("\n"));
  assert.match(d.lines.join("\n"), /@ai-matrx\/chat 0\.0\.1-never-installed/);
});

test("a module-factory error on a package version that IS installed is not called stale by this rule", async () => {
  const { readdirSync } = await import("node:fs");
  const here = readdirSync(join(ROOT, "node_modules", ".pnpm")).find((n) => n.startsWith("@ai-matrx+chat@"));
  assert.ok(here, "the checkout has @ai-matrx/chat installed");
  const text = `⨯ Error: Module [project]/node_modules/.pnpm/${here}/node_modules/@ai-matrx/chat/dist/x.js [app-route] (ecmascript) was instantiated because it was required from module [project]/lib/y.ts [app-route] (ecmascript), but the module factory is not available.`;
  const d = await diagnoseBuildError(text, ROOT);
  assert.notEqual(d.brokenForAll, true, d.lines.join("\n"));
});
