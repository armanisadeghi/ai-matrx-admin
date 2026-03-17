/**
 * FlashcardsBlock — BlockPrinter
 *
 * Self-contained print logic for flashcard blocks.
 * Exported alongside the component so it travels with the block to the database.
 */

import { buildPrintDocument, openPrintWindow, escapeHtml, type BlockPrinter } from "@/features/chat/utils/block-print-utils";
import type { Flashcard } from "./flashcard-parser";
import type { FlashcardsBlockData } from "@/types/python-generated/content-blocks";

export type FlashcardsVariant = "front-only" | "back-only" | "both-sides" | "study-sheet";

type FlashcardsData =
    | { cards: Flashcard[] }
    | FlashcardsBlockData
    | string; // raw content string — will print a generic message

function extractCards(data: unknown): Flashcard[] {
    if (!data) return [];
    if (typeof data === "object" && data !== null && "cards" in data) {
        const cards = (data as { cards: unknown[] }).cards;
        return Array.isArray(cards) ? (cards as Flashcard[]) : [];
    }
    return [];
}

const CARD_STYLES = `
  .flashcard-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin-top: 16px;
  }
  .flashcard-card {
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    page-break-inside: avoid;
    background: #fff;
  }
  .flashcard-front {
    background: #1e293b;
    color: #f1f5f9;
    padding: 12px 14px;
    font-weight: 600;
    font-size: 10.5pt;
    line-height: 1.4;
  }
  .flashcard-back {
    padding: 12px 14px;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: #fff;
    border-top: 1px solid #e2e8f0;
  }
  .flashcard-single {
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .flashcard-label {
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #64748b;
    margin-bottom: 4px;
  }
  .flashcard-text { font-size: 10.5pt; line-height: 1.5; }
  .card-number {
    font-size: 8pt;
    color: #94a3b8;
    margin-bottom: 6px;
  }

  /* Study sheet: full-width rows */
  .study-sheet-row {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0;
    border: 1px solid #e2e8f0;
    margin-bottom: 6px;
    border-radius: 6px;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .study-front {
    background: #f1f5f9;
    padding: 8px 12px;
    font-weight: 600;
    font-size: 10pt;
    border-right: 1px solid #e2e8f0;
  }
  .study-back {
    padding: 8px 12px;
    font-size: 10pt;
  }

  @media print {
    .flashcard-front { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .flashcard-single { page-break-inside: avoid; }
  }
`;

function renderFrontOnly(cards: Flashcard[]): string {
    return `<h2>${cards.length} Flashcard${cards.length !== 1 ? "s" : ""} — Front Side</h2>
<div class="flashcard-grid">
${cards
    .map(
        (card, i) => `  <div class="flashcard-card">
    <div class="flashcard-front">
      <div class="card-number">Card ${i + 1}</div>
      ${escapeHtml(card.front)}
    </div>
  </div>`
    )
    .join("\n")}
</div>`;
}

function renderBackOnly(cards: Flashcard[]): string {
    return `<h2>${cards.length} Flashcard${cards.length !== 1 ? "s" : ""} — Back Side</h2>
<div class="flashcard-grid">
${cards
    .map(
        (card, i) => `  <div class="flashcard-card">
    <div class="flashcard-front" style="background:#0f766e;">
      <div class="card-number" style="color:#99f6e4;">Card ${i + 1}</div>
      ${escapeHtml(card.back ?? "")}
    </div>
  </div>`
    )
    .join("\n")}
</div>`;
}

function renderBothSides(cards: Flashcard[]): string {
    return `<h2>${cards.length} Flashcard${cards.length !== 1 ? "s" : ""}</h2>
<div class="flashcard-grid">
${cards
    .map(
        (card, i) => `  <div class="flashcard-card">
    <div class="flashcard-front">
      <div class="card-number">Card ${i + 1}</div>
      ${escapeHtml(card.front)}
    </div>
    <div class="flashcard-back">${escapeHtml(card.back ?? "")}</div>
  </div>`
    )
    .join("\n")}
</div>`;
}

function renderStudySheet(cards: Flashcard[]): string {
    return `<h2>Study Sheet — ${cards.length} Card${cards.length !== 1 ? "s" : ""}</h2>
<div style="margin-top:12px;">
  <div class="study-sheet-row" style="background:#1e293b;color:#f1f5f9;font-weight:700;font-size:9pt;">
    <div class="study-front" style="background:#1e293b;color:#f1f5f9;border-right-color:#334155;">Concept / Question</div>
    <div class="study-back" style="color:#f1f5f9;">Answer / Explanation</div>
  </div>
${cards
    .map(
        (card) => `  <div class="study-sheet-row">
    <div class="study-front">${escapeHtml(card.front)}</div>
    <div class="study-back">${escapeHtml(card.back ?? "")}</div>
  </div>`
    )
    .join("\n")}
</div>`;
}

export const flashcardsPrinter: BlockPrinter = {
    label: "Print flashcards",
    variants: [
        {
            id: "both-sides",
            label: "Both sides per card",
            description: "Front and back shown for each card (default)",
        },
        {
            id: "front-only",
            label: "Front side only",
            description: "Questions / terms only — good for self-testing",
        },
        {
            id: "back-only",
            label: "Back side only",
            description: "Answers / definitions only",
        },
        {
            id: "study-sheet",
            label: "Study sheet",
            description: "Compact table with all cards in two columns",
        },
    ],
    print(data: unknown, variantId: string = "both-sides") {
        const cards = extractCards(data);
        if (cards.length === 0) {
            openPrintWindow(
                buildPrintDocument(
                    "<p>No flashcard data available to print.</p>",
                    "Flashcards",
                    CARD_STYLES
                ),
                "flashcards"
            );
            return;
        }

        let bodyHtml: string;
        switch (variantId as FlashcardsVariant) {
            case "front-only":
                bodyHtml = renderFrontOnly(cards);
                break;
            case "back-only":
                bodyHtml = renderBackOnly(cards);
                break;
            case "study-sheet":
                bodyHtml = renderStudySheet(cards);
                break;
            case "both-sides":
            default:
                bodyHtml = renderBothSides(cards);
                break;
        }

        openPrintWindow(
            buildPrintDocument(bodyHtml, "Flashcards", CARD_STYLES),
            "flashcards"
        );
    },
};
