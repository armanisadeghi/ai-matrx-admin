// A STATEMENT TIMEOUT NEVER READS AS POSTGRES' WORDS ON THE TABLE PAGE (AT-SWEEP 2, extends AT-REVIEWFIX T).
// The table page header actions (sync, Sync into another workspace, access, merge, row-page template, breadcrumbs) show
// failures through sayError (57014 -> "That took too long. Nothing was lost; try again.") or ErrorNotice, and the store
// helpers they call keep the SQLSTATE (storeError). RED on a raw-message path; GREEN now.
// GUARD_ROOT (test only) points the scan at another copy of these files, to prove the guard fails on the prior bytes.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { TIMED_OUT_SENTENCE, isTimedOutError } from "@ai-matrx/design-system";

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));
jest.mock("@/lib/python-client", () => ({ putJson: jest.fn() }));

import { RefusalLine, RefusalNotice } from "@ai-matrx/records-ui";
import { sayError } from "../../base/sayError";
import { storeError } from "../../base/baseStore";

const ROOT = process.env.GUARD_ROOT ?? join(__dirname, "..", "..");
// Every file whose errors reach the screen from a table-page header action.
const FILES = [
  "table-page/SourceSyncBar.tsx",
  "table-page/TableAccessBar.tsx",
  "table-page/RecordPageMenu.tsx",
  "table-page/UnifiedRecordPage.tsx",
  "table-page/UnifiedDataTablePage.tsx",
  "table-page/tableAccessService.ts",
  "connect-database/SyncIntoWorkspaceButton.tsx",
  "connect-database/SyncedTableBar.tsx",
];

it("no table-page header action turns a caught error into on-screen text by hand", () => {
  const offenders: string[] = [];
  for (const f of FILES) {
    readFileSync(join(ROOT, f), "utf8").split("\n").forEach((line, i) => {
      if (/(\w+) instanceof Error \? \1\.message/.test(line)) offenders.push(`${f}:${i + 1} reads e.message (use sayError)`);
      if (/toast\.error\((extractErrorMessage|\w+\.error\.message)/.test(line)) offenders.push(`${f}:${i + 1} toasts a raw message (use sayError)`);
      if (/throw new Error\(\w+\.error\.message\)|throw new Error\(error\.message\)/.test(line)) offenders.push(`${f}:${i + 1} drops the SQLSTATE (use storeError)`);
      if (/String\(\([^)]*\)\.message/.test(line)) offenders.push(`${f}:${i + 1} prints a raw message (use sayError)`);
    });
  }
  expect(offenders).toEqual([]);
});

it("a timeout from the store reads as the store's sentence on every header action", () => {
  const raw = { message: "canceling statement due to statement timeout", code: "57014" };
  expect(isTimedOutError(storeError(raw))).toBe(true);
  expect(sayError(storeError(raw), "The sync did not run.")).toBe(TIMED_OUT_SENTENCE);
  expect(sayError(raw, "The sync did not run.")).toBe(TIMED_OUT_SENTENCE);
  expect(sayError(new Error("3 merged, then: canceling statement due to statement timeout"), "x")).toBe(TIMED_OUT_SENTENCE);
  expect(sayError(new Error("Orders is already in that workspace."), "x")).toBe("Orders is already in that workspace.");
});

// THE PACKAGE HALF (AT-SWEEP-2): Duplicate, Archive, Move to and Export on the table header live inside
// @ai-matrx/records-ui and print through its RefusalNotice / RefusalLine. A raw 57014 reaching them must read as the
// SAME sentence the host uses (design-system's TIMED_OUT_SENTENCE), with Try again, never Postgres' words.
// RED on @ai-matrx/records-ui <= 0.116.44 (the notice headed with "canceling statement due to statement timeout").
it("the package's refusal notice and line read a raw timeout as the shared sentence, with Try again", () => {
  const raw = { code: "57014", sqlstate: "57014", message: "canceling statement due to statement timeout" } as never;
  const html = renderToStaticMarkup(
    createElement("div", null, createElement(RefusalNotice, { error: raw, onRetry: () => undefined }), createElement(RefusalLine, { error: raw, onRetry: () => undefined })),
  );
  expect(html).toContain(TIMED_OUT_SENTENCE);
  // Engineer text rides the data-for-engineers attribute only (records-ui 0.116.47); what a person reads is the text.
  expect(html.replace(/ data-for-engineers="[^"]*"/g, "")).not.toContain("canceling statement");
  expect((html.match(/Try again/g) ?? []).length).toBeGreaterThanOrEqual(2);
});
