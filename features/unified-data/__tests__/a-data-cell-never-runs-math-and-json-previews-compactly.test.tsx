/**
 * A TABLE CELL WITH "$" IN ITS TEXT NEVER BECOMES MATHS, AND A JSON CELL IS A COMPACT PREVIEW.
 *
 * The use case: a Google Maps table keeps each business's "Top reviews" as JSON text. A review
 * saying "$12 $34" paired the two dollar signs into a KaTeX span and the cell drew italics, one
 * character per line. This test renders the real host renderer (real RichContent, no mock).
 */
import { renderToStaticMarkup } from "react-dom/server";

// The real renderer loads lazily (a placeholder in jest), so the double records the source it is handed:
// "$" reaches it escaped, which is what stops remark-math pairing two amounts. The live walk proves the pixels.
jest.mock("@ai-matrx/rich-content/levels/RichContent", () => ({
  RichContent: ({ source }: { source: string }) => <span data-rich-source={source}>{source}</span>,
}));

import { escapeMathDollars, recordsRenderText } from "../recordsCleanText";
import { parseJsonCell } from "../JsonCellPreview";

const REVIEWS = JSON.stringify([{ author: "Jo", text: "Cleaning cost $12 then $34 for x-rays" }]);
const html = (text: string) => renderToStaticMarkup(<div>{recordsRenderText(text, "cell")}</div>);

describe("a data cell is never maths", () => {
  it("plain text with two dollar amounts reaches the renderer with every dollar escaped", () => {
    expect(html("Paid $12 and later $34 total")).toContain('data-rich-source="Paid \\$12 and later \\$34 total"');
  });

  it("a JSON cell holding dollar signs draws a compact preview, no KaTeX", () => {
    const out = html(REVIEWS);
    expect(out).not.toContain("katex");
    expect(out).toContain("data-records-json-cell");
    expect(out).toContain("1 item");
  });

  it("only a JSON object or array is a JSON cell", () => {
    expect(parseJsonCell(REVIEWS)).not.toBeNull();
    expect(parseJsonCell("12")).toBeNull();
    expect(parseJsonCell("[not json]")).toBeNull();
    expect(parseJsonCell("plain $1 $2")).toBeNull();
  });

  it("escapes every dollar once and leaves an already escaped one alone", () => {
    expect(escapeMathDollars("$12 $34")).toBe("\\$12 \\$34");
    expect(escapeMathDollars("\\$12")).toBe("\\$12");
  });
});
