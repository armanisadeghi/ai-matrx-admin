import { documentPreviewSvg, formatCellValue, workbookPreviewSvg } from "../thumbnail/snapshot-preview-svg";
import { markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";

describe("snapshot preview — workbook", () => {
  const wb = {
    sheetOrder: ["s1"],
    styles: { h: { bg: { rgb: "#1a73e8" }, cl: { rgb: "#ffffff" }, bl: 1 } },
    sheets: {
      s1: {
        id: "s1",
        cellData: {
          0: { 0: { v: "Task", s: "h" }, 1: { v: "Done", s: "h" }, 2: { v: "Cost", s: "h" } },
          1: { 0: { v: "Book venue" }, 1: { v: true }, 2: { v: 1250.5, s: { n: { pattern: '"$"#,##0.00' } } } },
          2: { 0: { v: "Send invites" }, 1: { v: false }, 2: { v: 300 } },
        },
      },
    },
    resources: [
      { name: "SHEET_DATA_VALIDATION_PLUGIN", data: JSON.stringify({ s1: [{ type: "checkbox", ranges: [{ startRow: 1, endRow: 50, startColumn: 1, endColumn: 1 }] }] }) },
      {
        name: "SHEET_CONDITIONAL_FORMATTING_PLUGIN",
        data: JSON.stringify({ s1: [{ rule: { type: "highlightCell", subType: "number", operator: "greaterThan", value: 1000, style: { bg: { rgb: "#fce8e6" } } }, ranges: [{ startRow: 1, endRow: 9, startColumn: 2, endColumn: 2 }] }] }),
      },
    ],
  };

  it("draws header fills, values with their number format, conditional fills and checkboxes", () => {
    const svg = workbookPreviewSvg(wb);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('fill="#1a73e8"');
    expect(svg).toContain(">Task<");
    expect(svg).toContain("$1,250.50");
    expect(svg).toContain('fill="#fce8e6"'); // 1250.5 > 1000
    expect((svg.match(/fill="#fce8e6"/g) ?? []).length).toBe(1); // 300 is not
    expect(svg).toContain("<path"); // the ticked checkbox
    expect(svg).not.toContain(">TRUE<");
  });

  it("escapes cell text", () => {
    const svg = workbookPreviewSvg({ sheetOrder: ["a"], sheets: { a: { cellData: { 0: { 0: { v: "<b>&" } } } } } });
    expect(svg).toContain("&lt;b&gt;&amp;");
  });
});

describe("snapshot preview — number formats", () => {
  it.each([
    [1234.5, '"$"#,##0.00', "$1,234.50"],
    [0.125, "0.0%", "12.5%"],
    [46307, "mmm d, yyyy", "Oct 12, 2026"],
    [46307, "m/d/yyyy", "10/12/2026"],
    [-42, '"$"#,##0', "-$42"],
  ])("%p with %s → %s", (v, pattern, want) => {
    expect(formatCellValue(v, pattern)).toBe(want);
  });
});

describe("snapshot preview — document", () => {
  it("draws headings, body text and tables from a real document snapshot", () => {
    const doc = markdownToUniverDoc("# Weekly sync\n\nAgenda for the team.\n\n| Owner | Item |\n|---|---|\n| Priya | Budget |\n");
    const svg = documentPreviewSvg(doc);
    expect(svg).toContain(">Weekly sync<");
    expect(svg).toContain('font-weight="700"');
    expect(svg).toContain(">Agenda for the team.<");
    expect(svg).toContain(">Priya<");
    expect(svg).toContain(">Budget<");
  });
});
