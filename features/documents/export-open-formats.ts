/**
 * File → Download → EPUB / OpenDocument (.odt) / Rich Text (.rtf).
 *   EPUB    the print package's EPUB engine, straight from the live text.
 *   ODT/RTF the same engine writes the .docx, then aidream's LibreOffice route
 *           (`POST /office/convert-document`) converts it. Nothing is stored.
 * Engine, converter and saver are injected so the forcing test runs the real logic.
 */

export type OpenFormat = "epub" | "odt" | "rtf";

export const OPEN_FORMATS: Record<OpenFormat, { label: string; extension: string; mime: string }> = {
  epub: { label: "EPUB", extension: "epub", mime: "application/epub+zip" },
  odt: { label: "OpenDocument", extension: "odt", mime: "application/vnd.oasis.opendocument.text" },
  rtf: { label: "Rich Text", extension: "rtf", mime: "application/rtf" },
};

export interface OpenFormatDeps {
  engine: (markdown: string, format: "docx" | "epub", fileName: string) => Promise<{ bytes: Uint8Array; fileName: string }>;
  convert: (docx: Uint8Array, fileName: string, target: "odt" | "rtf") => Promise<Uint8Array>;
  save: (fileName: string, bytes: Uint8Array, mime: string) => void;
}

function baseName(title: string | null | undefined): string {
  const base = (title ?? "").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  return base || "document";
}

export async function exportOpenFormat(markdown: string, format: OpenFormat, title: string | null | undefined, deps: OpenFormatDeps): Promise<string> {
  const name = baseName(title);
  const spec = OPEN_FORMATS[format];
  const fileName = `${name}.${spec.extension}`;
  if (format === "epub") {
    const out = await deps.engine(markdown, "epub", name);
    deps.save(fileName, out.bytes, spec.mime);
    return fileName;
  }
  const docx = await deps.engine(markdown, "docx", name);
  const bytes = await deps.convert(docx.bytes, docx.fileName, format);
  if (!bytes.byteLength) throw new Error(`The ${spec.label} converter returned an empty file.`);
  deps.save(fileName, bytes, spec.mime);
  return fileName;
}

export async function downloadOpenFormat(markdown: string, format: OpenFormat, title: string | null | undefined): Promise<string> {
  return exportOpenFormat(markdown, format, title, {
    engine: async (md, fmt, fileName) => {
      const { exportDocument } = await import("@ai-matrx/print/document");
      const exp = await exportDocument(md, fmt, { fileName });
      return { bytes: exp.bytes, fileName: exp.fileName };
    },
    convert: async (docx, fileName, target) => {
      const { requestRaw } = await import("@/lib/python-client");
      const form = new FormData();
      form.append("file", new Blob([docx as BlobPart]), fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
      form.append("target", target);
      const res = await requestRaw("/office/convert-document", { method: "POST", body: form });
      return new Uint8Array(await res.arrayBuffer());
    },
    save: (fileName, bytes, mime) => {
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    },
  });
}
