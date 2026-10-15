import { appConfigV1Schema, configToDraft, draftToConfig } from "./schema";

const BASE = { flags: {}, notice: null };

describe("app-config editor: server URLs are optional per row", () => {
  it("accepts a row that carries no server URLs and saves none back", () => {
    expect(appConfigV1Schema.safeParse(BASE).success).toBe(true);
    const saved = draftToConfig(configToDraft({ ...BASE, credential_maintenance: {} }));
    expect(Object.keys(saved)).not.toEqual(expect.arrayContaining(["aidream_server_url"]));
    expect("matrx_files_url" in saved || "scraper_server_url" in saved || "aidream_server_url" in saved).toBe(false);
    expect(appConfigV1Schema.safeParse(saved).success).toBe(true);
  });

  it("keeps a URL the row carries, and clearing it fails validation instead of deleting it", () => {
    const draft = configToDraft({ ...BASE, aidream_server_url: "https://server.app.matrxserver.com" });
    expect(draftToConfig(draft).aidream_server_url).toBe("https://server.app.matrxserver.com");
    const cleared = draftToConfig({ ...draft, urls: { ...draft.urls, aidream_server_url: "  " } });
    expect(cleared.aidream_server_url).toBe("");
    expect(appConfigV1Schema.safeParse(cleared).success).toBe(false);
  });

  it("adds a URL the row lacked once an admin fills it in", () => {
    const draft = configToDraft(BASE);
    const saved = draftToConfig({ ...draft, urls: { ...draft.urls, scraper_server_url: "https://scraper.example.com" } });
    expect(saved.scraper_server_url).toBe("https://scraper.example.com");
    expect("matrx_files_url" in saved).toBe(false);
  });
});
