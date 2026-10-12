/**
 * @jest-environment jsdom
 *
 * GUARD: a Word / HTML / text upload lands as a document with its headings,
 * emphasis, lists and links — never as one flat blob, never read as markdown
 * when it was plain text (2026-10-11 review: Documents had no upload at all).
 */
jest.mock("@ai-matrx/alchemy/operate/zip", () => ({ readZip: jest.fn() }));
jest.mock("@/features/documents/document-service", () => ({}));

import {
  docxXmlToMarkdown,
  documentFileKind,
  htmlToDocumentMarkdown,
} from "@/features/documents/import-document-file";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

it("Word: headings, bold, italic and list paragraphs keep their shape", () => {
  const xml = `<w:document ${W}><w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Kiln firing log</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">Reached </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>cone 6</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t> at 2 pm</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>Shelf A</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>Shelf B</w:t></w:r></w:p>
  </w:body></w:document>`;
  const md = docxXmlToMarkdown(xml);
  expect(md).toContain("# Kiln firing log");
  expect(md).toContain("Reached **cone 6** *at 2 pm*");
  expect(md).toContain("- Shelf A\n- Shelf B");
});

it("HTML: blocks, emphasis and links", () => {
  const md = htmlToDocumentMarkdown(
    '<h2>Glaze notes</h2><p>Use <strong>celadon</strong> on <a href="https://example.org/glaze">bisque</a>.</p><ul><li>Dip</li><li>Wipe</li></ul>',
  );
  expect(md).toContain("## Glaze notes");
  expect(md).toContain("Use **celadon** on [bisque](https://example.org/glaze).");
  expect(md).toContain("- Dip\n- Wipe");
});

it("knows which files it takes", () => {
  expect(documentFileKind("Report.DOCX")).toBe("docx");
  expect(documentFileKind("notes.md")).toBe("md");
  expect(documentFileKind("a.pdf")).toBeNull();
});
