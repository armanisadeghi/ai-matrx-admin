/**
 * Meet Matrx content guard: the owner's order (Arman, 2026-10-17), pitches of 3–7 plain words,
 * and every piece linking to a page that really exists in this app (a renamed or moved route
 * fails here before a new person clicks a dead card).
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { ALL_IDENTITIES } from "@ai-matrx/icons/domain";
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
      ["Knowledge", "Mandates", "Applets", "Boards", "Custom data", "Tools & Connectors"],
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

  it("Knowledge is the one hero card, and shows its real breadth ending at who draws on it", () => {
    const featured = items.filter((i) => i.featured);
    expect(featured.map((i) => i.name)).toEqual(["Knowledge"]);
    expect(featured[0].flow).toEqual(["Notes", "Documents", "Chats", "Web pages", "Workbooks", "Research", "Tasks", "People"]);
    expect(featured[0].flowTo).toBe("Every agent");
  });

  it("the routine route check can fail: a made-up path is not a page", () => {
    expect(routeExists("/agents/no-such-studio")).toBe(false);
  });

  it("only Workflow Studio leaves the app, to the studio app itself", () => {
    expect(items.filter((i) => i.external).map((i) => [i.name, i.href])).toEqual([["Workflow Studio", WORKFLOWS_APP_URL]]);
  });

  it("every piece wears an official identity, each its own", () => {
    const owned = new Set<unknown>(ALL_IDENTITIES);
    expect(items.filter((i) => !owned.has(i.identity)).map((i) => i.name)).toEqual([]);
    expect(new Set(items.map((i) => i.identity)).size).toBe(items.length);
  });
});
