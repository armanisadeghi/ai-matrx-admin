/**
 * AN INDUSTRY'S TRAIL NAMES THE INDUSTRY (2026-10-22). The menu's Industries row is a GROUP: its own
 * address is its first module's (/education) and each industry under it is a module with its own menu.
 * The derived trail took the group for the module, so /legal read only "Industries" (as did /medical,
 * /commerce/…, /capture and, by address, /education). The industry is the crumb; its door lists the
 * other industries. A module with sub-menus (Memory › Research) keeps its own name.
 *
 * RED before: every case below read "Industries" for the first crumb.
 */
import { describe, expect, it } from "@jest/globals";
import { adminNavItems, primaryNavItems } from "@/features/shell/constants/nav-data";
import { deriveTrail, type TrailNavNode } from "../derive-trail";

const NAV = [...primaryNavItems, ...adminNavItems] as unknown as TrailNavNode[];
const first = (pathname: string) => deriveTrail({ pathname, nav: NAV, isPageless: () => false })[0]!;
const labels = (pathname: string) => deriveTrail({ pathname, nav: NAV, isPageless: () => false }).map((c) => c.label);

describe("an industry's trail names the industry", () => {
  it.each([
    ["/legal", "Legal"],
    ["/education", "Education"],
    ["/medical", "Medical"],
    ["/commerce", "Commerce"],
  ])("%s → %s, its door lists the other industries", (path, industry) => {
    const crumb = first(path);
    expect(crumb.label).toBe(industry);
    expect(crumb.optionsLabel).toBe("Industries");
    expect(crumb.options?.map((o) => o.label)).toEqual(expect.arrayContaining(["Education", "Legal", "Commerce", "Medical"]));
    expect(crumb.options?.find((o) => o.active)?.label).toBe(industry);
  });

  it("a deeper industry page keeps the industry as its first crumb", () => {
    expect(labels("/legal/ca-wc")).toEqual(["Legal", "CA Workers' Comp"]);
    expect(first("/legal/ca-wc").href).toBe("/legal");
  });

  it("a module with its own sub-menus keeps its name (Memory, not its Research sub-menu)", () => {
    expect(first("/research").label).toBe("Memory");
    expect(first("/memory").label).toBe("Memory");
  });
});
