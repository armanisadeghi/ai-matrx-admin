// scripts/__tests__/surface-emitters.test.ts
//
// `pnpm surface:census` hung with no output on 2026-10-22 because it ran one full-tree
// `git grep` per scope builder (244 × ~7 s). These cases pin the class: the lookup costs ONE
// git process however many builders there are, it still finds the right files, and a git
// failure or timeout is an error with a reason — never a silent "nothing emits this".
//
// Real git over a throwaway fixture repository; no file in this checkout is read or touched.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { builderCallSites, builderSitesInFiles } from "../lib/surface-emitters";

let repo: string;
const BUILDERS = Array.from({ length: 40 }, (_, i) => `createFixture${i}Scope`);

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "surface-emitters-"));
  const git = (...args: string[]) => execFileSync("git", args, { cwd: repo, stdio: "ignore" });
  git("init", "-q");
  mkdirSync(join(repo, "features/surfaces/manifests"), { recursive: true });
  mkdirSync(join(repo, "app"), { recursive: true });
  writeFileSync(
    join(repo, "features/surfaces/manifests/fixture.manifest.ts"),
    BUILDERS.map((b) => `export function ${b}() { return {}; }`).join("\n"),
  );
  writeFileSync(join(repo, "app/a.tsx"), `import { createFixture0Scope, createFixture7Scope } from "x";\ncreateFixture0Scope(); createFixture0Scope();\n`);
  writeFileSync(join(repo, "app/b.ts"), `createFixture7Scope();\n// createFixture1ScopeLonger is a different identifier\n`);
  writeFileSync(join(repo, "app/b.test.ts"), `createFixture1Scope();\n`);
  git("add", "-A");
});

afterAll(() => rmSync(repo, { recursive: true, force: true }));

const PATHSPECS = [":!features/surfaces/manifests/*.manifest.ts"];

function counting() {
  let calls = 0;
  const exec = ((...args: Parameters<typeof execFileSync>) => {
    calls++;
    return execFileSync(...args);
  }) as typeof execFileSync;
  return { exec, calls: () => calls };
}

test("one git process answers every builder (cost does not grow with surfaces)", () => {
  const c = counting();
  builderCallSites(BUILDERS, { cwd: repo, pathspecs: PATHSPECS, exec: c.exec });
  expect(c.calls()).toBe(1);
});

test("finds each builder's call sites, whole-word, tests and manifests excluded", () => {
  const sites = builderCallSites(BUILDERS, { cwd: repo, pathspecs: PATHSPECS });
  expect(sites.get("createFixture0Scope")).toEqual(["app/a.tsx"]);
  expect([...(sites.get("createFixture7Scope") ?? [])].sort()).toEqual(["app/a.tsx", "app/b.ts"]);
  expect(sites.get("createFixture1Scope")).toEqual([]);
  expect(sites.get("createFixture2Scope")).toEqual([]);
});

test("a git failure other than 'no match' throws with its reason", () => {
  const notRepo = mkdtempSync(join(tmpdir(), "surface-emitters-norepo-"));
  try {
    expect(() => builderCallSites(["createFixture0Scope"], { cwd: notRepo })).toThrow(/git grep failed/);
  } finally {
    rmSync(notRepo, { recursive: true, force: true });
  }
});

test("a git call past its ceiling throws a named timeout instead of hanging", () => {
  const slow = ((_cmd: string, _args: readonly string[], opts: { timeout?: number }) =>
    execFileSync("sleep", ["5"], { timeout: opts.timeout })) as unknown as typeof execFileSync;
  expect(() => builderCallSites(["createFixture0Scope"], { cwd: repo, exec: slow, timeoutMs: 200 })).toThrow(
    /exceeded 200 ms/,
  );
});

test("package files are scanned once and matched whole-word", () => {
  const files = [
    { file: "dist/a.js", text: "createFixture3Scope(); createFixture3Scope();" },
    { file: "dist/b.js", text: "createFixture3ScopeX(); xcreateFixture4Scope();" },
  ];
  const sites = builderSitesInFiles(BUILDERS, files);
  expect(sites.get("createFixture3Scope")).toEqual(["dist/a.js"]);
  expect(sites.get("createFixture4Scope")).toEqual([]);
});
