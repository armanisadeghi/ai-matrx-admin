/**
 * A full-bleed share lens (the shared-file viewer) sizes itself to its
 * container. The public layout is min-h-dvh + document scroll, where `h-full`
 * is content height — so without the viewport marker + its CSS the PDF stage
 * collapsed to 0px and every shared PDF rendered blank until Full screen
 * (found 2026-10-20).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("a shared viewer has a definite height", () => {
  it("the full-bleed branch carries the viewport marker", () => {
    const shell = read("app/(public)/s/[token]/SharedResourceView.tsx");
    const branch = shell.slice(shell.indexOf("{fullBleed ?"));
    expect(branch.slice(0, branch.indexOf(") : ("))).toContain(
      "data-public-viewport-surface",
    );
  });

  it("the marker pins the public layout to the viewport", () => {
    const css = read("app/globals.css").replace(/\s+/g, " ");
    expect(css).toMatch(
      /\[data-public-layout\]:has\(\[data-public-viewport-surface\]\) \{ height: 100dvh;/,
    );
    expect(css).toContain(
      "[data-public-layout]:has([data-public-viewport-surface]) > [data-public-main] { overflow: hidden;",
    );
  });
});
