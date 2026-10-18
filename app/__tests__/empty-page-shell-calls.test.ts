/**
 * The app shell's own calls on an EMPTY signed-in page (owner rules, Arman 2026-10-18: nothing until
 * engaged; realtime is never part of first paint; small late reads fold into one lazy function).
 * Measured by scripts/speed-test-census.mjs on /speed-test; results in docs/perf/speed-test-census.md.
 * Each test fails if the boot-time call it guards comes back.
 *
 * SHELL_CALLS_ROOT points the reads at another tree (used to prove these fail on the old tree).
 */
import { existsSync, readFileSync } from "fs";
import { execFileSync } from "child_process";
import { join } from "path";

const root = process.env.SHELL_CALLS_ROOT || join(__dirname, "../..");
const code = (p: string) =>
  readFileSync(join(root, p), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

test("the preferences live channel joins only after the page settles (no socket at boot)", () => {
  const live = code("lib/redux/preferences/PreferencesLiveSync.tsx");
  expect(live).toMatch(/const settled = useLateIdleReady\(\);/);
  expect(live).toMatch(/useChannel\(\s*userId && settled\s*\?/);
});

test("the dev surface-row guard never mounts in production, waits for late idle, and fetches no JWKS", () => {
  const core = code("app/DeferredSingletonCore.tsx");
  expect(core).toMatch(/process\.env\.NODE_ENV !== "production" && <SurfaceRowGuard \/>/);
  const guard = code("features/surfaces/dev/surface-row-guard.ts");
  expect(guard).toMatch(/if \(process\.env\.NODE_ENV === "production"\) return \(\) => \{\};/);
  expect(guard).toMatch(/whenLateIdle\(undefined, controller\.signal\)/);
  // The raw getClaimsUser(supabase) fetched /.well-known/jwks.json; the cached read uses the pinned keys.
  expect(guard).toMatch(/getClientClaimsUserCached\(\)/);
  expect(guard).not.toMatch(/from "@ai-matrx\/auth"/);
});

test("the browser timezone is written only by PersonTimeZoneCapture, never through a Next route", () => {
  expect(existsSync(join(root, "app/api/person/timezone/route.ts"))).toBe(false);
  const watcher = code("components/layout/AuthSessionWatcher.tsx");
  expect(watcher).not.toMatch(/\/api\/person\/timezone/);
  expect(code("features/sms/hooks/useSmsEnrollment.ts")).not.toMatch(/\/api\/person\/timezone/);
  const capture = code("components/layout/PersonTimeZoneCapture.tsx");
  expect(capture).toMatch(/setPreference\(\{ module: "display", preference: "timeZone", value: next \}\)/);
});

test("no shipped source posts to /api/person/timezone", () => {
  if (process.env.SHELL_CALLS_ROOT) return; // git grep reads this checkout only
  let hits = "";
  try {
    hits = execFileSync("git", ["grep", "-l", "/api/person/timezone", "--", "*.ts", "*.tsx"], {
      cwd: root,
      encoding: "utf8",
    });
  } catch {
    hits = ""; // git grep exits 1 when nothing matches
  }
  expect(hits.split("\n").filter((f) => f && !f.endsWith("empty-page-shell-calls.test.ts"))).toEqual([]);
});
