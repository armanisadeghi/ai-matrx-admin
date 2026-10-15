/**
 * ONE DEFAULT SCROLLBAR, AND IT LOSES TO EVERYTHING.
 *
 * Arman, 2026-10-07: a scrollbar sat over the composer's quick-action pills — "they
 * actually block you from clicking them buttons. hide it." The shell's thin-scrollbar rule
 * was unlayered, and unlayered CSS beats every layered utility, so `scrollbar-none` lost.
 *
 * Arman, 2026-10-14: "this large horizontal scrollbar … has ruined a lot of uis." The
 * global universal rule sat in the utilities layer, outranked the shell's auto-hiding bar
 * and painted a grey track under every horizontal scroller.
 *
 * Now there is ONE default — app/globals.css, base layer, thin and auto-hiding — used by
 * pages, dialogs and popovers alike. RED before: the universal rule sat in
 * `@layer utilities` with a painted track, and the shell kept its own copy.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globals = readFileSync(join(__dirname, "../../../app/globals.css"), "utf8");
const shell = readFileSync(join(__dirname, "../../../styles/shell.css"), "utf8");

function enclosingLayer(css: string, at: number): string | null {
  let depth = 0;
  for (let i = at; i >= 0; i--) {
    if (css[i] === "}") depth++;
    else if (css[i] === "{") {
      if (depth === 0) {
        const head = css.slice(css.lastIndexOf("\n", i) + 1, i).trim();
        const m = head.match(/^@layer\s+([\w-]+)$/);
        if (m) return m[1];
      } else depth--;
    }
  }
  return null;
}

it("the one default scrollbar lives in the base layer, where any utility beats it", () => {
  const rules = [...globals.matchAll(/\n\s*\*\s*\{\s*scrollbar-width:/g)];
  expect(rules).toHaveLength(1);
  expect(enclosingLayer(globals, rules[0].index!)).toBe("base");
});

it("the default is thin with no painted track at rest", () => {
  expect(globals).toMatch(/\n\s*\*\s*\{\s*scrollbar-width:\s*thin;\s*scrollbar-color:\s*transparent transparent;/);
});

it("the shell keeps no second copy of the default", () => {
  expect(shell).not.toMatch(/^\.shell-main(:hover)?(\s*\*)?[^{\n]*\{\s*scrollbar-(width|color)/m);
});

it("scrollbar-thin asks for a thin bar, never a painted one", () => {
  const at = globals.indexOf(".scrollbar-thin {");
  expect(at).toBeGreaterThan(-1);
  const body = globals.slice(at, globals.indexOf("}", at));
  expect(body).not.toMatch(/scrollbar-color/);
});

it("both stylesheets still close every block they open", () => {
  for (const css of [globals, shell]) {
    let depth = 0;
    for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  }
});
