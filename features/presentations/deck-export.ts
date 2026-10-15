"use client";

/**
 * A deck's downloads — PowerPoint, PDF, HTML — through the existing presentation exporters and the
 * kit/Alchemy doors. PDF draws every slide with the real renderer (SlideView on paper) so the file
 * matches the editor, then hands the elements to the Alchemy capture engine.
 */

import type { FileDownload } from "@/features/file-actions/types";
import type { PresentationData } from "@/components/mardown-display/blocks/presentations/Slideshow";
import { slideSizeOf, slideStage } from "@/components/mardown-display/blocks/presentations/slide-size";
import { resolveDeckTheme } from "@/components/mardown-display/blocks/presentations/presets";
import { slideSurface } from "@/components/mardown-display/blocks/presentations/slide-surface";
import type { Deck } from "./deck-model";

function asPresentationData(deck: Deck): PresentationData {
  return { slides: deck.slides, theme: deck.theme ?? null, slideSize: deck.slideSize ?? null };
}

function safeName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "presentation";
}

export async function downloadDeckAsPptx(deck: Deck, name: string): Promise<void> {
  const { exportToPowerPoint } = await import("@/components/mardown-display/blocks/presentations/presentation-export");
  const res = await exportToPowerPoint(asPresentationData(deck), { filename: safeName(name) });
  if (!res.success) throw new Error(res.error ?? res.message);
}

/** The deck as the same .pptx the download makes, base64 for the Google Slides upload. */
export async function deckAsPptxBase64(deck: Deck, name: string): Promise<string> {
  const { exportToPowerPoint } = await import("@/components/mardown-display/blocks/presentations/presentation-export");
  const res = await exportToPowerPoint(asPresentationData(deck), { filename: safeName(name), returnBlob: true });
  if (!res.success || !res.blob) throw new Error(res.error ?? res.message);
  const bytes = new Uint8Array(await res.blob.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export async function downloadDeckAsHtml(deck: Deck, name: string): Promise<void> {
  const [{ generatePresentationHTML }, { downloadFile }] = await Promise.all([
    import("@/components/mardown-display/blocks/presentations/presentation-html-generator"),
    import("@ai-matrx/kit/download"),
  ]);
  const html = generatePresentationHTML(asPresentationData(deck));
  downloadFile(`${safeName(name)}.html`, new Blob([html], { type: "text/html" }), "text/html");
}

/** Draws every slide with the real renderer (SlideView on paper) into a host; `done()` unmounts it. */
async function renderDeckSlides(deck: Deck, hostStyle: Partial<CSSStyleDeclaration>) {
  const [{ createRoot }, { createElement }, { flushSync }, paper] = await Promise.all([
    import("react-dom/client"),
    import("react"),
    import("react-dom"),
    import("./slide-paper"),
  ]);
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, hostStyle);
  document.body.appendChild(host);
  const stage = slideStage(slideSizeOf(deck));
  const roots: ReturnType<typeof createRoot>[] = [];
  const background = slideSurface(resolveDeckTheme(deck.theme ?? undefined)).background;
  const elements: HTMLElement[] = [];
  for (const [slideIndex, slide] of deck.slides.entries()) {
    const el = document.createElement("div");
    Object.assign(el.style, { width: `${stage.width}px`, height: `${stage.height}px`, background });
    host.appendChild(el);
    const root = createRoot(el);
    roots.push(root);
    flushSync(() => root.render(createElement(paper.PaperSlide, { deck, slide, slideNumber: slideIndex + 1, className: "h-full w-full" })));
    elements.push(el);
  }
  // ScaledSlide measures after mount, and images resolve async: give both a beat.
  await new Promise((r) => setTimeout(r, 600));
  const done = () => {
    for (const r of roots) r.unmount();
    host.remove();
  };
  return { host, elements, background, stage, done };
}

export async function downloadDeckAsPdf(deck: Deck, name: string): Promise<void> {
  if (deck.slides.length === 0) throw new Error("This presentation has no slides yet");
  const [{ exportToPDF }, rendered] = await Promise.all([
    import("@/components/mardown-display/blocks/presentations/presentation-export"),
    renderDeckSlides(deck, { position: "fixed", left: "-10000px", top: "0", width: `${slideStage(slideSizeOf(deck)).width}px` }),
  ]);
  try {
    const res = await exportToPDF(rendered.elements, safeName(name), { quality: 2, backgroundColor: rendered.background, slideSize: slideSizeOf(deck) });
    if (!res.success) throw new Error(res.error ?? res.message);
  } finally {
    rendered.done();
  }
}

/** Every slide's text, in order, as a .txt file (a slide per paragraph block, numbered). */
export async function downloadDeckAsText(deck: Deck, name: string): Promise<void> {
  if (deck.slides.length === 0) throw new Error("This presentation has no slides yet");
  const [{ downloadFile }, { deckPlainText }] = await Promise.all([import("@ai-matrx/kit/download"), import("./deck-model")]);
  const text = deck.slides
    .map((slide, i) => `Slide ${i + 1}\n${deckPlainText({ ...deck, slides: [slide] })}`)
    .join("\n\n");
  downloadFile(`${safeName(name)}.txt`, new Blob([text], { type: "text/plain" }), "text/plain");
}

/** Print the deck: every slide on its own page of the deck's slide size, through the browser's print dialog. */
export async function printDeck(deck: Deck): Promise<void> {
  if (deck.slides.length === 0) throw new Error("This presentation has no slides yet");
  const rendered = await renderDeckSlides(deck, {});
  const style = document.createElement("style");
  style.textContent = `@page{size:${rendered.stage.width}px ${rendered.stage.height}px;margin:0}
@media screen{[data-deck-print-host]{position:fixed;left:-10000px;top:0}}
@media print{body>*:not([data-deck-print-host]){display:none!important}
[data-deck-print-host]>div{break-after:page;page-break-after:always;overflow:hidden}
[data-deck-print-host]>div:last-child{break-after:auto;page-break-after:auto}}`;
  rendered.host.setAttribute("data-deck-print-host", "");
  document.head.appendChild(style);
  attachPrintCleanup(() => {
    style.remove();
    rendered.done();
  });
  window.print();
}

/** Longest the offscreen print host may outlive `window.print()` when no afterprint ever fires. */
export const PRINT_CLEANUP_FALLBACK_MS = 60_000;

/**
 * Runs `cleanup` exactly once, on whichever comes first: `afterprint`, the tab becoming visible again
 * (a print dialog that closed without the event, e.g. a cancelled iOS/Safari sheet), or a timeout.
 * Without the fallbacks the offscreen host and the print style leak for the life of the page.
 */
export function attachPrintCleanup(cleanup: () => void, timeoutMs = PRINT_CLEANUP_FALLBACK_MS): () => void {
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const once = () => {
    if (done) return;
    done = true;
    window.removeEventListener("afterprint", once);
    document.removeEventListener("visibilitychange", onVisible);
    if (timer) clearTimeout(timer);
    cleanup();
  };
  const onVisible = () => {
    // Give afterprint a beat to win; visibility returning means the dialog is gone either way.
    if (document.visibilityState === "visible") setTimeout(once, 1000);
  };
  window.addEventListener("afterprint", once);
  document.addEventListener("visibilitychange", onVisible);
  timer = setTimeout(once, timeoutMs);
  return once;
}

/** The File menu / list menu downloads for a deck (a loader keeps the list cheap: the deck loads on click). */
export function deckDownloads(loadDeck: () => Promise<Deck>, name: string): FileDownload[] {
  return [
    { label: "PowerPoint (.pptx)", run: async () => downloadDeckAsPptx(await loadDeck(), name) },
    { label: "PDF", run: async () => downloadDeckAsPdf(await loadDeck(), name) },
    { label: "Web page (.html)", run: async () => downloadDeckAsHtml(await loadDeck(), name) },
  ];
}
