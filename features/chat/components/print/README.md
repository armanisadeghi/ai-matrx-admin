# Block-Aware Print / PDF System

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
  Shows loading state in the menu while capturing
  Cost: heavier (screenshot pipeline, dynamic imports)

Tier 3 — Per-Block Print (best quality)
  Print button in each block's own header/toolbar
  Block controls its own HTML, its own variants, its own CSS
  PrintOptionsDialog lets users choose variant + settings, or print with defaults
  Falls back to Tier 2 DOM capture if no printer declared
```

### The BlockPrinter contract

Each block that wants its own print logic exports a single `BlockPrinter` object. This is the entire API surface the host system touches:

```typescript
import type { BlockPrinter, PrintVariant, PrintSetting, PrintSettings } from "@/features/chat/utils/block-print-utils";

export interface BlockPrinter {
    label: string;                 // button tooltip
    variants: PrintVariant[];      // [] = print immediately (no dialog); non-empty = show dialog
    settings?: PrintSetting[];     // optional user-configurable toggles shown in the dialog
    print: (data: unknown, variantId?: string, settings?: PrintSettings) => void | Promise<void>;
}

export interface PrintVariant {
    id: string;
    label: string;
    description?: string;
}

// Currently only "boolean" type; discriminated union for future "select" / "number"
export type PrintSetting = {
    type: "boolean";
    id: string;
    label: string;
    description?: string;
    defaultValue: boolean;
    appliesTo?: string[];   // which variantIds this setting applies to; omit = applies to all
};

export type PrintSettings = Record<string, boolean | string | number>;
```

The host never inspects inside `print()`. This is what makes the system future-proof — when blocks migrate to the database, the printer travels with the block code and the host requires zero changes.

### File locations

```
features/chat/utils/
  block-print-utils.ts          BlockPrinter interface, buildPrintDocument(), openPrintWindow(), escapeHtml()
  dom-capture-print-utils.ts    captureToPDF() using html2canvas + jsPDF; captureToClipboardImage()
  dom-capture-block-printer.ts  captureBlockElement(el, filename, orientation?) helper
  markdown-print-utils.ts       Tier 1 regex-based markdown → HTML (prose only)

features/chat/hooks/
  useDomCapturePrint.ts         Tier 2 hook: { captureRef, isCapturing, progress, captureAsPDF, error }

features/chat/components/print/
  PrintOptionsDialog.tsx         Shared variant-picker + settings UI (Dialog desktop / Drawer mobile)
  BLOCK-PRINTER-GUIDE.md        Step-by-step for adding a printer to any block
  README.md                     This file
```

---

## Block inventory

### HTML Template printers (custom per-block HTML)

| Block | Printer file | Variants | Settings |
|---|---|---|---|
| FlashcardsBlock | `flashcards/flashcards-printer.ts` | landscape-duplex, landscape-stacked, avery-5388, cut-cards, both-sides, study-sheet, front-only, back-only | showSideLabel, showCardNumber, showTickMarks, showCutLines, lightBackText, mirrorBack |
| MultipleChoiceQuiz | `quiz/quiz-printer.ts` | blank (student), with-answers, answer-key | — |
| MathProblemBlock | `math/math-printer.ts` | problem-only, with-solution | — |

### DOM Capture printers (screenshot of rendered DOM)

Default orientation is landscape. Portrait is used for tall/list content.

| Block | Ref targets | Orientation |
|---|---|---|
| TimelineBlock | `<div className="space-y-6">` — periods + events content | landscape |
| ComparisonTableBlock | `<div className="bg-textured rounded-xl ...">` — table card | landscape |
| DecisionTreeBlock | `<div className="p-6 space-y-6">` — full content area (header + tree) | landscape |
| InteractiveDiagramBlock | `<div ref={diagramContainerRef}>` — ReactFlow container | landscape |
| cookingRecipeDisplay | `<div className="grid lg:grid-cols-2 ...">` — ingredient/instruction grid | portrait |
| ProgressTrackerBlock | `<div className="space-y-4">` — tracker items | portrait |
| TroubleshootingBlock | `<div className="space-y-4">` — issues list | portrait |
| ResearchBlock | `<div ref={blockContentRef}>` — research content | portrait |
| ResourceCollectionBlock | `<div className="space-y-6">` — resource cards | portrait |

### No print support yet

| Block | Notes |
|---|---|
| StructuredPlanBlock | High priority — long-form checklist content |
| CandidateProfileBlock | Useful for recruiting workflows |
| TasksBlock / TaskChecklist | Natural print target |
| TranscriptBlock | Long-form document candidate |
| StreamingTableRenderer | Data tables — Tier 2 works as fallback |
| QuestionnaireRenderer | Printable form candidate |
| Slideshow / Presentation | Has its own export menu — separate system |

---

## How `usePrintOptions` works

```typescript
const { open, setOpen, triggerPrint } = usePrintOptions(printer, data);
```

- If `printer.variants.length === 0` AND `(printer.settings?.length ?? 0) === 0` → calls `printer.print(data)` immediately, dialog never opens
- Otherwise → sets `open = true`, `PrintOptionsDialog` renders
- `PrintOptionsDialog` manages variant selection and setting toggles, then calls `printer.print(data, variantId, settingValues)`
- "Print with defaults" button calls `printer.print(data, undefined, buildDefaultSettings(settings))`

---

## How `captureBlockElement` works

```typescript
// Signature (dom-capture-block-printer.ts):
captureBlockElement(element: HTMLElement, filename: string, orientation?: "landscape" | "portrait"): Promise<void>
```

- Defaults to `"landscape"` — correct for wide visual blocks (Timeline, Diagram)
- Pass `"portrait"` for tall/list content (Recipe, Troubleshooting, etc.)
- Always `await` the call and wrap in try/catch — unhandled rejections are invisible to the user

**Required pattern (all DOM-capture blocks):**

```typescript
const [isPrinting, setIsPrinting] = useState(false);
const handlePrint = useCallback(async () => {
    if (!blockContentRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
        const { captureBlockElement } = await import('@/features/chat/utils/dom-capture-block-printer');
        await captureBlockElement(blockContentRef.current, 'filename', 'landscape');
    } catch (err) {
        console.error('[BlockName] Print failed:', err);
    } finally {
        setIsPrinting(false);
    }
}, [isPrinting]);
```

---

## Roadmap

### Near-term

**1. Toast on print error**
`captureAsPDF()` and `captureBlockElement()` both catch errors but only log them. Users should see a toast via the existing toast system when print fails.

**2. Expose Tier 2 progress**
`useDomCapturePrint` exposes `progress` (0–100). Wire it into the menu item label so users see "Generating PDF (47%)…" instead of just a label change.

**3. HTML-template printers for high-value blocks**
`StructuredPlanBlock`, `TasksBlock`, and `TranscriptBlock` are the best candidates for custom printers — they contain structured data that serializes cleanly to HTML.

**4. Settings for quiz and math printers**
`quizPrinter` and `mathPrinter` have no settings today. Candidates: include answer explanations toggle, font size option.

**5. Study-sheet variant — column layout on A4**
`FlashcardsBlock` study-sheet variant uses `grid-template-columns: 1fr 2fr`. This can overflow on A4 with narrow margins. Add `@media print { display: block; }` fallback.

### Medium-term

**6. Unified print button (auto Tier 1 vs Tier 2)**
Today users see "Print / Save PDF" (Tier 1) and "Full Print (all blocks)" (Tier 2) as separate items. Better: one "Print" button that detects whether any custom blocks are present and routes automatically.

**7. Page headers/footers in `captureToPDF`**
`captureToPDF()` slices the canvas into pages but adds no headers or page numbers. `jsPDF` supports text overlays before `addImage()`. This should be a `DomCaptureOptions` config field.

**8. Shared print stylesheet**
Each HTML-template printer defines its own CSS. Extract a shared base print stylesheet from `block-print-utils.ts` injected into every `buildPrintDocument` call to eliminate duplication.

### Architecture — database-dynamic blocks

When blocks move to the database, the following pieces are needed:

| Piece | Notes |
|---|---|
| `features/block-runtime/` shared utility | Extract Babel + `new Function()` eval from `features/prompt-apps/`. Becomes the shared eval pipeline for all dynamic blocks. |
| `DynamicBlockRegistry` | Client-side `Map<string, { component: React.ComponentType, printer?: BlockPrinter }>`. ~50 lines. `register(type, component, printer?)` + `get(type)`. |
| `BlockRenderer` patch | After the existing `switch`, fall through to `DynamicBlockRegistry.get(block.type)`. ~10 lines. |
| API route for block definitions | Returns `{ type, render_code, printer_code }[]`. Cached at startup, invalidated on block publish. |
| DB schema | Block record needs `render_code: text`, `printer_code: text | null`. |

**What does NOT change when this happens:**
- `BlockPrinter` interface — already serialization-safe
- `PrintOptionsDialog` — works with any `BlockPrinter`, origin irrelevant
- All existing block printers — they stay where they are

---

## For new contributors

- Read `BLOCK-PRINTER-GUIDE.md` — complete step-by-step for adding a printer to any block
- The `BlockPrinter` interface is in `features/chat/utils/block-print-utils.ts` — the only file to import from
- `flashcards-printer.ts` is the reference for a full HTML-template printer with variants and settings
- `TimelineBlock.tsx` is the reference for a correct DOM-capture implementation
- React Compiler is enabled — never add `useMemo` / `useCallback` / `React.memo` manually
