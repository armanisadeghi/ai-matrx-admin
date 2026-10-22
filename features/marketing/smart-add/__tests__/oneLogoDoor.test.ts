import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { shadeForBrightness } from "../logo-shade";

// 2026-10-22: Smart Add validate drew a white logo raw on its white card (a blank card) while the logo choices
// and the found screen gave the same logo a dark tile. A logo is drawn through ShadedLogo, never a bare <img>.
const ROOT = join(__dirname, "..");

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "__tests__") return [];
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("one logo door", () => {
  it("no Smart Add file draws a logo with a bare <img>", () => {
    const offenders = tsxFiles(ROOT).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/<img\b[^>]*\bsrc=\{[^}]*\blogo/gi)].map((m) => `${file}: ${m[0]}`),
    );
    expect(offenders).toEqual([]);
  });

  it("a white or fully transparent logo gets the dark backdrop", () => {
    expect(shadeForBrightness(0.95)).toBe("dark");
    expect(shadeForBrightness(-1)).toBe("dark");
    expect(shadeForBrightness(0.05)).toBe("light");
  });
});
