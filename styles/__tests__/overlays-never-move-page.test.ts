/**
 * THE LAW THIS GUARDS (Arman, 2026-10-20): floating things — pills, assists, badges, alarms,
 * notices, toasts, the chat dock — NEVER move the page. When one would cover something, it moves
 * itself (lifts, rests above the bar, yields); the page keeps its size and place.
 *
 * Until 2026-10-20 the opposite was built, ten-plus times: chrome measured itself and published
 * the number (`--shell-fixed-corner-clearance`, `--shell-fixed-alert-clearance`, the fixed floating
 * measure), and pages padded or shrank themselves by it — so the Agent Studio composer jumped up
 * whenever the admin "1 error" badge appeared. This runs the static guard over the whole tree
 * (red on that tree, green after) and proves the guard itself fails on the broken shapes.
 */
import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..", "..");
const GUARD = join(ROOT, "scripts", "check-overlays-never-move-page.mjs");

function run(...args: string[]): string {
  return execFileSync("node", [GUARD, ...args], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

describe("floating things never move the page", () => {
  it("the guard fails on every broken shape and passes on the fixed ones", () => {
    expect(run("--self-test")).toContain("self-test: OK");
  });

  it("no page in the tree sizes itself by floating chrome", () => {
    // --strict exits 1 (and execFileSync throws, printing every finding) on any finding.
    expect(run("--strict")).toContain("no floating chrome moves the page");
  });

  it("the error badge rises off what it covers instead of publishing its size", () => {
    const dir = join(ROOT, "features", "admin", "error-inspector");
    expect(existsSync(join(dir, "useFixedCornerClearance.ts"))).toBe(false);
    const badge = readFileSync(join(dir, "ErrorInspectorBadge.tsx"), "utf8");
    expect(badge).toContain("useFloatingLift");
    // BOTH shapes the badge takes (the pill and the dot) carry the lift.
    expect(badge.match(/ref=\{liftRef\}/g) ?? []).toHaveLength(2);
    expect(badge.match(/var\(--error-badge-lift,0px\)/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
  });
});
