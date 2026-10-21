// The Error Inspector badge must start where the PAGE starts, never inside the shell's chat dock
// (it covered the chat Reply box on /start). Before: fixed `left-4` over the dock.
import { readFileSync } from "fs";
import { join } from "path";
import { shellMainLeft } from "../useShellMainLeft";

function shellWith(left: number) {
  document.body.innerHTML = '<main class="shell-main"></main>';
  const main = document.querySelector(".shell-main") as HTMLElement;
  main.getBoundingClientRect = () => ({ left, top: 0, right: 1440, bottom: 900, width: 1440 - left, height: 900, x: left, y: 0, toJSON() {} }) as DOMRect;
}

it("starts after the sidebar and the open chat dock", () => {
  shellWith(484); // 44px sidebar + 440px chat dock, as measured live on /start
  expect(shellMainLeft()).toBe(496);
});

it("keeps the default when there is no shell column (chat closed on a page without a dock gap)", () => {
  document.body.innerHTML = "";
  expect(shellMainLeft()).toBeNull();
  shellWith(0);
  expect(shellMainLeft()).toBeNull();
});

it("both badge shapes take their left from the measured start of the page, never a bare left-4", () => {
  const badge = readFileSync(join(__dirname, "..", "ErrorInspectorBadge.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  expect(badge).toContain("useShellMainLeft");
  expect(badge.match(/style=\{placeStyle\}/g) ?? []).toHaveLength(2);
  expect(badge).not.toMatch(/sm:left-4/);
  expect(badge.match(/sm:left-\[var\(--error-badge-left,1rem\)\]/g) ?? []).toHaveLength(2);
});

it("on a phone both badge shapes rest in the left gutter and never cover content (review 5, G8)", () => {
  const badge = readFileSync(join(__dirname, "..", "ErrorInspectorBadge.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // Not a pill at left-3 over the text: flush left, a few px wide, only below the sm breakpoint.
  expect(badge).not.toMatch(/ left-3 /);
  expect(badge.match(/ left-0 /g) ?? []).toHaveLength(2);
  expect(badge).toContain("max-sm:w-3.5");
  expect(badge).toContain("max-sm:w-3 ");
});
