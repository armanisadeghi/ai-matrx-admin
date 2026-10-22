"use client";

/**
 * The PDF pages for `DocumentPrintPreview` in browsers that cannot show a PDF
 * inline (Chrome with "Download PDFs" on, Android, touch devices). There the
 * package's PDF frame paints only a file name and an Open button, so the
 * preview draws pages with the canonical `PdfDocumentViewer` (`@ai-matrx/media/viewers/pdf`) and
 * prints by rasterising each page into a print-only frame.
 */

import dynamic from "next/dynamic";

const PdfDocumentViewer = dynamic(() => import("@ai-matrx/media/viewers/pdf").then((m) => ({ default: m.PdfDocumentViewer })), {
  ssr: false,
  loading: () => <p className="p-8 text-center text-xs text-muted-foreground">Laying out pages…</p>,
});

export function renderDocumentPdfPages(pdfUrl: string) {
  return <PdfDocumentViewer blobUrl={pdfUrl} fileName="Document.pdf" />;
}

/** Print resolution for rasterised pages: 200 DPI against PDF's 72. */
const PRINT_SCALE = 200 / 72;

export async function printDocumentPdfPages(pdfUrl: string): Promise<void> {
  // The package's one PDF.js door: same pdfjs instance and worker as the viewer.
  const { rasterizePdfPages } = await import("@ai-matrx/media/viewers/pdf");
  const { pages, firstPageSizePt } = await rasterizePdfPages(pdfUrl, { scale: PRINT_SCALE, intent: "print" });
  const pageSize = firstPageSizePt ? `${firstPageSizePt.width}pt ${firstPageSizePt.height}pt` : "";
  const pageUrls = pages.map((blob) => URL.createObjectURL(blob));

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const cleanup = () => {
    frame.remove();
    for (const url of pageUrls) URL.revokeObjectURL(url);
  };
  const win = frame.contentWindow;
  if (!win) {
    cleanup();
    throw new Error("Printing is blocked in this browser.");
  }
  win.document.open();
  win.document.write(
    `<!doctype html><html><head><title>Document</title><style>` +
      `@page{size:${pageSize};margin:0}html,body{margin:0;padding:0}` +
      `img{display:block;width:100%;height:auto;break-after:page}img:last-child{break-after:auto}` +
      `</style></head><body>${pageUrls.map((u) => `<img src="${u}" alt="">`).join("")}</body></html>`,
  );
  win.document.close();
  await Promise.all(
    Array.from(win.document.images, (img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve, reject) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => reject(new Error("A page could not be prepared for printing.")), { once: true });
          }),
    ),
  ).catch((err: unknown) => {
    cleanup();
    throw err;
  });
  // Mobile print() returns before the system sheet has read the frame, and
  // afterprint may fire early, so the frame outlives it.
  win.addEventListener("afterprint", () => setTimeout(cleanup, 60_000), { once: true });
  win.focus();
  win.print();
}
