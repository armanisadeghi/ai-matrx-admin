// Every Space template's public address is readable, unique and its own (ADVERSARIAL-2 #10): run over the real
// library, plus the cases the check must catch (it fails on the library as it was: spaces-sp0150, and Creator
// Content Planner at spaces-content-calendar).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { packSlugFor, slugFindings, type SlugPack } from "../template-slug";

const DIR = join(__dirname, "../../../features/spaces/templates/packs");
const LIBRARY: SlugPack[] = readdirSync(DIR)
  .filter((f) => f.endsWith(".pack.json"))
  .flatMap((file) => {
    try {
      return [{ file, ...(JSON.parse(readFileSync(join(DIR, file), "utf8")) as Omit<SlugPack, "file">) }];
    } catch {
      return [];
    }
  });

describe("Space template slugs", () => {
  it("the library has no slug finding", () => {
    expect(slugFindings(LIBRARY)).toEqual([]);
  });

  it("a title makes its slug", () => {
    expect(packSlugFor("Projects, Tasks & Sprints")).toBe("spaces-projects-tasks-and-sprints");
    expect(packSlugFor("1:1 Meeting Notes")).toBe("spaces-1-1-meeting-notes");
  });

  it("catches a catalog-id slug, another template's name, a duplicate and a slug unrelated to its title", () => {
    const found = slugFindings([
      { title: "Sales CRM", spec: { id: "spaces-sp0150" } },
      { title: "Content Calendar", spec: { id: "spaces-content-calendar" } },
      { title: "Creator Content Planner", spec: { id: "spaces-content-calendar" } },
      { title: "Personal To-Do List", spec: { id: "spaces-errand-manager" } },
      { title: "Lead Tracker", formerSlugs: ["spaces-sp0150"], spec: { id: "spaces-lead-tracker" } },
    ]);
    expect(found.join("\n")).toMatch(/spaces-sp0150" is the catalog id/);
    expect(found.join("\n")).toMatch(/Creator Content Planner: spec.id "spaces-content-calendar" is another template's name/);
    expect(found.join("\n")).toMatch(/shares no word with the title "Personal To-Do List"/);
    expect(found.join("\n")).toMatch(/Lead Tracker: slug "spaces-sp0150" is also Sales CRM's/);
  });

  it("the changed slugs keep their old address as a former slug", () => {
    const sales = LIBRARY.find((p) => p.file === "sales-crm.pack.json");
    expect(sales?.spec.id).toBe("spaces-sales-crm");
    expect(sales?.formerSlugs).toEqual(["spaces-sp0150"]);
  });
});
