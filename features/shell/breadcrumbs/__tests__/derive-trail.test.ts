import { describe, expect, it } from "@jest/globals";
import { deriveTrail, type TrailNavNode } from "../derive-trail";

const NAV: TrailNavNode[] = [
  {
    label: "Agents",
    href: "/agents/all",
    children: [
      { label: "All Agents", href: "/agents/all" },
      { label: "Templates", href: "/agents/templates" },
      { label: "New Agent", href: "/agents/new", actionItem: true },
    ],
  },
  { label: "Notes", href: "/notes" },
];
const ID = "11111111-2222-4333-8444-555555555555";

describe("deriveTrail", () => {
  it("derives module and page from the menu, with menu siblings", () => {
    const t = deriveTrail({ pathname: "/agents/all", nav: NAV });
    expect(t.map((c) => c.label)).toEqual(["Agents", "All Agents"]);
    expect(t[0]!.options?.map((o) => o.label)).toEqual(["Agents", "Notes"]);
    expect(t[1]!.options?.map((o) => o.label)).toEqual(["All Agents", "Templates"]);
    expect(t[1]!.href).toBeUndefined();
  });
  it("shows a nameless uuid through the id component, with the list's kind", () => {
    const t = deriveTrail({ pathname: `/agents/${ID}/build`, nav: NAV });
    expect(t[1]!.recordId?.value).toBe(ID);
    expect(t[1]!.label).toBe("Agent");
    expect(t[2]!.label).toBe("Build");
  });
  it("uses a declared record name and its siblings", () => {
    const t = deriveTrail({
      pathname: `/agents/${ID}`,
      nav: NAV,
      records: { [`/agents/${ID}`]: { label: "QME Report", options: [{ label: "x", href: "/x" }] } },
    });
    expect(t[1]!.label).toBe("QME Report");
    expect(t[1]!.recordId).toBeUndefined();
    expect(t[1]!.options).toHaveLength(1);
  });
  it("honours overrides and hides null levels", () => {
    const t = deriveTrail({ pathname: "/notes/archive-2020", nav: NAV, overrides: { "/notes/:x": "Old notes", "/notes": null } });
    expect(t.map((c) => c.label)).toEqual(["Old notes"]);
  });
  it("humanizes an unknown key segment", () => {
    const t = deriveTrail({ pathname: "/notes/my-key_name", nav: NAV });
    expect(t[1]!.label.toLowerCase()).toContain("my");
  });
});
