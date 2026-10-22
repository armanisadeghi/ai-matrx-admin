// features/spaces/io/export.ts — K1: export a Space as Markdown / HTML (one file, or a zip with its
// sub-pages, Notion's layout: `Title <id>.md` beside a `Title <id>/` folder holding the sub-pages, links
// between pages relative; the id in each name is what lets the zip come back through Import > Notion
// export with every sub-page and link kept) or PDF (the app's print system, @ai-matrx/print: one print
// window, each sub-page after a page break).

import { PAGE_BREAK_MARKDOWN } from "@ai-matrx/print/markdown";

import { downloadFile } from "@ai-matrx/kit/download";

import { readAppletCards } from "@/features/applets/embed/appletsPort";

import type { SpaceBlock, SpaceDoc, SpaceId } from "../contract";
import { spaceToMarkdown, type MarkdownContext } from "./markdown";

export type ExportFormat = "markdown" | "html" | "pdf";

export interface ExportSource {
  get: (id: SpaceId) => Promise<SpaceDoc | null>;
  /** Live sub-pages in order (the database's read when the tree has not loaded them). */
  childrenOf: (id: SpaceId) => Array<{ id: SpaceId }> | Promise<Array<{ id: SpaceId }>>;
  titleOf: (id: SpaceId) => string;
}

/** A file / folder name Notion-style: the title, unsafe characters dropped. */
export function safeName(title: string): string {
  return (title || "Untitled").replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Untitled";
}

export interface Entry {
  doc: SpaceDoc;
  /** Path inside the export, without extension, e.g. "Home/Clients". */
  path: string;
}

/** A page's name inside a zip, Notion's way: the title, then the page's id as 32 hex characters. */
export const zipName = (title: string, id: SpaceId) => `${safeName(title)} ${id.replace(/-/g, "").toLowerCase()}`;

export async function collect(source: ExportSource, rootId: SpaceId, withChildren: boolean): Promise<Entry[]> {
  const out: Entry[] = [];
  const walk = async (id: SpaceId, dir: string, depth: number) => {
    const doc = await source.get(id);
    if (!doc || doc.isArchived) return;
    // Inside a zip every name carries the page's id (no two collide, and a re-import finds each page again).
    const name = withChildren ? zipName(doc.title, doc.id) : safeName(doc.title);
    const path = dir ? `${dir}/${name}` : name;
    out.push({ doc, path });
    if (!withChildren || depth >= 16) return;
    for (const kid of await source.childrenOf(id)) await walk(kid.id, path, depth + 1);
  };
  await walk(rootId, "", 0);
  return out;
}

function relative(from: string, to: string): string {
  const a = from.split("/").slice(0, -1);
  const b = to.split("/");
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => ".."), ...b.slice(i)].map(encodeURIComponent).join("/");
}

export type AppletOf = NonNullable<MarkdownContext["appletOf"]>;

/** Every Applet block's Applet in these pages, read once (name + slug for the export's link). */
async function appletsIn(entries: Entry[]): Promise<AppletOf> {
  const ids: string[] = [];
  const walk = (blocks: SpaceBlock[]) =>
    blocks.forEach((b) => {
      if (b.type === "applet" && typeof b.props?.appletId === "string") ids.push(b.props.appletId);
      if (b.children?.length) walk(b.children);
    });
  entries.forEach((e) => walk(e.doc.blocks));
  if (!ids.length) return () => null;
  // A failed read leaves the export whole: each block then says what it was instead of linking.
  const cards = await readAppletCards(ids).catch(() => new Map<string, { name: string; slug: string }>());
  return (id) => cards.get(id) ?? null;
}

function contextFor(entry: Entry, all: Entry[], source: ExportSource, ext: string, appletOf: AppletOf): MarkdownContext {
  const byId = new Map(all.map((e) => [e.doc.id, e]));
  return {
    appletOf,
    titleOf: (id) => byId.get(id)?.doc.title ?? source.titleOf(id),
    hrefOf: (id) => {
      const hit = byId.get(id);
      return hit ? `${relative(entry.path, hit.path)}.${ext}` : `${window.location.origin}/spaces/${id}`;
    },
  };
}

/** One page as its Markdown or HTML file, links pointing at the other files of this export. */
async function renderEntry(e: Entry, all: Entry[], source: ExportSource, format: "markdown" | "html", appletOf: AppletOf): Promise<string> {
  const md = spaceToMarkdown(e.doc.title, e.doc.blocks, contextFor(e, all, source, format === "markdown" ? "md" : "html", appletOf));
  if (format === "markdown") return md;
  const { renderMarkdownDocument } = await import("@ai-matrx/print/markdown");
  return renderMarkdownDocument(md, { title: e.doc.title || "Untitled" });
}

/** Runs the export and starts the download (or the print window). Returns what happened, for the toast. */
export async function exportSpace(source: ExportSource, rootId: SpaceId, format: ExportFormat, withChildren: boolean): Promise<string> {
  const entries = await collect(source, rootId, withChildren);
  if (!entries.length) throw new Error("This page could not be read.");
  const root = entries[0];
  const fileName = safeName(root.doc.title);
  const appletOf = await appletsIn(entries);

  if (format === "pdf") {
    const { printMarkdown } = await import("@ai-matrx/print/markdown");
    const markdown = entries
      .map((e) => spaceToMarkdown(e.doc.title, e.doc.blocks, { titleOf: source.titleOf, hrefOf: (id) => `${window.location.origin}/spaces/${id}`, appletOf }))
      .join(`\n\n${PAGE_BREAK_MARKDOWN}\n\n`);
    const outcome = printMarkdown(markdown, { title: root.doc.title || "Untitled", withPrintActions: true });
    return outcome === "downloaded" ? "The print window was blocked, so the page was downloaded instead" : "Opened for printing";
  }

  const ext = format === "markdown" ? "md" : "html";
  const type = format === "markdown" ? "text/markdown;charset=utf-8" : "text/html;charset=utf-8";

  if (entries.length === 1) {
    downloadFile(`${fileName}.${ext}`, await renderEntry(root, entries, source, format, appletOf), type);
    return "Exported";
  }
  downloadFile(`${fileName}.zip`, await exportZip(entries, source, format, appletOf), "application/zip");
  return `Exported ${entries.length} pages`;
}

/** The pages as one zip (Markdown or HTML files, a folder per page holding its sub-pages). */
export async function exportZip(entries: Entry[], source: ExportSource, format: "markdown" | "html", appletOf: AppletOf = () => null): Promise<Blob> {
  const ext = format === "markdown" ? "md" : "html";
  const { buildZip } = await import("@ai-matrx/alchemy/operate/zip");
  const zipEntries: { path: string; data: string }[] = [];
  for (const e of entries) zipEntries.push({ path: `${e.path}.${ext}`, data: await renderEntry(e, entries, source, format, appletOf) });
  return buildZip(zipEntries);
}
