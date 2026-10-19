/**
 * "Nothing should have ever changed for active things": /data/library lands on the data library's
 * task home; the Tools home is its own nav entry (`?view=tools`).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { primaryNavItems } from "@/features/shell/constants/nav-data";

type Node = { id?: string; href?: string; children?: Node[] };
const find = (nodes: readonly Node[], id: string): Node | undefined => {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = find(n.children ?? [], id);
    if (hit) return hit;
  }
  return undefined;
};

describe("the /data/library landing", () => {
  it("the Data Library nav entry opens the bare route and Tools has its own address", () => {
    expect(find(primaryNavItems as Node[], "data.library")?.href).toBe("/data/library");
    expect(find(primaryNavItems as Node[], "data.tools")?.href).toBe("/data/library?view=tools");
  });

  it("the page shows the Tools home only when asked for with view=tools", () => {
    const src = readFileSync(join(__dirname, "../DataLibraryPage.tsx"), "utf8");
    expect(src).toContain('const dataMode = params.get("view") !== "tools"');
  });
});
