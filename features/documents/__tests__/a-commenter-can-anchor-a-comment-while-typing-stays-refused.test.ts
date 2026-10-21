/**
 * Regression (2026-10-21): a commenter selects text and presses Add comment: nothing happened, no thread, no cmt_add.
 * Cause: commit 5f4c850765 made a seat without edit access read-only through Univer's Edit permission, and Univer
 * refuses the comment anchor's rich-text mutation under that same permission ("Document edit permission denied").
 * Real headless Univer Docs, the real permission check and the real mutation: the anchor write goes through, typing
 * does not, and Edit is back off afterwards.
 */
import { ICommandService, IPermissionService, IUniverInstanceService, LocaleType, LogLevel, Univer, UniverInstanceType } from "@univerjs/core";
import { DOCUMENT_UNIT_PERMISSION_ACTIONS, UniverDocsPlugin, getDocumentPermissionValue, setDocumentPermissionValue } from "@univerjs/docs";
import { UniverRenderEnginePlugin } from "@univerjs/engine-render";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { addCommentAnchorActions, commentAnchorsOf } from "@ai-matrx/office/docs";
import { withEditLiftedForAnchor } from "../components/commentAnchorWrite";

const EDIT = DOCUMENT_UNIT_PERMISSION_ACTIONS[0]!;

function readOnlySeat() {
  const univer = new Univer({ locale: LocaleType.EN_US, logLevel: LogLevel.SILENT, locales: { [LocaleType.EN_US]: {} } });
  univer.registerPlugin(UniverRenderEnginePlugin);
  univer.registerPlugin(UniverDocsPlugin);
  const injector = (univer as unknown as { __getInjector(): { get<X>(t: unknown): X } }).__getInjector();
  const commands = injector.get<ICommandService>(ICommandService);
  const permissions = injector.get<IPermissionService>(IPermissionService);
  univer.createUnit(UniverInstanceType.UNIVER_DOC, {
    id: "d",
    body: { dataStream: "Hello big world\r\n", textRuns: [], paragraphs: [{ startIndex: 15 }], sectionBreaks: [{ startIndex: 16 }] },
    documentStyle: {},
  });
  const instances = injector.get<IUniverInstanceService>(IUniverInstanceService);
  instances.focusUnit("d");
  setDocumentPermissionValue(permissions, "d", "d", EDIT, false); // what setViewOnly(true) does
  const body = () => (instances.getUnit("d") as unknown as { getBody(): { dataStream: string } }).getBody();
  const anchor = () => commands.syncExecuteCommand("doc.mutation.rich-text-editing", { unitId: "d", actions: addCommentAnchorActions(body(), 6, 9, "cabc"), textRanges: undefined });
  const type = () => commands.syncExecuteCommand("doc.mutation.rich-text-editing", { unitId: "d", actions: addCommentAnchorActions(body(), 0, 1, "x"), textRanges: undefined });
  return { univer, permissions, body, anchor, type };
}

describe("a commenter's read-only seat", () => {
  it("root cause: with Edit off, Univer refuses the anchor write itself (returns false)", () => {
    const s = readOnlySeat();
    expect(s.anchor()).toBe(false); // syncExecuteCommand returns false: the page said "couldn't anchor", no draft, no cmt_add
    expect([...commentAnchorsOf(s.body()).keys()]).toEqual([]);
    s.univer.dispose();
  });

  it("the anchor write goes through with Edit lifted for that one call, and Edit is off again after", () => {
    const s = readOnlySeat();
    expect(withEditLiftedForAnchor(s.permissions as never, "d", true, s.anchor)).not.toBe(false);
    expect([...commentAnchorsOf(s.body()).values()].map((a) => a.text)).toEqual(["big"]);
    expect(getDocumentPermissionValue(s.permissions as never, "d", "d", EDIT)).toBe(false);
    expect(s.type()).toBe(false);
    s.univer.dispose();
  });

  it("a seat that may only view gets no lift", () => {
    const s = readOnlySeat();
    expect(withEditLiftedForAnchor(s.permissions as never, "d", false, s.anchor)).toBe(false);
    s.univer.dispose();
  });

  it("Edit is put back even when the write throws", () => {
    const s = readOnlySeat();
    expect(() => withEditLiftedForAnchor(s.permissions as never, "d", true, () => { throw new Error("boom"); })).toThrow("boom");
    expect(getDocumentPermissionValue(s.permissions as never, "d", "d", EDIT)).toBe(false);
    s.univer.dispose();
  });
});

it("Add comment writes its anchor through the lift, never straight into a read-only document", () => {
  const src = readFileSync(join(__dirname, "../components/useDocComments.tsx"), "utf8");
  expect(src).toContain("withEditLiftedForAnchor(");
  expect(src).not.toMatch(/return injector\.get<[^\n]*ICommandService\)\.syncExecuteCommand\(RICH_TEXT_EDITING/);
});
