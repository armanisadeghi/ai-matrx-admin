/**
 * THE ACCENT RE-TINTS THE SHELL'S SELECTION STATES (custom-experience P4, live walk 2026-10-20).
 * The active rail row ("Settings" active) and the selected route kept the built-in blue under a green
 * accent: their colors were literal rgba(59 130 246 / a) / rgb(37 99 235) tokens. The promise:
 *   - every shell custom property whose value is a literal brand blue is re-declared under
 *     `[data-matrx-accent]` (light) AND `.dark [data-matrx-accent]` (dark), derived from --primary /
 *     --primary-ink — a census, so a new blue token that forgets the accent fails here;
 *   - no shell rule paints a literal brand blue directly (it goes through a token the accent re-points);
 *   - without the attribute the literal values stay, so an uncustomized shell is byte-identical.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../../..");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const SHELL = strip(readFileSync(resolve(ROOT, "styles/shell.css"), "utf8"));
const HEADER = strip(readFileSync(resolve(ROOT, "features/shell/components/header/variants/header-variants.css"), "utf8"));

/** The built-in brand blues (Tailwind blue-400/500/600/700) as the shell writes them. */
const BRAND_BLUE = /rgba?\(\s*(?:59,\s*130,\s*246|37,\s*99,\s*235|29,\s*78,\s*216|96,\s*165,\s*250)\b/;

function block(css: string, selector: RegExp): string {
  return selector.exec(css)?.[1] ?? "";
}
const LIGHT = block(SHELL, /\n\[data-matrx-accent\]\s*\{([^}]*)\}/);
const DARK = block(SHELL, /\.dark\[data-matrx-accent\],\s*\.dark \[data-matrx-accent\]\s*\{([^}]*)\}/);

/** Custom properties declared with a literal brand blue anywhere in the shell's CSS. */
function blueTokens(css: string): string[] {
  return [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].filter(([, , v]) => BRAND_BLUE.test(v!)).map(([, n]) => n!);
}

describe("the accent re-tints the shell's selection states", () => {
  it("both accent blocks exist", () => {
    expect(LIGHT).not.toBe("");
    expect(DARK).not.toBe("");
  });

  it("every literal-blue shell token is re-declared from --primary under the accent (census)", () => {
    const names = [...new Set([...blueTokens(SHELL), ...blueTokens(HEADER)])];
    expect(names).toEqual(expect.arrayContaining(["--shell-pill-bg", "--shell-pill-border", "--shell-pill-text", "--shell-nav-selected-text"]));
    const missing: string[] = [];
    for (const name of names) {
      const light = new RegExp(`${name}:\\s*hsl\\(var\\(--primary(?:-ink)?\\)`).test(LIGHT);
      // Dark re-declares every name too (a light-only override would leak the light derivation into dark).
      const dark = new RegExp(`${name}:`).test(DARK);
      if (!light || !dark) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it("no shell rule paints a literal brand blue directly — only token declarations (and their fallbacks) carry it", () => {
    const offenders: string[] = [];
    for (const [file, css] of [["styles/shell.css", SHELL], ["header-variants.css", HEADER]] as const) {
      for (const [, prop, value] of css.matchAll(/(?:^|[;{\s])((?:background|color|border|border-color|background-color|box-shadow|outline-color)[a-z-]*)\s*:\s*([^;]+);/g)) {
        if (BRAND_BLUE.test(value!) && !/^var\(--[a-z0-9-]+,/.test(value!.trim())) offenders.push(`${file}: ${prop}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the built-in values stay literal (an uncustomized shell renders as before)", () => {
    expect(SHELL).toMatch(/--shell-pill-bg:\s*rgba\(59, 130, 246, 0\.12\)/);
    expect(SHELL).toMatch(/--shell-pill-text:\s*rgb\(37, 99, 235\)/);
  });
});
