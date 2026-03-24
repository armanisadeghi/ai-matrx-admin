/**
 * FlashcardsBlock — BlockPrinter
 *
 * Self-contained print logic for flashcard blocks.
 * Exported alongside the component so it travels with the block to the database.
 *
 * Variants:
 *   cut-cards     — 4-per-page grid with physical cut lines; designed to be printed, cut, and used as real cards
 *   both-sides    — 2-column grid showing front + back together (review/overview)
 *   study-sheet   — compact table (front | back) for quick reference or cramming
 *   front-only    — questions/terms only, blank backs for self-testing
 *   back-only     — answers/definitions only
 */

import { buildPrintDocument, openPrintWindow, escapeHtml, type BlockPrinter } from "@/features/chat/utils/block-print-utils";
import type { Flashcard } from "./flashcard-parser";
import type { FlashcardsBlockData } from "@/types/python-generated/content-blocks";

export type FlashcardsVariant = "landscape-duplex" | "landscape-stacked" | "cut-cards" | "both-sides" | "study-sheet" | "front-only" | "back-only";

type FlashcardsData =
    | { cards: Flashcard[] }
    | FlashcardsBlockData
    | string;

function extractCards(data: unknown): Flashcard[] {
    if (!data) return [];
    if (typeof data === "object" && data !== null && "cards" in data) {
        const cards = (data as { cards: unknown[] }).cards;
        return Array.isArray(cards) ? (cards as Flashcard[]) : [];
    }
    return [];
}

// ---------------------------------------------------------------------------
// Shared base styles — appended after block-print-utils PRINT_STYLES so these win on specificity
// ---------------------------------------------------------------------------
const BASE_STYLES = `
  h1.deck-title {
    font-size: 13pt !important;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 4px 0;
    letter-spacing: -0.01em;
    border-bottom: none !important;
  }
  h2 { border-bottom: none !important; }
  .deck-meta {
    font-size: 8.5pt;
    color: #64748b;
    margin-bottom: 16px;
  }
  .deck-header {
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }

  @media print {
    @page { margin: 14mm 12mm; }
  }
`;

// ---------------------------------------------------------------------------
// Variant: Cut-out physical cards (4 per page, front face + scissor guides)
// ---------------------------------------------------------------------------
const CUT_CARD_STYLES = `
  ${BASE_STYLES}

  .instructions {
    font-size: 8pt;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 14px;
    line-height: 1.5;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
  }

  .card-cell {
    position: relative;
    border: 1px dashed #cbd5e1;
    padding: 0;
    min-height: 120px;
  }

  /* Cut-line corner markers */
  .card-cell::before, .card-cell::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    border-color: #94a3b8;
    border-style: solid;
  }
  .card-cell::before { top: 3px; left: 3px; border-width: 1px 0 0 1px; }
  .card-cell::after  { bottom: 3px; right: 3px; border-width: 0 1px 1px 0; }

  .card-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 120px;
  }

  .card-face {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 12px 14px;
    text-align: center;
  }

  .card-front-face {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
    color: #ffffff;
    border-radius: 0;
  }
  .card-back-face {
    background: #ffffff;
    border-top: 1.5px solid #e2e8f0;
  }

  .card-side-label {
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 6px;
    opacity: 0.65;
  }
  .card-front-face .card-side-label { color: #bfdbfe; }
  .card-back-face .card-side-label  { color: #94a3b8; }

  .card-number-badge {
    position: absolute;
    top: 6px;
    right: 8px;
    font-size: 7pt;
    color: #94a3b8;
    font-weight: 600;
  }

  .front-text {
    font-size: 11pt;
    font-weight: 600;
    line-height: 1.4;
    color: #ffffff;
  }
  .front-text.long  { font-size: 9.5pt; }
  .front-text.xlong { font-size: 8.5pt; }

  .back-text {
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    white-space: pre-line;
    text-align: left;
    width: 100%;
  }
  .back-text.long  { font-size: 9pt; }
  .back-text.xlong { font-size: 8pt; }

  .fold-hint {
    font-size: 7pt;
    color: #94a3b8;
    text-align: center;
    margin-top: 10px;
    letter-spacing: 0.04em;
  }

  .page-break { page-break-before: always; }

  @media print {
    .card-front-face { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .card-cell       { page-break-inside: avoid; break-inside: avoid; }
    .instructions    { display: none; }
  }
`;

function sizeClass(text: string): string {
    const len = text.length;
    if (len > 200) return "xlong";
    if (len > 100) return "long";
    return "";
}

function renderCutCards(cards: Flashcard[], title: string): string {
    const PAGE_SIZE = 4; // cards per page
    const pages: string[] = [];

    for (let p = 0; p < Math.ceil(cards.length / PAGE_SIZE); p++) {
        const batch = cards.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);

        const cells = batch
            .map((card, i) => {
                const globalIdx = p * PAGE_SIZE + i + 1;
                const frontSize = sizeClass(card.front);
                const backSize = sizeClass(card.back ?? "");
                const backContent = (card.back ?? "")
                    .split("\n")
                    .map((line) => escapeHtml(line))
                    .join("<br>");

                return `<div class="card-cell">
  <span class="card-number-badge">#${globalIdx}</span>
  <div class="card-inner">
    <div class="card-face card-front-face">
      <div class="card-side-label">Question / Term</div>
      <div class="front-text ${frontSize}">${escapeHtml(card.front)}</div>
    </div>
    <div class="card-face card-back-face">
      <div class="card-side-label">Answer / Definition</div>
      <div class="back-text ${backSize}">${backContent}</div>
    </div>
  </div>
</div>`;
            })
            .join("\n");

        const isFirst = p === 0;
        const pageClass = isFirst ? "" : ' class="page-break"';
        pages.push(`<div${pageClass}>
${
    isFirst
        ? `<div class="deck-header">
  <h1 class="deck-title">${escapeHtml(title)}</h1>
  <div class="deck-meta">${cards.length} card${cards.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Cut along dashed lines</div>
</div>
<div class="instructions">
  ✂ Print this page, then cut along the dashed lines. Each cell is one card — front (blue) on top, answer on the bottom.
  Fold in half for a double-sided card, or cut each half separately for separate front/back cards.
</div>`
        : `<div class="deck-meta" style="margin-bottom:10px;">Cards ${p * PAGE_SIZE + 1}–${Math.min((p + 1) * PAGE_SIZE, cards.length)} of ${cards.length}</div>`
}
<div class="cards-grid">
${cells}
</div>
<div class="fold-hint">✂ cut along dashed borders · fold on the center line for double-sided cards</div>
</div>`);
    }

    return pages.join("\n");
}

// ---------------------------------------------------------------------------
// Variant: Both sides (2-column card grid, front + back visible)
// ---------------------------------------------------------------------------
const BOTH_SIDES_STYLES = `
  ${BASE_STYLES}

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .card-cell {
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .card-front {
    background: #1e293b;
    color: #f1f5f9;
    padding: 10px 14px;
    font-weight: 600;
    font-size: 10.5pt;
    line-height: 1.4;
    position: relative;
  }
  .card-front .card-number { font-size: 7.5pt; color: #64748b; margin-bottom: 4px; }
  .card-back {
    padding: 10px 14px;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    white-space: pre-line;
  }

  @media print {
    .card-front { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function renderBothSides(cards: Flashcard[], title: string): string {
    const cells = cards
        .map(
            (card, i) => `<div class="card-cell">
  <div class="card-front">
    <div class="card-number">Card ${i + 1}</div>
    ${escapeHtml(card.front)}
  </div>
  <div class="card-back">${escapeHtml(card.back ?? "")}</div>
</div>`,
        )
        .join("\n");

    return `<div class="deck-header">
  <h1 class="deck-title">${escapeHtml(title)}</h1>
  <div class="deck-meta">${cards.length} card${cards.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Front and back</div>
</div>
<div class="cards-grid">
${cells}
</div>`;
}

// ---------------------------------------------------------------------------
// Variant: Study sheet (full-width table)
// ---------------------------------------------------------------------------
const STUDY_SHEET_STYLES = `
  ${BASE_STYLES}

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    font-size: 10pt;
  }
  thead th {
    background: #1e293b;
    color: #f1f5f9;
    padding: 8px 12px;
    text-align: left;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
  thead th:first-child { width: 38%; border-radius: 0; }

  tbody tr { page-break-inside: avoid; break-inside: avoid; }
  tbody tr:nth-child(even) td { background: #f8fafc; }

  tbody td {
    padding: 8px 12px;
    vertical-align: top;
    border-bottom: 1px solid #e2e8f0;
    line-height: 1.5;
    white-space: pre-line;
  }
  tbody td:first-child {
    font-weight: 600;
    border-right: 1px solid #e2e8f0;
    color: #1e3a5f;
  }
  .row-num {
    display: inline-block;
    width: 18px;
    font-size: 8pt;
    color: #94a3b8;
    font-weight: 400;
    margin-right: 4px;
  }

  @media print {
    thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    tbody tr:nth-child(even) td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function renderStudySheet(cards: Flashcard[], title: string): string {
    const rows = cards
        .map(
            (card, i) => `  <tr>
    <td><span class="row-num">${i + 1}.</span>${escapeHtml(card.front)}</td>
    <td>${escapeHtml(card.back ?? "")}</td>
  </tr>`,
        )
        .join("\n");

    return `<div class="deck-header">
  <h1 class="deck-title">${escapeHtml(title)}</h1>
  <div class="deck-meta">${cards.length} card${cards.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Study sheet</div>
</div>
<table>
  <thead>
    <tr>
      <th>Question / Term</th>
      <th>Answer / Definition</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

// ---------------------------------------------------------------------------
// Variant: Front only (self-test — blank space for answers)
// ---------------------------------------------------------------------------
const FRONT_ONLY_STYLES = `
  ${BASE_STYLES}

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .card-cell {
    border: 1.5px solid #bfdbfe;
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    background: #fff;
  }
  .card-front {
    background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
    color: #ffffff;
    padding: 12px 14px;
    font-weight: 600;
    font-size: 10.5pt;
    line-height: 1.4;
  }
  .card-front .card-number { font-size: 7.5pt; color: #bfdbfe; margin-bottom: 4px; }
  .answer-blank {
    height: 52px;
    border-top: 1px dashed #cbd5e1;
    background: #fafafa;
    position: relative;
  }
  .answer-blank::after {
    content: "write your answer here";
    position: absolute;
    bottom: 6px;
    left: 12px;
    font-size: 7pt;
    color: #cbd5e1;
    letter-spacing: 0.04em;
  }

  @media print {
    .card-front { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function renderFrontOnly(cards: Flashcard[], title: string): string {
    const cells = cards
        .map(
            (card, i) => `<div class="card-cell">
  <div class="card-front">
    <div class="card-number">Card ${i + 1}</div>
    ${escapeHtml(card.front)}
  </div>
  <div class="answer-blank"></div>
</div>`,
        )
        .join("\n");

    return `<div class="deck-header">
  <h1 class="deck-title">${escapeHtml(title)}</h1>
  <div class="deck-meta">${cards.length} card${cards.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Self-test — write your answers in the blank space</div>
</div>
<div class="cards-grid">
${cells}
</div>`;
}

// ---------------------------------------------------------------------------
// Variant: Back only (answers / definitions)
// ---------------------------------------------------------------------------
const BACK_ONLY_STYLES = `
  ${BASE_STYLES}

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .card-cell {
    border: 1.5px solid #a7f3d0;
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    background: #fff;
  }
  .card-back-header {
    background: linear-gradient(135deg, #065f46 0%, #0f766e 100%);
    color: #ecfdf5;
    padding: 10px 14px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .card-back-content {
    padding: 10px 14px;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    white-space: pre-line;
  }

  @media print {
    .card-back-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function renderBackOnly(cards: Flashcard[], title: string): string {
    const cells = cards
        .map(
            (card, i) => `<div class="card-cell">
  <div class="card-back-header">Card ${i + 1}</div>
  <div class="card-back-content">${escapeHtml(card.back ?? "")}</div>
</div>`,
        )
        .join("\n");

    return `<div class="deck-header">
  <h1 class="deck-title">${escapeHtml(title)}</h1>
  <div class="deck-meta">${cards.length} card${cards.length !== 1 ? "s" : ""} &nbsp;·&nbsp; Answers and definitions only</div>
</div>
<div class="cards-grid">
${cells}
</div>`;
}

// ---------------------------------------------------------------------------
// Variant: Landscape cut sheet (4 cards per page, 2×2, black & white)
//
// Geometry (landscape 11" × 8.5"):
//   Page is split into 4 equal quadrants: 5.5" wide × 4.25" tall each.
//   Outer margin: 0.5" on every edge.
//   Inner gap at each cut line: 0.5" each side → 1" total dead zone at center.
//   Usable card area: (5.5 − 0.5 − 0.5)" × (4.25 − 0.5 − 0.5)" = 4.5" × 3.25"
//
// Text sizing: font-size uses vw/vh relative units so it always fills the cell.
//   `fit-text` class uses container-relative font that shrinks when content overflows
//   via a JS resize loop in the document itself.
//
// Double-sided (duplex) mirroring:
//   When a landscape sheet is flipped on the long (left→right) edge,
//   left and right columns swap. So back page layout is:
//     TL = back[1], TR = back[0], BL = back[3], BR = back[2]
// ---------------------------------------------------------------------------

const LANDSCAPE_STYLES = `
  @page { size: landscape; margin: 0; }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 11in;
    height: 8.5in;
    overflow: hidden;
    background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #000;
  }

  /* The page wrapper takes the full physical page */
  .page {
    width: 11in;
    height: 8.5in;
    position: relative;
    page-break-after: always;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 0;
    padding: 0.5in;
  }
  .page:last-child { page-break-after: auto; }

  /* Each quadrant cell — full 5.5" × 4.25" including its half-gutter */
  .quad {
    display: flex;
    align-items: stretch;
    justify-content: stretch;
    padding: 0 0.25in 0.25in 0;   /* right + bottom inner half-gutters */
  }
  /* Top row: add top inner half-gutter via bottom padding of the cell above */
  .quad.top    { padding-bottom: 0.25in; padding-top: 0; }
  .quad.bottom { padding-bottom: 0;      padding-top: 0.25in; }
  .quad.left   { padding-left: 0;  padding-right: 0.25in; }
  .quad.right  { padding-left: 0.25in; padding-right: 0; }

  /* The actual card face — fills the quad minus its padding */
  .card-face {
    flex: 1;
    border: 1.5px solid #000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.18in 0.22in;
    overflow: hidden;
    position: relative;
  }

  /* Cut-line guides on the outer page (not on card borders) */
  .cut-h {
    position: absolute;
    left: 0.25in;
    right: 0.25in;
    top: 50%;
    height: 0;
    border-top: 1px dashed #bbb;
    pointer-events: none;
  }
  .cut-v {
    position: absolute;
    top: 0.25in;
    bottom: 0.25in;
    left: 50%;
    width: 0;
    border-left: 1px dashed #bbb;
    pointer-events: none;
  }
  .cut-label {
    position: absolute;
    font-size: 6pt;
    color: #bbb;
    letter-spacing: 0.06em;
    white-space: nowrap;
  }
  .cut-label.h { top: calc(50% - 8pt); left: 0.12in; }
  .cut-label.v { left: calc(50% + 3pt); top: 0.12in; }

  /* Card number badge */
  .card-num {
    position: absolute;
    top: 5px;
    right: 7px;
    font-size: 6.5pt;
    color: #999;
    font-weight: 600;
  }

  /* Side label (FRONT / BACK) */
  .side-label {
    font-size: 6.5pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
    align-self: flex-start;
  }

  /* The text container — fills remaining space, centers content */
  .card-text {
    flex: 1;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
  }

  .card-text-inner {
    font-size: 18pt;   /* JS will shrink this if needed */
    font-weight: 600;
    line-height: 1.35;
    white-space: pre-wrap;
    word-break: break-word;
    text-align: center;
  }

  /* For multiline back content: left-align */
  .card-text-inner.multiline {
    text-align: left;
    font-size: 14pt;
    font-weight: 400;
  }

  /* Print-only: hide the browser action bar, show cut labels */
  .screen-only { }
  @media print {
    html, body { width: 11in; height: 8.5in; overflow: hidden; }
    .screen-only { display: none !important; }
  }
`;

/**
 * Shrink font JS — runs inside the printed window.
 * For each .card-text-inner, reduces font-size until the text fits its container.
 */
const FIT_TEXT_SCRIPT = `
<script>
(function() {
  function fitText(el) {
    var container = el.parentElement;
    var maxW = container.clientWidth;
    var maxH = container.clientHeight;
    var size = parseFloat(window.getComputedStyle(el).fontSize);
    var minSize = 6;
    while (size > minSize && (el.scrollWidth > maxW + 2 || el.scrollHeight > maxH + 2)) {
      size -= 0.5;
      el.style.fontSize = size + "pt";
    }
  }
  function runAll() {
    var els = document.querySelectorAll(".card-text-inner");
    for (var i = 0; i < els.length; i++) { fitText(els[i]); }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runAll);
  } else {
    runAll();
  }
})();
</script>`;

function isMultiline(text: string): boolean {
    return text.includes("\n") || text.length > 120;
}

function cardTextInner(text: string, isFront: boolean): string {
    const ml = !isFront && isMultiline(text);
    const cls = ml ? "card-text-inner multiline" : "card-text-inner";
    const escaped = escapeHtml(text).replace(/\n/g, "<br>");
    return `<div class="${cls}">${escaped}</div>`;
}

function buildCardFace(
    text: string,
    cardNum: number,
    isFront: boolean,
): string {
    const sideLabel = isFront ? "Front" : "Back";
    return `<div class="card-face">
  <span class="card-num">#${cardNum}</span>
  <span class="side-label">${sideLabel}</span>
  <div class="card-text">
    ${cardTextInner(text, isFront)}
  </div>
</div>`;
}

const QUAD_CLASSES = [
    "quad top left",
    "quad top right",
    "quad bottom left",
    "quad bottom right",
] as const;

function buildPage(
    cells: string[],   // exactly 4 strings (card HTML or empty string)
    showCutGuides: boolean,
): string {
    const guides = showCutGuides
        ? `<div class="cut-h"></div>
  <div class="cut-v"></div>
  <span class="cut-label h">✂ cut</span>
  <span class="cut-label v">✂ cut</span>`
        : "";

    return `<div class="page">
  ${guides}
  ${cells.map((c, i) => `<div class="${QUAD_CLASSES[i]}">${c}</div>`).join("\n  ")}
</div>`;
}

/**
 * landscape-duplex: alternating front/back pages.
 *   Front page  → [card1F, card2F, card3F, card4F]
 *   Back page   → [card2B, card1B, card4B, card3B]  (mirrored L↔R for duplex flip on long edge)
 *
 * landscape-stacked: all fronts first, then all backs (same column order both pages).
 */
function renderLandscape(
    cards: Flashcard[],
    title: string,
    mode: "duplex" | "stacked",
): string {
    const BATCH = 4;
    const pages: string[] = [];
    const empty = `<div class="card-face" style="border-color:#ddd;"></div>`;

    for (let p = 0; p < Math.ceil(cards.length / BATCH); p++) {
        const batch = cards.slice(p * BATCH, (p + 1) * BATCH);
        // Pad to exactly 4
        while (batch.length < BATCH) batch.push({ front: "", back: "" });

        const fronts = batch.map((c, i) =>
            c.front
                ? buildCardFace(c.front, p * BATCH + i + 1, true)
                : empty,
        );

        const backs = batch.map((c, i) =>
            c.back
                ? buildCardFace(c.back ?? "", p * BATCH + i + 1, false)
                : empty,
        );

        if (mode === "duplex") {
            // Flip on long (left/right) edge: swap columns → [1,0,3,2] index order for backs
            const backsFlipped = [backs[1], backs[0], backs[3], backs[2]];
            pages.push(buildPage(fronts, true));
            pages.push(buildPage(backsFlipped, false));
        } else {
            // stacked: all fronts page then all backs page
            pages.push(buildPage(fronts, true));
            pages.push(buildPage(backs, false));
        }
    }

    return pages.join("\n");
}

/**
 * Landscape cards need a fully custom document — no buildPrintDocument wrapper
 * because that adds max-width, padding, and chrome that fights the precise page geometry.
 */
function openLandscapeWindow(bodyHtml: string, title: string): void {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>${LANDSCAPE_STYLES}</style>
</head>
<body>
<div class="screen-only" style="font-family:sans-serif;font-size:12px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:10px;align-items:center;">
  <button onclick="window.print()" style="padding:7px 18px;background:#111;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;">Print / Save PDF</button>
  <button onclick="window.close()" style="padding:7px 14px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;cursor:pointer;">Close</button>
  <span style="color:#64748b;font-size:11px;">Tip: set your printer to <strong>Landscape</strong> with no additional margins</span>
</div>
${bodyHtml}
${FIT_TEXT_SCRIPT}
</body>
</html>`;

    const win = window.open("", "_blank", "width=1100,height=720,scrollbars=yes");
    if (!win) {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-flashcards.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}

// ---------------------------------------------------------------------------
// Helper: derive a title from the data if available
// ---------------------------------------------------------------------------
function deriveTitle(data: unknown): string {
    if (data && typeof data === "object" && "title" in data) {
        const t = (data as { title?: unknown }).title;
        if (typeof t === "string" && t.trim()) return t.trim();
    }
    return "Flashcards";
}

// ---------------------------------------------------------------------------
// Exported printer
// ---------------------------------------------------------------------------
export const flashcardsPrinter: BlockPrinter = {
    label: "Print flashcards",
    variants: [
        {
            id: "landscape-duplex",
            label: "Landscape cut sheet — duplex (double-sided)",
            description: "4 cards per page, landscape. Fronts and backs on alternating pages — backs are mirrored so they align perfectly when you flip and cut",
        },
        {
            id: "landscape-stacked",
            label: "Landscape cut sheet — all fronts then all backs",
            description: "4 cards per page, landscape. All front pages first, then all back pages — cut all sheets together for a matching deck",
        },
        {
            id: "cut-cards",
            label: "Cut-out cards (portrait)",
            description: "4 per page with cut lines — front and back shown together per card",
        },
        {
            id: "both-sides",
            label: "Both sides per card",
            description: "Front and back shown together — best for review or sharing",
        },
        {
            id: "study-sheet",
            label: "Study sheet (table)",
            description: "Compact two-column table — all cards on one or two pages",
        },
        {
            id: "front-only",
            label: "Questions only (self-test)",
            description: "Front side with blank space to write answers — print and quiz yourself",
        },
        {
            id: "back-only",
            label: "Answers only",
            description: "Definitions / answers without the questions",
        },
    ],

    print(data: unknown, variantId: string = "landscape-duplex") {
        const cards = extractCards(data);
        const title = deriveTitle(data);

        if (cards.length === 0) {
            openPrintWindow(
                buildPrintDocument("<p>No flashcard data available to print.</p>", title, BASE_STYLES),
                "flashcards",
            );
            return;
        }

        // Landscape variants use a fully custom document (precise page geometry)
        if (variantId === "landscape-duplex") {
            openLandscapeWindow(renderLandscape(cards, title, "duplex"), title);
            return;
        }
        if (variantId === "landscape-stacked") {
            openLandscapeWindow(renderLandscape(cards, title, "stacked"), title);
            return;
        }

        let bodyHtml: string;
        let styles: string;

        switch (variantId as FlashcardsVariant) {
            case "cut-cards":
                bodyHtml = renderCutCards(cards, title);
                styles = CUT_CARD_STYLES;
                break;
            case "front-only":
                bodyHtml = renderFrontOnly(cards, title);
                styles = FRONT_ONLY_STYLES;
                break;
            case "back-only":
                bodyHtml = renderBackOnly(cards, title);
                styles = BACK_ONLY_STYLES;
                break;
            case "study-sheet":
                bodyHtml = renderStudySheet(cards, title);
                styles = STUDY_SHEET_STYLES;
                break;
            case "both-sides":
            default:
                bodyHtml = renderBothSides(cards, title);
                styles = BOTH_SIDES_STYLES;
                break;
        }

        openPrintWindow(buildPrintDocument(bodyHtml, title, styles), "flashcards");
    },
};
