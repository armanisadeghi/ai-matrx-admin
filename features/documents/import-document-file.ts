/**
 * A file from the person's computer -> a new document (Word .docx, Markdown,
 * plain text, HTML). Everything lands as markdown first and goes through THE
 * one writer (`markdownToUniverDoc`), so headings, bold, italic, links and
 * lists keep their shape. Parse first: a file we cannot read never leaves an
 * empty document behind.
 */
"use client";

import { readZip } from "@ai-matrx/alchemy/operate/zip";

import { createDocument, saveDocumentSnapshot, deleteDocument } from "@/features/documents/document-service";
import { deriveDocumentName, markdownToUniverDoc } from "@/features/documents/markdown-to-univer-doc";
import { sanitizeUniverDocSnapshot } from "@/features/documents/utils/sanitizeUniverDocSnapshot";

export const DOCUMENT_UPLOAD_ACCEPT = ".docx,.md,.markdown,.txt,.html,.htm";

type Source = "imported_docx" | "imported_md" | "imported_txt";

export function documentFileKind(name: string): "docx" | "md" | "txt" | "html" | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "docx") return "docx";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "txt") return "txt";
  if (ext === "html" || ext === "htm") return "html";
  return null;
}

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** Word's document.xml -> markdown: headings, bold/italic runs, list paragraphs, tables as rows. */
export function docxXmlToMarkdown(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("This Word file has no document body.");
  const attr = (el: Element | undefined, name: string) => el?.getAttributeNS(W, name) ?? el?.getAttribute(`w:${name}`) ?? null;
  const first = (el: Element, name: string) => el.getElementsByTagNameNS(W, name)[0] as Element | undefined;
  const on = (props: Element | undefined, name: string) => {
    const el = props ? first(props, name) : undefined;
    return !!el && attr(el, "val") !== "0" && attr(el, "val") !== "false";
  };
  const paragraph = (p: Element): string => {
    let text = "";
    for (const r of Array.from(p.getElementsByTagNameNS(W, "r"))) {
      const t = Array.from(r.childNodes)
        .map((n) => {
          const el = n as Element;
          if (el.localName === "t") return el.textContent ?? "";
          if (el.localName === "tab") return "\t";
          if (el.localName === "br") return "  \n";
          return "";
        })
        .join("");
      if (!t) continue;
      const rPr = first(r, "rPr");
      const bold = on(rPr, "b");
      const italic = on(rPr, "i");
      const lead = t.match(/^\s*/)?.[0] ?? "";
      const trail = t.match(/\s*$/)?.[0] ?? "";
      const core = t.trim();
      text += core ? `${lead}${bold ? "**" : ""}${italic ? "*" : ""}${core}${italic ? "*" : ""}${bold ? "**" : ""}${trail}` : t;
    }
    const pPr = first(p, "pPr");
    const style = attr(pPr ? first(pPr, "pStyle") : undefined, "val") ?? "";
    const heading = style.match(/^(?:Heading|heading)\s?(\d)$/)?.[1] ?? (style === "Title" ? "1" : null);
    if (heading && text.trim()) return `${"#".repeat(Math.min(6, Number(heading)))} ${text.replace(/\*+/g, "").trim()}`;
    if (pPr && first(pPr, "numPr") && text.trim()) {
      const level = Number(attr(first(first(pPr, "numPr")!, "ilvl"), "val") ?? 0);
      return `${"  ".repeat(level)}- ${text.trim()}`;
    }
    return text;
  };
  const out: string[] = [];
  for (const child of Array.from(body.children)) {
    if (child.localName === "p") out.push(paragraph(child));
    else if (child.localName === "tbl") {
      const rows = Array.from(child.getElementsByTagNameNS(W, "tr")).map((tr) =>
        Array.from(tr.getElementsByTagNameNS(W, "tc")).map((tc) =>
          Array.from(tc.getElementsByTagNameNS(W, "p")).map(paragraph).join(" ").replace(/\|/g, "\\|").trim(),
        ),
      );
      if (rows.length) {
        out.push("", `| ${rows[0].join(" | ")} |`, `|${" --- |".repeat(rows[0].length)}`);
        for (const row of rows.slice(1)) out.push(`| ${row.join(" | ")} |`);
        out.push("");
      }
    }
  }
  // A list run stays tight; everything else is its own block.
  return out
    .reduce<string[]>((acc, line, i) => {
      const prevList = /^\s*- /.test(out[i - 1] ?? "");
      if (i > 0 && !(prevList && /^\s*- /.test(line))) acc.push("");
      acc.push(line);
      return acc;
    }, [])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** HTML -> markdown for the blocks a document keeps (headings, paragraphs, lists, emphasis, links). */
export function htmlToDocumentMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const inline = (node: Node): string => {
    if (node.nodeType === 3) return (node.textContent ?? "").replace(/\s+/g, " ");
    if (node.nodeType !== 1) return "";
    const el = node as Element;
    const inner = Array.from(el.childNodes).map(inline).join("");
    switch (el.tagName.toLowerCase()) {
      case "strong":
      case "b":
        return inner.trim() ? `**${inner.trim()}**` : "";
      case "em":
      case "i":
        return inner.trim() ? `*${inner.trim()}*` : "";
      case "a": {
        const href = el.getAttribute("href");
        return href && /^https?:|^mailto:/i.test(href) ? `[${inner.trim()}](${href})` : inner;
      }
      case "br":
        return "  \n";
      case "code":
        return `\`${inner}\``;
      default:
        return inner;
    }
  };
  const out: string[] = [];
  const block = (el: Element, depth = 0): void => {
    const tag = el.tagName.toLowerCase();
    const h = tag.match(/^h([1-6])$/);
    if (h) {
      out.push(`${"#".repeat(Number(h[1]))} ${inline(el).trim()}`);
      return;
    }
    if (tag === "p" || tag === "blockquote") {
      out.push(inline(el).trim());
      return;
    }
    if (tag === "pre") {
      out.push("```", el.textContent ?? "", "```");
      return;
    }
    if (tag === "ul" || tag === "ol") {
      Array.from(el.children).forEach((li, n) => {
        if (li.tagName.toLowerCase() !== "li") return;
        const own = Array.from(li.childNodes).filter((c) => !(c.nodeType === 1 && /^(ul|ol)$/i.test((c as Element).tagName)));
        out.push(`${"  ".repeat(depth)}${tag === "ol" ? `${n + 1}.` : "-"} ${own.map(inline).join("").trim()}`);
        Array.from(li.children)
          .filter((c) => /^(ul|ol)$/i.test(c.tagName))
          .forEach((c) => block(c, depth + 1));
      });
      return;
    }
    if (tag === "script" || tag === "style" || tag === "head") return;
    const kids = Array.from(el.children);
    if (kids.length === 0) {
      const t = inline(el).trim();
      if (t) out.push(t);
      return;
    }
    kids.forEach((k) => block(k, depth));
  };
  block(doc.body);
  return out
    .map((l) => l.replace(/\s+$/, ""))
    .reduce<string[]>((acc, line, i) => {
      const list = (s: string | undefined) => /^\s*(-|\d+\.) /.test(s ?? "");
      if (i > 0 && !(list(out[i - 1]) && list(line))) acc.push("");
      acc.push(line);
      return acc;
    }, [])
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function documentFileToMarkdown(file: File): Promise<{ markdown: string; source: Source }> {
  const kind = documentFileKind(file.name);
  if (kind === "docx") {
    const zip = await readZip(file);
    const entry = zip.get("word/document.xml");
    if (!entry) throw new Error("This is not a Word document (.docx).");
    const xml = await entry.text();
    return { markdown: docxXmlToMarkdown(xml), source: "imported_docx" };
  }
  const text = await file.text();
  if (kind === "md") return { markdown: text, source: "imported_md" };
  if (kind === "html") return { markdown: htmlToDocumentMarkdown(text), source: "imported_md" };
  if (kind === "txt") {
    // Plain text: each line is its own paragraph; nothing in it is read as markdown.
    const escaped = text
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((l) => l.replace(/([\\`*_[\]#>|~])/g, "\\$1"))
      .join("\n\n");
    return { markdown: escaped, source: "imported_txt" };
  }
  throw new Error("Upload a Word (.docx), Markdown, text or HTML file.");
}

/** Create a document from an uploaded file; returns its id. */
export async function importDocumentFile(file: File, organizationId: string): Promise<{ id: string; name: string }> {
  const { markdown, source } = await documentFileToMarkdown(file);
  const name = file.name.replace(/\.[^.]+$/, "").trim() || deriveDocumentName(markdown);
  const created = await createDocument({ name, source, organizationId, description: `Imported from ${file.name}` });
  if (!created.success) throw new Error(`Could not create the document: ${created.error}`);
  const id = created.data.id;
  const snapshot = sanitizeUniverDocSnapshot(markdownToUniverDoc(markdown, name), id);
  const saved = await saveDocumentSnapshot({ documentId: id, snapshot, origin: "imported", label: `Imported from ${file.name}` });
  if (!saved.success) {
    await deleteDocument(id);
    throw new Error(`Could not save the imported content: ${saved.error}`);
  }
  return { id, name };
}
