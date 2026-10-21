import { foldAbilities } from "./provider-folds";
import type { IntegrationDirectoryItem } from "./integration-directory";

function item(id: string, extra: Partial<IntegrationDirectoryItem> = {}): IntegrationDirectoryItem {
  return {
    id, name: id, description: "", vendor: "", category: "x", keywords: "",
    artwork: { id, name: id, blurb: "", surfaces: ["directory"] },
    featured: false, saved: false, connected: false, available: true,
    comingSoon: false, status: "Not connected", attention: false, ...extra,
  };
}
const server = (slug: string) => ({ slug }) as IntegrationDirectoryItem["server"];

describe("one card per provider", () => {
  it("folds the catalog Notion row into the native card and keeps its connection", () => {
    const out = foldAbilities([
      item("native:notion"),
      item("mcp-notion", { server: server("notion"), saved: true, connected: true, status: "Connected" }),
      item("other", { server: server("linear") }),
    ]);
    expect(out.map((i) => i.id)).toEqual(["native:notion", "other"]);
    expect(out[0].abilities?.[0].item.id).toBe("mcp-notion");
    expect(out[0].connected).toBe(true);
    expect(out[0].status).toBe("Connected");
    expect(out[0].ownState?.connected).toBe(false);
  });
  it("hides unsaved local Google rows and github, keeps a saved one", () => {
    const rows = [
      item("native:google"),
      item("g1", { server: server("google-workspace") }),
      item("g2", { server: server("google-drive"), saved: true }),
      item("gh", { server: server("github") }),
    ];
    const out = foldAbilities(rows);
    expect(out.map((i) => i.id)).toEqual(["native:google"]);
    expect(out[0].abilities?.map((a) => a.item.id)).toEqual(["g2"]);
  });
  it("a folded catalog row's products stay searchable on the card it folds into (Teams finds Microsoft)", () => {
    const out = foldAbilities([
      item("native:microsoft", { keywords: "outlook mail" }),
      item("wiq", { server: server("microsoft-work-iq"), keywords: "microsoft-work-iq Teams chat meetings SharePoint" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].keywords).toContain("SharePoint");
    expect(out[0].keywords).toContain("outlook mail");
  });
});
