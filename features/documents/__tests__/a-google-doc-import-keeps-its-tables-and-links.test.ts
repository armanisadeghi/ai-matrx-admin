// A Google Doc comes in as markdown (Docs -> markdown, server side) and must land in our document with
// its tables as real tables and its links keeping their address (2026-10-10: a table arrived as pipe
// text and a link lost its href). The forward converter needs Univer's enums, which cannot load under
// jest (ESM-only), so the few it reads are stubbed with Univer's own values; the document it builds is
// then read back through the one reverse converter, which is where a break shows as lost markdown.
jest.mock("@univerjs/core", () => {
  let n = 0;
  return {
    BooleanNumber: { FALSE: 0, TRUE: 1 },
    CustomRangeType: { HYPERLINK: 0 },
    ObjectRelativeFromH: { PAGE: 0 },
    ObjectRelativeFromV: { PAGE: 0 },
    TableAlignmentType: { START: 0 },
    TableRowHeightRule: { AUTO: 0 },
    TableSizeType: { UNSPECIFIED: 0, SPECIFIED: 1 },
    TableTextWrapType: { NONE: 0 },
    createParagraphId: () => `p${n++}`,
    createSectionId: () => `s${n++}`,
  };
});
jest.mock("@univerjs/presets", () => ({ LocaleType: { EN_US: "enUS" } }));

import { markdownToUniverDoc } from "../markdown-to-univer-doc";
import { univerDocToMarkdown } from "../univer-doc-to-markdown";

const MD = [
  "# Launch plan",
  "",
  "See the [roadmap](https://example.com/roadmap?q=1) for **details**.",
  "",
  "| Name | Owner |",
  "| --- | --- |",
  "| Ship | [Dana](https://example.com/dana) |",
  "| Review | Lee |",
  "",
  "After the table.",
].join("\n");

describe("a Google Doc imported as markdown", () => {
  const doc = markdownToUniverDoc(MD, "Launch plan") as {
    body: { dataStream: string; tables?: unknown[]; customRanges?: Array<{ properties: { url: string } }> };
    tableSource?: Record<string, { tableRows: unknown[]; tableColumns: unknown[] }>;
  };

  test("the table is a real Univer table, not pipe text", () => {
    expect(doc.body.tables).toHaveLength(1);
    const source = Object.values(doc.tableSource ?? {})[0];
    expect(source.tableRows).toHaveLength(3);
    expect(source.tableColumns).toHaveLength(2);
    expect(doc.body.dataStream).not.toContain("   |   ");
    expect(doc.body.dataStream).not.toContain("| Name");
  });

  test("links keep their address as hyperlink ranges", () => {
    const urls = (doc.body.customRanges ?? []).map((r) => r.properties.url);
    expect(urls).toEqual(["https://example.com/roadmap?q=1", "https://example.com/dana"]);
  });

  test("it reads back as the same markdown", () => {
    const back = univerDocToMarkdown(doc);
    expect(back).toContain("[roadmap](https://example.com/roadmap?q=1)");
    expect(back).toContain("| Name | Owner |");
    expect(back).toContain("| Ship | [Dana](https://example.com/dana) |");
    expect(back).toContain("| Review | Lee |");
    expect(back).toMatch(/\| --- \| --- \|/);
    expect(back).toContain("After the table.");
  });
});
