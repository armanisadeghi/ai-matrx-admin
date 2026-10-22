import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { shadeForBrightness } from "../logo-shade";

// 2026-10-22: Smart Add validate drew a white logo raw on its white card (a blank card) while the logo choices
// and the found screen gave the same logo a dark tile. A logo is drawn through ShadedLogo, never a bare <img>.
// Every bare <img> left in Smart Add is named here with why it is not a logo on a plain card; a new one fails
// until it either uses ShadedLogo or is added with its reason.
const ROOT = join(__dirname, "..");

const BARE_IMAGES: Record<string, { count: number; why: string }> = {
  "ShadedLogo.tsx": { count: 1, why: "the one logo door itself" },
  "SmartAddSlots.tsx": { count: 1, why: "logo choice tile: its own shade tile (light/dark/checker) from logo-shade" },
  "logoGroups.tsx": { count: 1, why: "a source's picture inside that shaded logo-choice tile" },
  "SmartAddExtras.tsx": { count: 3, why: "brand card picture on its own read shade + brightness probes + a homepage screenshot" },
  "SmartAddHero.tsx": { count: 1, why: "a hidden site-icon probe (size-px, opacity-0)" },
  "validate/ValidateStage.tsx": { count: 1, why: "account avatars and site favicons, not logos" },
  "found/FoundStage.tsx": { count: 1, why: "an account's photo (object-cover)" },
  "found/PersonFoundStage.tsx": { count: 1, why: "a person's photo" },
  "welcome/PersonPickCards.tsx": { count: 1, why: "a person's photo" },
};

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "__tests__") return [];
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("one logo door", () => {
  it("no Smart Add file draws an image outside ShadedLogo beyond the named census", () => {
    const found = Object.fromEntries(
      tsxFiles(ROOT)
        .map((file) => [relative(ROOT, file), (readFileSync(file, "utf8").match(/<img\b/g) ?? []).length] as const)
        .filter(([, n]) => n > 0),
    );
    const allowed = Object.fromEntries(Object.entries(BARE_IMAGES).map(([file, v]) => [file, v.count]));
    expect(found).toEqual(allowed);
  });

  it("a white or fully transparent logo gets the dark backdrop", () => {
    expect(shadeForBrightness(0.95)).toBe("dark");
    expect(shadeForBrightness(-1)).toBe("dark");
    expect(shadeForBrightness(0.05)).toBe("light");
  });
});
