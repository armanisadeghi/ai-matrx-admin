# Block Printer Guide

Step-by-step instructions for adding print support to any block. For system overview and roadmap see `README.md`.

---

## The Contract

Every block printer is a single exported object conforming to `BlockPrinter`:

```typescript
import { buildPrintDocument, openPrintWindow, escapeHtml, type BlockPrinter } from "@/features/chat/utils/block-print-utils";

export const myBlockPrinter: BlockPrinter = {
    label: "Print my block",        // tooltip text on the print button
    variants: [],                   // [] = print immediately; non-empty = show dialog first
    print(data: unknown, variantId?: string) {
        // open a print window
    },
};
```

`BlockPrinter` lives in `features/chat/utils/block-print-utils.ts`. Never import it from anywhere else.

---

## Choosing a Print Strategy

| Block type | Strategy | When to use |
|---|---|---|
| Structured data (cards, questions, steps) | **HTML template** | You can serialize all meaningful data to clean HTML |
| Visual / interactive (diagram, timeline, chart) | **DOM capture** | The rendered DOM is the source of truth; data alone doesn't convey it |

---

## Strategy A — HTML Template Printer

Use when the block's data can be serialized to readable HTML (flashcards, quizzes, math, recipes, etc.).

### 1. Create `my-block-printer.ts` alongside the component

```typescript
// components/mardown-display/blocks/my-block/my-block-printer.ts
import {
    buildPrintDocument,
    openPrintWindow,
    escapeHtml,
    type BlockPrinter,
} from "@/features/chat/utils/block-print-utils";

// Define your variant IDs as a union type for safety
export type MyBlockVariant = "default" | "compact";

// Block-specific CSS — only what the print document needs
const STYLES = `
  .my-item { border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 8px; }
  @media print { .my-item { page-break-inside: avoid; } }
`;

// One render function per variant (or just one if no variants)
function renderDefault(data: MyBlockData): string {
    return data.items
        .map((item) => `<div class="my-item">${escapeHtml(item.text)}</div>`)
        .join("\n");
}

export const myBlockPrinter: BlockPrinter = {
    label: "Print my block",

    // Non-empty → PrintOptionsDialog shown before printing
    // Empty     → prints immediately on button click
    variants: [
        { id: "default", label: "Full version", description: "All content" },
        { id: "compact", label: "Compact", description: "Titles only" },
    ],

    print(data: unknown, variantId: string = "default") {
        const typed = data as MyBlockData;
        if (!typed?.items?.length) {
            openPrintWindow(
                buildPrintDocument("<p>No data available.</p>", "My Block", STYLES),
                "my-block"
            );
            return;
        }

        const body = variantId === "compact"
            ? renderCompact(typed)
            : renderDefault(typed);

        openPrintWindow(
            buildPrintDocument(body, typed.title ?? "My Block", STYLES),
            "my-block"
        );
    },
};
```

**Rules:**
- Always guard against empty/missing data before rendering
- Use `escapeHtml()` on every string from user data — never skip it
- Add `page-break-inside: avoid` on card-like elements in your `STYLES`
- Add `@media print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }` on any colored element
- Default `variantId` in the function signature — never let it be truly undefined in logic

### 2. Wire into the component

**For `ChatCollapsibleWrapper` blocks (e.g. FlashcardsBlock):**

```typescript
import { myBlockPrinter } from "./my-block-printer";
import { PrintOptionsDialog, usePrintOptions } from "@/features/chat/components/print/PrintOptionsDialog";
import { Printer } from "lucide-react";

// Inside component:
const { open: printOpen, setOpen: setPrintOpen, triggerPrint } = usePrintOptions(
    myBlockPrinter,
    blockData   // the data object passed to printer.print()
);

// In the controls prop:
controls={
    <>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={triggerPrint}>
            <Printer className="h-3.5 w-3.5" />
        </Button>
        {/* existing controls */}
    </>
}

// After the wrapper, at the bottom of the return:
<PrintOptionsDialog
    printer={myBlockPrinter}
    data={blockData}
    open={printOpen}
    onOpenChange={setPrintOpen}
/>
```

**For `ContentBlockWrapper` blocks (e.g. MathProblemBlock):**

```typescript
// Add to customActions array:
const customActions = [
    {
        icon: Printer,
        tooltip: "Print",
        onClick: triggerPrint,
        className: "bg-slate-500 dark:bg-slate-600 text-white ..."
    },
    // existing actions...
];

// Wrap return in <> ... </> and add dialog at bottom:
return (
    <>
        <ContentBlockWrapper customActions={customActions} ...>
            ...
        </ContentBlockWrapper>
        <PrintOptionsDialog printer={myBlockPrinter} data={blockData} open={printOpen} onOpenChange={setPrintOpen} />
    </>
);
```

---

## Strategy B — DOM Capture Printer

Use for visual/interactive blocks where the rendered DOM is what matters.

### 1. Add the ref and handler to the component

```typescript
import { useRef, useCallback } from "react";
import { captureBlockElement } from "@/features/chat/utils/dom-capture-block-printer";
import { Printer } from "lucide-react";

// Inside component:
const blockContentRef = useRef<HTMLDivElement>(null);
const handlePrint = useCallback(() => {
    if (blockContentRef.current) {
        captureBlockElement(blockContentRef.current, "my-block-filename");
    }
}, []);
```

### 2. Attach the ref to the content element you want captured

```tsx
<div ref={blockContentRef} className="...">
    {/* the content to capture */}
</div>
```

### 3. Add the print button to the existing toolbar

```tsx
<button onClick={handlePrint} className="... bg-slate--500 text-white ...">
    <Printer className="h-4 w-4" />
    <span>Print</span>
</button>
```

**No printer file, no `PrintOptionsDialog`, no `usePrintOptions` needed** — DOM capture blocks are imperative, not data-driven.

**Rules:**
- Attach `ref` to the element you want in the PDF, not the whole page
- For landscape content (timelines, diagrams), `captureBlockElement` already defaults to `orientation: "landscape"`
- Do NOT call `captureBlockElement` inside the fullscreen overlay (the overlay is a portal, not in the ref's subtree)

---

## Variant Design Rules

- Every printer should have at least a `"default"` mental model, even if not listed as a variant
- List the most useful variant first — `PrintOptionsDialog` selects it automatically
- Use `description` for variants that might confuse users (e.g. "Back side only — answers/definitions without terms")
- "Print with defaults" always works as a one-click escape hatch — the first variant is the default

---

## `usePrintOptions` — what it does

```typescript
const { open, setOpen, triggerPrint } = usePrintOptions(printer, data);
```

- `triggerPrint()` — if `printer.variants.length === 0`, calls `printer.print(data)` immediately. Otherwise sets `open = true`.
- `open` / `setOpen` — controls `PrintOptionsDialog`.
- Memoize `data` with `useMemo` if it's computed from props to avoid stale closures.

---

## File naming conventions

| File | Location |
|---|---|
| Printer object | `components/mardown-display/blocks/<block-name>/<block-name>-printer.ts` |
| Component | `components/mardown-display/blocks/<block-name>/<BlockName>Block.tsx` |

Both files live in the same folder. The printer is a plain `.ts` file (no JSX, no React import needed).

---

## Quick checklist

- [ ] `printer.ts` file created, exports a `const` named `<blockName>Printer`
- [ ] Imports `BlockPrinter`, `buildPrintDocument`, `openPrintWindow`, `escapeHtml` from `block-print-utils`
- [ ] All user strings passed through `escapeHtml()`
- [ ] Empty-data guard at the top of `print()`
- [ ] `STYLES` string includes `page-break-inside: avoid` for repeating elements
- [ ] `STYLES` includes `print-color-adjust: exact` for any colored backgrounds
- [ ] Printer imported into block component
- [ ] `usePrintOptions(printer, data)` called in component
- [ ] `<Printer>` button wired to `triggerPrint`
- [ ] `<PrintOptionsDialog>` rendered at the bottom of the component return
- [ ] No `React.memo` / `useMemo` / `useCallback` added manually (React Compiler handles it)
