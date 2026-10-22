/**
 * ROUND TRIP (CD-IO-12): a page with a heading, a list, a table, an image, a link and a sub-page goes out
 * as Markdown, HTML or a zip with its sub-pages, and comes back through Import with the same content.
 * Word and CSV import read real files. Champion: Notion's export (a zip with a folder per sub-page, each
 * name carrying the page id, links between pages relative) and its import of the same.
 */
jest.mock("@/features/applets/embed/appletsPort", () => ({ readAppletCards: async () => new Map() }));

import { readZip } from "@ai-matrx/alchemy/operate/zip";

import type { SpaceBlock, SpaceDoc } from "../../contract";
import { collect, exportZip, type ExportSource } from "../export";
import { readImport } from "../import";
import { spaceToMarkdown, type MarkdownContext } from "../markdown";

const ROOT = "5f1d2c3b-4a59-4e6f-8a7b-9c0d1e2f3a4b";
const SUB = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d";
const HEX = (id: string) => id.replace(/-/g, "");

const span = (text: string, extra: Record<string, unknown> = {}) => ({ text, ...extra });
const ROOT_BLOCKS: SpaceBlock[] = [
  { id: "b1", type: "heading", props: { level: 2 }, text: [span("Overview")] },
  { id: "b2", type: "text", text: [span("Read the "), span("guide", { link: "https://example.com/guide" }), span(" first.")] },
  { id: "b3", type: "bulleted", text: [span("Alpha")] },
  { id: "b4", type: "bulleted", text: [span("Beta")] },
  { id: "b5", type: "numbered", text: [span("First")] },
  { id: "b6", type: "numbered", text: [span("Second")] },
  {
    id: "b7",
    type: "table",
    props: { headerRow: true, headerColumn: false, rows: [{ cells: [[span("Name")], [span("Qty")]] }, { cells: [[span("Rent")], [span("1200")]] }] },
  },
  { id: "b8", type: "image", props: { url: "https://example.com/team.png" } },
  { id: "b9", type: "page", props: { spaceId: SUB } },
] as SpaceBlock[];
const SUB_BLOCKS: SpaceBlock[] = [{ id: "s1", type: "text", text: [span("Inside the sub-page.")] }] as SpaceBlock[];

const doc = (id: string, title: string, blocks: SpaceBlock[], parentId: string | null): SpaceDoc =>
  ({ id, parentId, title, blocks, isArchived: false, position: "a", settings: {}, version: 1, createdAt: "", updatedAt: "" }) as unknown as SpaceDoc;
const DOCS: Record<string, SpaceDoc> = { [ROOT]: doc(ROOT, "Launch plan", ROOT_BLOCKS, null), [SUB]: doc(SUB, "Budget notes", SUB_BLOCKS, ROOT) };
const source: ExportSource = {
  get: async (id) => DOCS[id] ?? null,
  childrenOf: (id) => (id === ROOT ? [{ id: SUB }] : []),
  titleOf: (id) => DOCS[id]?.title ?? "",
};
const ctx: MarkdownContext = { titleOf: (id) => DOCS[id]?.title ?? "", hrefOf: (id) => `https://www.aimatrx.com/spaces/${id}` };
/** A File as the browser hands it over (jsdom's has no text()/arrayBuffer()). */
const fileOf = (name: string, body: string | Uint8Array, type = "text/plain") => {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
  return Object.assign(new File([bytes], name, { type }), {
    text: async () => new TextDecoder().decode(bytes),
    arrayBuffer: async () => bytes.slice().buffer,
  });
};

/** Everything but the sub-page line, which a single file can only carry as an address. */
const body = (md: string) => md.split("\n").filter((l) => !l.includes("/spaces/")).join("\n").trim();

describe("a Space round-trips through its files", () => {
  const md1 = spaceToMarkdown("Launch plan", ROOT_BLOCKS, ctx);

  it("Markdown: export -> import -> export is the same page", async () => {
    const page = await readImport(fileOf("whatever.md", md1), "markdown");
    expect(page.title).toBe("Launch plan");
    expect(page.blocks.map((b) => b.type)).toEqual(expect.arrayContaining(["heading", "bulleted", "numbered", "table", "image"]));
    expect(body(spaceToMarkdown(page.title, page.blocks, ctx))).toBe(body(md1));
  });

  it("HTML: export -> import -> export is the same page", async () => {
    const { renderMarkdownDocument } = await import("@ai-matrx/print/markdown");
    const html = renderMarkdownDocument(md1, { title: "Launch plan" });
    const page = await readImport(fileOf("whatever.html", html, "text/html"), "html");
    expect(page.title).toBe("Launch plan");
    expect(body(spaceToMarkdown(page.title, page.blocks, ctx))).toBe(body(md1));
  });

  it("CSV: a file becomes one table, header first", async () => {
    const page = await readImport(fileOf("Budget.csv", "Name,Qty\nRent,1200\nFood,400\n", "text/csv"), "csv");
    expect(page.title).toBe("Budget");
    expect(spaceToMarkdown(page.title, page.blocks, ctx)).toContain("| Name | Qty |\n| --- | --- |\n| Rent | 1200 |\n| Food | 400 |");
  });

  jest.setTimeout(120_000);

  it("Word: a .docx becomes a page with its heading, list and table, and its pictures are stored", async () => {
    const { exportDocument } = await import("@ai-matrx/print/document");
    const exp = await exportDocument(
      ["# Launch plan", "", "## Overview", "", "- Alpha", "- Beta", "", "| Name | Qty |", "| --- | --- |", "| Rent | 1200 |", ""].join("\n"),
      "docx",
      { fileName: "plan" },
    );
    const stored: string[] = [];
    const page = await readImport(fileOf("plan.docx", exp.bytes as Uint8Array), "word", {
      storeFile: async (f) => (stored.push(f.name), { fileId: `file-${stored.length}` }),
    });
    expect(page.title).toBe("Launch plan");
    const md = spaceToMarkdown(page.title, page.blocks, ctx);
    expect(md).toContain("## Overview");
    expect(md).toContain("- Alpha\n- Beta");
    // The header row's look (bold) is the Word reader's to fold (office package); the cells' words are ours to keep.
    const table = page.blocks.find((b) => b.type === "table");
    const words = ((table?.props as { rows: Array<{ cells: Array<Array<{ text: string }>> }> }).rows ?? []).map((r) =>
      r.cells.map((c) => c.map((s) => s.text).join("").replace(/\*/g, "").trim()),
    );
    expect(words).toEqual([["Name", "Qty"], ["Rent", "1200"]]);
  });

  it("Word: a file that is not a .docx is refused with its name", async () => {
    await expect(readImport(fileOf("notes.docx", "plain words"), "word")).rejects.toThrow("notes.docx is not a Word document (.docx).");
  });

  it("zip with sub-pages: a folder per page, each name carrying its id, links relative", async () => {
    const entries = await collect(source, ROOT, true);
    const zip = await readZip(await exportZip(entries, source, "markdown"));
    const paths = zip.files.filter((f) => !f.directory).map((f) => f.path).sort();
    const rootPath = `Launch plan ${HEX(ROOT)}.md`;
    const subPath = `Launch plan ${HEX(ROOT)}/Budget notes ${HEX(SUB)}.md`;
    expect(paths).toEqual([subPath, rootPath].sort());
    const rootMd = await zip.get(rootPath)!.text();
    expect(rootMd).toContain(`[Budget notes](Launch%20plan%20${HEX(ROOT)}/Budget%20notes%20${HEX(SUB)}.md)`);
    expect(await zip.get(subPath)!.text()).toContain("Inside the sub-page.");
  });
});
