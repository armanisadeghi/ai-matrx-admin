import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const revision = process.env.STUDY_KIT_TOUCH_TARGET_REF;

function readSource(relativePath: string): string {
  if (revision) {
    return execFileSync("git", ["show", `${revision}:${relativePath}`], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
  }

  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("study-kit phone touch targets", () => {
  // The kit card's format and "add" doors moved onto THE chip (95a54355ec, 2026-10-05): a 24px
  // design-system Chip whose link/button form carries a 44px invisible hit area on coarse pointers,
  // so the 44px floor lives in the package, not in call-site classes. Break: a door that is neither
  // a Chip-skinned link nor 44px tall itself, or a package that drops the chip's touch ring.
  it("keeps every focused kit-overview door at 44px before the desktop breakpoint", () => {
    const source = readSource("features/education/home/blocks/KitsBlock.tsx");
    const links = [...source.matchAll(/<Link\b[^>]*>/g)];
    expect(links.length).toBeGreaterThanOrEqual(4);
    for (const link of links) {
      const tag = link[0];
      const before = source.slice(Math.max(0, (link.index ?? 0) - 400), link.index);
      const chipSkinned =
        !/className=/.test(tag) && /<Chip\b(?:(?!<\/Chip>)[\s\S])*\basChild\b(?:(?!<\/Chip>)[\s\S])*$/.test(before);
      const ownFloor = /className="[^"]*\bmin-h-(?:11|12|14|16)\b/.test(tag);
      expect({ tag, door44: chipSkinned || ownFloor }).toEqual({ tag, door44: true });
    }

    const css = readFileSync(
      join(process.cwd(), "node_modules/@ai-matrx/design-system/dist/controls.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/--matrx-control-touch:\s*2\.75rem/);
    const coarse = /@media \(pointer: coarse\)\s*\{\s*:is\(a, button\)\.matrx-control-chip::after\s*\{([^}]*)\}/.exec(css);
    expect(coarse?.[1]).toMatch(/height:\s*(?:max\(100%,\s*)?var\(--matrx-control-touch\)/);
  });

  it("keeps the kit hub doors at 44px on phones without widening desktop controls", () => {
    const hub = readSource("features/education/kits/components/KitHub.tsx");
    const makeMore = readSource(
      "features/education/kits/components/MakeMoreFromKit.tsx",
    );

    expect(hub).toContain('className="min-h-11 gap-1.5 sm:min-h-10"');
    // The phone floor is the component's default button class (a host may pass its own).
    expect(makeMore).toContain('buttonClassName = "min-h-11 gap-1.5 sm:min-h-0"');
  });
});
