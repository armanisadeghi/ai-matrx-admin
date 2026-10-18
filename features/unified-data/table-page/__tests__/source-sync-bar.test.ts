import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SYNC_SOURCES, syncSentence } from "../SourceSyncBar";

describe("a table brought in from Airtable or GitHub has a Sync now", () => {
  it("knows both sources and each one's aidream door", () => {
    expect(SYNC_SOURCES.airtable_base?.path).toBe("/airtable-import/sync");
    expect(SYNC_SOURCES.github_issues?.path).toBe("/github-sync/sync");
  });
  it("says what a sync did, and that a kept row is a comment", () => {
    expect(syncSentence("GitHub", { added: 2, updated: 1, conflicts: [{}] })).toBe("GitHub synced: 2 added, 1 updated, 1 kept yours (GitHub's version is a comment on the row).");
    expect(syncSentence("Airtable", {})).toBe("Airtable synced: 0 added, 0 updated.");
  });
  it("is mounted on the table page and the base page offers the GitHub picker", () => {
    const page = readFileSync(join(__dirname, "../UnifiedDataTablePage.tsx"), "utf8");
    const base = readFileSync(join(__dirname, "../../base/BaseScreens.tsx"), "utf8");
    expect(page).toContain("<SourceSyncBar");
    expect(base).toContain("<GithubImportDialog");
  });
  it("the GitHub picker names the connect action when there is no connection", () => {
    const src = readFileSync(join(__dirname, "../../base/GithubImportDialog.tsx"), "utf8");
    expect(src).toContain("data-github-not-connected");
    expect(src).toContain("data-github-connect");
  });
});
