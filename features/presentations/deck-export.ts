"use client";

/**
 * A deck's downloads — PowerPoint, PDF, HTML — through the existing presentation exporters and the
 * kit/Alchemy doors. PDF draws every slide with the real renderer (SlideView on paper) so the file
 * matches the editor, then hands the elements to the Alchemy capture engine.
 */

import type { FileDownload } from "@/features/file-actions/types";
import type { PresentationData } from "@/components/mardown-display/blocks/presentations/Slideshow";
import { SLIDE_STAGE } from "@/components/mardown-display/blocks/presentations/ScaledSlide";
import type { Deck } from "./deck-model";

function asPresentationData(deck: Deck): PresentationData {
  return { slides: deck.slides, theme: deck.theme ?? null };
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "presentation";
}

export async function downloadDeckAsPptx(deck: Deck, name: string): Promise<void> {
  const { exportToPowerPoint } = await import("@/components/mardown-display/blocks/presentations/presentation-export");
  const res = await exportToPowerPoint(asPresentationData(deck), { filename: safeName(name) });
  if (!res.success) throw new Error(res.error ?? res.message);
}

export async function downloadDeckAsHtml(deck: Deck, name: string): Promise<void> {
  const [{ generatePresentationHTML }, { downloadFile }] = await Promise.all([
    import("@/components/mardown-display/blocks/presentations/presentation-html-generator"),
    import("@ai-matrx/kit/download"),
  ]);
  const html = generatePresentationHTML(asPresentationData(deck));
  downloadFile(`${safeName(name)}.html`, new Blob([html], { type: "text/html" }), "text/html");
}

export async function downloadDeckAsPdf(deck: Deck, name: string): Promise<void> {
  if (deck.slides.length === 0) throw new Error("This presentation has no slides yet");
  const [{ createRoot }, { createElement }, { flushSync }, paper, { exportToPDF }] = await Promise.all([
    import("react-dom/client"),
    import("react"),
    import("react-dom"),
    import("./slide-paper"),
    import("@/components/mardown-display/blocks/presentations/presentation-export"),
  ]);
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, { position: "fixed", left: "-10000px", top: "0", width: `${SLIDE_STAGE.width}px` });
  document.body.appendChild(host);
  const roots: ReturnType<typeof createRoot>[] = [];
  try {
    const elements: HTMLElement[] = [];
    for (const slide of deck.slides) {
      const el = document.createElement("div");
      Object.assign(el.style, { width: `${SLIDE_STAGE.width}px`, height: `${SLIDE_STAGE.height}px`, background: "#ffffff" });
      host.appendChild(el);
      const root = createRoot(el);
      roots.push(root);
      flushSync(() =>
        root.render(
          createElement(paper.PaperSlide, {
            deck,
            slide,
            className: "h-full w-full",
          }),
        ),
      );
      elements.push(el);
    }
    // ScaledSlide measures after mount, and images resolve async: give both a beat.
    await new Promise((r) => setTimeout(r, 600));
    const res = await exportToPDF(elements, safeName(name), { quality: 2 });
    if (!res.success) throw new Error(res.error ?? res.message);
  } finally {
    for (const r of roots) r.unmount();
    host.remove();
  }
}

/** The File menu / list menu downloads for a deck (a loader keeps the list cheap: the deck loads on click). */
export function deckDownloads(loadDeck: () => Promise<Deck>, name: string): FileDownload[] {
  return [
    { label: "PowerPoint (.pptx)", run: async () => downloadDeckAsPptx(await loadDeck(), name) },
    { label: "PDF", run: async () => downloadDeckAsPdf(await loadDeck(), name) },
    { label: "Web page (.html)", run: async () => downloadDeckAsHtml(await loadDeck(), name) },
  ];
}
