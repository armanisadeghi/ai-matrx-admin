# Block-Aware Print / PDF System

## What this is

A three-tier print system for AI response messages. Every block type can provide its own print logic. The system degrades gracefully — if a block doesn't declare a printer, Tier 2 DOM capture handles it automatically.

---

## How it works

### The three tiers

```
Tier 1 — Quick Print (prose only)
  MessageOptionsMenu → "Print / Save PDF"
  printMarkdownContent() → regex → styled HTML window
  Good for: prose, lists, tables, code blocks
  Blind to: all custom blocks

Tier 2 — Full Message Print (everything)
  MessageOptionsMenu → "Full Print (all blocks)"
  useDomCapturePrint() → html2canvas → jsPDF
  Captures the actual rendered DOM of the entire message
  Cost: heavier (screenshot pipeline)

Tier 3 — Per-Block Print (best quality)
  Print button in each block's own header
  Block controls its own HTML, its own variants, its own CSS
  PrintOptionsDialog lets users choose variant or accept defaults
  Falls back to Tier 2 DOM capture if no printer declared
```

### The BlockPrinter contract

Each block that wants its own print logic exports a single `BlockPrinter` object alongside its component. This is the entire API surface the host system touches:

```typescript
export interface BlockPrinter {
    label: string;               // button tooltip
    variants: PrintVariant[];    // [] = no dialog, print immediately
    print: (data: unknown, variantId?: string) => void | Promise<void>;
}
```

The host never inspects what's inside `print()`. This is what makes the system future-proof — when blocks migrate to the database, the printer travels with the block code and the host requires zero changes.

### File locations

```
features/chat/utils/
  block-print-utils.ts          BlockPrinter interface + buildPrintDocument() + openPrintWindow() + escapeHtml()
  dom-capture-print-utils.ts    captureToPDF() using html2canvas + jsPDF
  dom-capture-block-printer.ts  captureBlockElement() helper for DOM-capture blocks
  markdown-print-utils.ts       Tier 1 regex-based markdown → HTML (prose only)

features/chat/hooks/
  useDomCapturePrint.ts         Tier 2 hook: captureRef + captureAsPDF() for message-level capture

features/chat/components/print/
  PrintOptionsDialog.tsx         Shared variant-picker UI (Dialog desktop / Drawer mobile)
  BLOCK-PRINTER-GUIDE.md        Step-by-step instructions for adding a printer to any block
  README.md                     This file
```

### Which blocks have printers today

| Block | Strategy | Variants |
|---|---|---|
| FlashcardsBlock | HTML template | Both sides, front only, back only, study sheet |
| MultipleChoiceQuiz | HTML template | Student blank, with answers, answer key |
| MathProblemBlock | HTML template | Problem only, with solution |
| TimelineBlock | DOM capture | — |
| ComparisonTableBlock | DOM capture | — |
| DecisionTreeBlock | DOM capture | — |
| InteractiveDiagramBlock | DOM capture | — |
| cookingRecipeDisplay | DOM capture | — |
| ProgressTrackerBlock | DOM capture | — |
| TroubleshootingBlock | DOM capture | — |
| ResearchBlock | DOM capture | — |
| ResourceCollectionBlock | DOM capture | — |
| Slideshow / Presentation | Existing export menu | — (already handled) |

---

## Roadmap — what to build next

### Near-term improvements

**1. Loading state on Full Print button**
`useDomCapturePrint` already exposes `isCapturing` and `progress`. `MessageOptionsMenu` should show a spinner and progress % while the PDF is being generated. Currently the button just fires and goes silent.

**2. DOM-capture blocks should also export a proper `BlockPrinter`**
Right now DOM-capture blocks (Timeline, Diagram, etc.) use `captureBlockElement()` imperatively and have no `BlockPrinter` object. This means they can't participate in a future unified "print all blocks" orchestration. Fix: each should export a `BlockPrinter` with `variants: []` whose `print()` calls `captureBlockElement`. The host would then be able to iterate all blocks and call their printers in sequence.

**3. Toast / error feedback after print**
If `captureAsPDF()` throws (e.g. CORS on an image), the user gets no feedback. Add an error toast using the existing toast system.

**4. Print button in fullscreen mode**
Most blocks hide their toolbar when in fullscreen. The print button disappears. Fullscreen views should include a print button since that's often when users want to print.

**5. Flashcard study-sheet variant — column layout bug**
The study-sheet print layout uses `grid-template-columns: 1fr 2fr`. This breaks on A4 narrow margin. Add a `@media print` override with `display: block` fallback.

### Medium-term

**6. CSS `@media print` polish pass across all HTML-template printers**
Currently each printer sets its own print media queries. A shared print stylesheet in `block-print-utils.ts` (injected into every `buildPrintDocument` call) would eliminate duplication and ensure consistent margins, font sizes, and header handling across all blocks.

**7. Merge Tier 1 and Tier 2 under one "Print" menu option**
Today users see "Print / Save PDF" (Tier 1) and "Full Print (all blocks)" (Tier 2) as separate options. This is confusing. Better: one "Print" button that detects whether any custom blocks are present in the content. If not → Tier 1. If yes → Tier 2. Per-block buttons remain as Tier 3.

**8. Page number and header injection for multi-page PDFs**
`captureToPDF()` slices the canvas into pages but adds no headers, footers, or page numbers. jsPDF supports text overlays before `addImage()`. Should be a config option in `DomCaptureOptions`.

### Architecture — database-dynamic blocks

The current system is fully static: `BlockComponentRegistry.tsx` (lazy imports) → `BlockRenderer.tsx` (switch statement) → component. Adding a new block type means editing three files in the codebase.

When blocks move to the database, the following pieces are needed:

**What to build:**

| Piece | Notes |
|---|---|
| `features/block-runtime/` shared utility | Extract Babel + `new Function()` eval from `features/prompt-apps/` (it already exists there). This becomes the shared eval pipeline for all dynamic blocks. |
| `DynamicBlockRegistry` | A client-side `Map<string, { component: React.ComponentType, printer?: BlockPrinter }>`. ~50 lines. Provides `register(type, component, printer?)` and `get(type)`. |
| `BlockRenderer` patch | After the existing `switch`, fall through to `DynamicBlockRegistry.get(block.type)`. ~10 lines. |
| API route for block definitions | Returns `{ type, render_code, printer_code }[]`. Cached at startup, invalidated on block publish. |
| DB schema | Block record needs `render_code: text`, `printer_code: text | null`, `loading_code: text | null`. |

**What does NOT change:**
- `BlockPrinter` interface — already serialization-safe
- `PrintOptionsDialog` — works with any `BlockPrinter`, origin irrelevant
- All existing block printers — they stay where they are; static blocks register on import, dynamic blocks register on eval

**The eval pattern (from prompt-apps):**
```typescript
// printer_code stored in DB:
const kanbanPrinter = { label: "Print kanban", variants: [], print(data) { ... } };

// host eval:
const module = evalBlockCode(printerCode, { buildPrintDocument, openPrintWindow, escapeHtml });
dynamicBlockRegistry.register(blockType, component, module.printer);
```

The database is the right place to start this conversation. The shared eval utility is the prerequisite for everything else.

---

## For new contributors

- Read `BLOCK-PRINTER-GUIDE.md` — it has the complete step-by-step for adding a printer to any block
- The `BlockPrinter` interface is in `features/chat/utils/block-print-utils.ts` — that's the only file you import from
- Look at `flashcards-printer.ts` for a full HTML-template example with variants
- Look at `TimelineBlock.tsx` for a full DOM-capture example
- Never add `useMemo` / `useCallback` / `React.memo` — React Compiler handles memoization
