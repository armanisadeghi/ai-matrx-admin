/**
 * @jest-environment node
 */
// A route page that mounts <EntityCustomFields> inside its OWN scroll container (a plain div, not a
// <main>) must say it is a page scroller (`data-matrx-page-runway` / `data-matrx-page-scroll`), or the
// shell's runway never applies and the last line ends 64px from the screen's end — the dev
// `[page-runway]` scream, seen live on the podcast show page (2026-10-19). Proven to fail on the
// pre-fix shape (RUNWAY_FIXTURE_BAD) and pass on the real pages.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");

/** The pages (file text) that mount the section and own a div scroller; each must carry the marker. */
export function scrollerWithoutRunway(text: string): string | null {
  if (!/<EntityCustomFields\b/.test(text)) return null;
  // The scroller that wraps the mount is the last one opened before it.
  const before = text.slice(0, text.indexOf("<EntityCustomFields"));
  const all = before.match(/<div[^>]*overflow-y-auto[^>]*>/g);
  if (!all) return null;
  const last = all[all.length - 1];
  return /data-matrx-page-(runway|scroll)/.test(last) ? null : last;
}

describe("pages that mount custom fields in their own scroller keep the page runway", () => {
  it("fails on the pre-fix shape", () => {
    const bad = `<div className="h-full w-full overflow-y-auto overscroll-contain bg-textured"><EntityCustomFields entityToken="pc_show" recordId="x" /></div>`;
    expect(scrollerWithoutRunway(bad)).not.toBeNull();
  });
  it("passes on every real route page", () => {
    const files = execSync(`git grep -l "<EntityCustomFields" -- 'app/**/page.tsx'`, { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    expect(files.length).toBeGreaterThan(5);
    const offenders = files
      .map((f) => [f, scrollerWithoutRunway(readFileSync(join(ROOT, f), "utf8"))] as const)
      .filter(([, hit]) => hit !== null);
    expect(offenders).toEqual([]);
  });
});
