// features/spaces/io/import.ts — K2: a Markdown, HTML, Word or CSV file becomes a new Space.
//
// Markdown goes through the one Notion-flavored converter (`notionMarkdownToBlocks`); HTML first becomes
// Markdown through the rich editor's own HTML → Markdown converter (the one every paste uses); Word
// (.docx) becomes Markdown through the office package's Word reader (the one Documents uses), each picture
// inside the file stored as a file of ours; a CSV becomes one simple table (first row = header). A page's
// title is its leading `# ` heading (or the HTML `<title>` / first `<h1>`), else the file name. Images
// on the web stay links to their address.

import { notionMarkdownToBlocks } from "@/lib/spaces-blocks/notion-markdown";
import { validateBlocks } from "@/lib/spaces-blocks/schema";

import type { RichSpan, SpaceBlock } from "../contract";

export type ImportKind = "markdown" | "html" | "word" | "csv";

export const IMPORT_ACCEPT: Record<ImportKind, string> = {
  markdown: ".md,.markdown,.txt,text/markdown,text/plain",
  html: ".html,.htm,text/html",
  word: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: ".csv,text/csv",
};

export interface ImportedPage {
  title: string;
  blocks: SpaceBlock[];
  /** What did not map one-to-one (shown once, as a toast). */
  warnings: string[];
}

export interface ImportOptions {
  /** Stores a picture that came inside the file (a Word document's); null = it could not be stored. */
  storeFile?: (file: File) => Promise<{ fileId: string } | null>;
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, "").trim() || "Untitled";

/** Stored pictures by their path inside the file; anything else on the web stays a link. */
type StoredFiles = ReadonlyMap<string, { fileId: string }>;
const fileResolver = (stored: StoredFiles) => (url: string) =>
  stored.get(url) ?? stored.get(decodeURI(url)) ?? (/^(https?:|data:image\/)/i.test(url) ? { url } : null);

function fromMarkdown(md: string, fallbackTitle: string, stored: StoredFiles = new Map()): ImportedPage {
  let title = fallbackTitle;
  const lines = md.replace(/^﻿/, "").split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim() !== "");
  const heading = first >= 0 ? /^#\s+(.+?)\s*#*\s*$/.exec(lines[first]) : null;
  if (heading) {
    title = heading[1];
    lines.splice(first, 1);
  }
  const { blocks, warnings } = notionMarkdownToBlocks(lines.join("\n"), {
    idSeed: `import:${crypto.randomUUID()}`,
    resolveFile: fileResolver(stored),
  });
  return { title, blocks, warnings };
}

async function fromHtml(html: string, fallbackTitle: string): Promise<ImportedPage> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const named = doc.querySelector("title")?.textContent?.trim() || "";
  const [{ getSchema }, { createRichEditorExtensions }, { htmlToMarkdown }] = await Promise.all([
    import("@tiptap/core"),
    import("@ai-matrx/rich-content/editor/core/extensions"),
    import("@ai-matrx/rich-content/editor/core/html-to-markdown"),
  ]);
  const md = htmlToMarkdown(doc.body.innerHTML, getSchema(createRichEditorExtensions()));
  const page = fromMarkdown(md, named || fallbackTitle);
  return named ? { ...page, title: named } : page;
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml", bmp: "image/bmp" };

async function fromWord(file: File, fallbackTitle: string, options: ImportOptions): Promise<ImportedPage> {
  const [{ readZip }, { docxXmlToMarkdown }] = await Promise.all([import("@ai-matrx/alchemy/operate/zip"), import("@ai-matrx/office/docs/io")]);
  const zip = await readZip(new Uint8Array(await file.arrayBuffer())).catch(() => null);
  const body = zip?.get("word/document.xml");
  if (!zip || !body) throw new Error(`${file.name} is not a Word document (.docx).`);
  const part = async (path: string) => (await zip.get(path)?.text()) ?? null;
  const md = docxXmlToMarkdown(await body.text(), { rels: await part("word/_rels/document.xml.rels"), numbering: await part("word/numbering.xml") });
  // Each picture inside the file is stored once, as a file of ours, and the image block points at it.
  const stored = new Map<string, { fileId: string }>();
  const warnings: string[] = [];
  const paths = new Set(Array.from(md.matchAll(/!\[[^\]]*\]\((word\/[^)\s]+)\)/g), (m) => m[1]));
  for (const path of paths) {
    const entry = zip.get(decodeURI(path));
    const name = decodeURI(path).split("/").pop() ?? "image";
    const bytes = entry ? await entry.bytes() : null;
    const hit = bytes && options.storeFile ? await options.storeFile(new File([bytes], name, { type: MIME[name.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream" })) : null;
    if (hit) stored.set(path, hit);
    else warnings.push(`The picture ${name} could not be stored.`);
  }
  const page = fromMarkdown(md, fallbackTitle, stored);
  return { ...page, warnings: [...warnings, ...page.warnings] };
}

async function fromCsv(csv: string, title: string): Promise<ImportedPage> {
  const { parseDelimited } = await import("@ai-matrx/alchemy/operate/read");
  const parsed = parseDelimited(csv.replace(/^﻿/, ""), { skipEmptyLines: true });
  const rows = parsed.data.filter((r) => Array.isArray(r) && r.some((c) => String(c).trim() !== ""));
  if (!rows.length) return { title, blocks: [], warnings: ["The file has no rows."] };
  const width = Math.max(...rows.map((r) => r.length));
  const cell = (v: unknown): RichSpan[] => (String(v ?? "") ? [{ text: String(v ?? "") }] : []);
  const table: SpaceBlock = {
    id: crypto.randomUUID(),
    type: "table",
    props: { headerRow: true, headerColumn: false, rows: rows.map((r) => ({ cells: Array.from({ length: width }, (_, i) => cell(r[i])) })) },
  };
  return { title, blocks: [table], warnings: parsed.errors.slice(0, 3).map((e) => `Row ${e.row ?? "?"}: ${e.message}`) };
}

/** Reads one file into a page; throws with the reason when the result would not be a valid Space. */
export async function readImport(file: File, kind: ImportKind, options: ImportOptions = {}): Promise<ImportedPage> {
  const title = baseName(file.name);
  const page =
    kind === "word"
      ? await fromWord(file, title, options)
      : kind === "markdown"
        ? fromMarkdown(await file.text(), title)
        : kind === "html"
          ? await fromHtml(await file.text(), title)
          : await fromCsv(await file.text(), title);
  const problems = validateBlocks(page.blocks);
  if (problems.length) throw new Error(`${file.name} could not be imported: ${problems[0]}`);
  return page;
}
