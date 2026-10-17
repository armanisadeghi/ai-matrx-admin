/**
 * Meet Matrx content guard: the owner's order (Arman, 2026-10-17), pitches of 3–7 plain words,
 * and every piece linking to a page that really exists in this app (a renamed or moved route
 * fails here before a new person clicks a dead card).
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { MEET_MATRX_GROUPS } from "../meetMatrx";
import { WORKFLOWS_APP_URL } from "@/features/shell/constants/nav-data";

const APP = join(__dirname, "../../../../app");

/** Does `/a/b` resolve to a page.tsx under app/, through any (group) folders? */
function routeExists(path: string): boolean {
  const parts = path.split("/").filter(Boolean);
  const walk = (dir: string, rest: string[]): boolean => {
    if (rest.length === 0) {
      if (existsSync(join(dir, "page.tsx"))) return true;
    }
    const entries = existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith("(") && e.name.endsWith(")") && walk(join(dir, e.name), rest)) return true;
      if (rest.length && e.name === rest[0] && walk(join(dir, e.name), rest.slice(1))) return true;
    }
    return false;
  };
  return walk(APP, parts);
}

const items = MEET_MATRX_GROUPS.flatMap((g) => g.items);

describe("Meet Matrx", () => {
  it("presents the three studios, then the six pieces, in the owner's order", () => {
    expect(MEET_MATRX_GROUPS.map((g) => g.items.map((i) => i.name))).toEqual([
      ["Agent Studio", "Orchestra Studio", "Workflow Studio"],
      ["Mandates", "Applets", "Boards", "Custom data", "Knowledge", "Tools & Connectors"],
    ]);
  });

  it.each(items.map((i) => [i.name, i.pitch] as const))("%s has a 3–7 word pitch", (_name, pitch) => {
    const words = pitch.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
    expect(words.length).toBeGreaterThanOrEqual(3);
    expect(words.length).toBeLessThanOrEqual(7);
  });

  it.each(items.filter((i) => !i.external).map((i) => [i.name, i.href] as const))("%s links to a real page (%s)", (_name, href) => {
    expect(routeExists(href)).toBe(true);
  });

  it("the routine route check can fail: a made-up path is not a page", () => {
    expect(routeExists("/agents/no-such-studio")).toBe(false);
  });

  it("only Workflow Studio leaves the app, to the studio app itself", () => {
    expect(items.filter((i) => i.external).map((i) => [i.name, i.href])).toEqual([["Workflow Studio", WORKFLOWS_APP_URL]]);
  });

  it("every piece wears its own hue", () => {
    expect(new Set(items.map((i) => i.tone)).size).toBe(items.length);
  });
});
