/**
 * A HIDDEN SCROLLBAR STAYS HIDDEN (Arman, 2026-10-07: a scrollbar sat over the
 * composer's quick-action pills — "they actually block you from clicking them
 * buttons. hide it."). The row already asked for no scrollbar; the shell's
 * site-wide thin-scrollbar rule (`.shell-main *`) was unlayered, and unlayered
 * CSS beats every layered utility, so `scrollbar-none` / `[scrollbar-width:none]`
 * lost on every page in the shell.
 *
 * RED before: the rule sat outside any @layer in styles/shell.css.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

it("the shell's default scrollbar rules live in the base layer, where any utility beats them", () => {
  const css = readFileSync(join(__dirname, "../../../styles/shell.css"), "utf8");
  const rule = css.indexOf(".shell-main *::-webkit-scrollbar {");
  expect(rule).toBeGreaterThan(-1);
  const opened = css.lastIndexOf("@layer base {", rule);
  expect(opened).toBeGreaterThan(-1);
  // Nothing closes the layer between its opening and the rule.
  const between = css.slice(opened, rule);
  const depth = (between.match(/\{/g) ?? []).length - (between.match(/\}/g) ?? []).length;
  expect(depth).toBeGreaterThanOrEqual(1);
  // And no unlayered copy of the universal thin rule remains.
  const unlayered = css.replace(/@layer base \{[\s\S]*?\n\}\n/g, "");
  expect(unlayered).not.toMatch(/\.shell-main \*\s*\{\s*scrollbar-width:\s*thin/);
});

/**
 * THE GLOBAL DEFAULT SCROLLBAR LOSES TO THE SHELL'S (Arman, 2026-10-14: "this large
 * horizontal scrollbar … has ruined a lot of uis"). Once the shell's auto-hiding bar moved
 * into the base layer, app/globals.css's universal `* { scrollbar-color: … }` — sitting in
 * the utilities layer — outranked it and painted a grey track under every horizontal
 * scroller. The default must live in the base layer too, where `.shell-main *` beats it.
 *
 * RED before: the universal rule sat inside `@layer utilities` in app/globals.css.
 */
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

it("the global default scrollbar lives in the base layer, below the shell's auto-hiding bar", () => {
  const css = readFileSync(join(__dirname, "../../../app/globals.css"), "utf8");
  const rules = [...css.matchAll(/\n\s*\*\s*\{\s*scrollbar-width:/g)];
  expect(rules.length).toBeGreaterThan(0);
  for (const r of rules) expect(enclosingLayer(css, r.index!)).toBe("base");
});

it("scrollbar-thin stays the auto-hiding bar inside the shell", () => {
  const css = readFileSync(join(__dirname, "../../../styles/shell.css"), "utf8");
  expect(css).toMatch(/\.shell-main \.scrollbar-thin\s*\{\s*scrollbar-color:\s*transparent transparent;/);
});
