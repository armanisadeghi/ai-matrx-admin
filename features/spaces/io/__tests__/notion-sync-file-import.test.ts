import { FILE_IMPORT_SYNC_SENTENCE, carriesNotionKey } from "../NotionSyncBar";

describe("a table imported from a Notion file says so on Sync now", () => {
  it("recognises the importer's key column", () => {
    expect(carriesNotionKey([{ name: "Name" }, { name: "Notion ID" }])).toBe(true);
    expect(carriesNotionKey([{ name: "notion_id" }])).toBe(true);
  });
  it("leaves ordinary tables alone", () => {
    expect(carriesNotionKey([{ name: "Name" }, { name: "Notes" }])).toBe(false);
    expect(carriesNotionKey(undefined)).toBe(false);
  });
  it("names the cause and the way out, never a store error", () => {
    expect(FILE_IMPORT_SYNC_SENTENCE).toMatch(/imported from a Notion file/);
    expect(FILE_IMPORT_SYNC_SENTENCE).toMatch(/Connect Notion/);
  });
});
