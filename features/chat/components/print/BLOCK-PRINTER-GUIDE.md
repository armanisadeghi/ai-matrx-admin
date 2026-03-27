# Block Printer Guide

Step-by-step for adding print support to any block. For system overview, block inventory, and roadmap see `README.md`.

---

## The Contract

Every block printer is a single exported object conforming to `BlockPrinter`:

```typescript
import {
    buildPrintDocument,
    openPrintWindow,
    escapeHtml,
    type BlockPrinter,
    type PrintSettings,
} from "@/features/chat/utils/block-print-utils";

export const myBlockPrinter: BlockPrinter = {
    label: "Print my block",        // tooltip text on the print button
    variants: [],                   // [] = print immediately; non-empty = show dialog first
    settings: [],                   // optional user-configurable toggles (omit if none)
    print(data: unknown, variantId?: string, settings?: PrintSettings) {
        // open a print window
    },
};
```

`BlockPrinter` lives in `features/chat/utils/block-print-utils.ts`. **Never import it from anywhere else.**

---

## Choosing a Strategy

| Block type | Strategy |
|---|---|
| Structured data (cards, questions, steps, recipes) | **HTML template** — serialize data to clean HTML |
| Visual / interactive (diagram, timeline, chart, table) | **DOM capture** — screenshot the rendered DOM |

---

## Strategy A — HTML Template Printer

### 1. Create `my-block-printer.ts` alongside the component

```typescript
// components/mardown-display/blocks/my-block/my-block-printer.ts
import {
    buildPrintDocument,
    openPrintWindow,
    escapeHtml,
    type BlockPrinter,
    type PrintSettings,
} from "@/features/chat/utils/block-print-utils";

type MyBlockData = { title: string; items: { text: string }[] };

// Block-specific CSS
const STYLES = `
  .my-item { border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 8px; }
  @media print {
    .my-item { page-break-inside: avoid; }
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

function renderDefault(data: MyBlockData): string {
    return data.items
        .map(item => `<div class="my-item">${escapeHtml(item.text)}</div>`)
        .join("\n");
}

export const myBlockPrinter: BlockPrinter = {
    label: "Print my block",
    variants: [
        { id: "default", label: "Full version", description: "All content" },
        { id: "compact", label: "Compact", description: "Titles only" },
    ],
    // Optional settings:
    settings: [
        { type: "boolean", id: "showNumbers", label: "Show item numbers", defaultValue: true },
    ],
    print(data: unknown, variantId: string = "default", settings?: PrintSettings) {
        const typed = data as MyBlockData;
        // Guard against empty data
        if (!typed?.items?.length) {
            openPrintWindow(buildPrintDocument("<p>No data available.</p>", "My Block", STYLES), "my-block");
            return;
        }
        const body = variantId === "compact" ? renderCompact(typed) : renderDefault(typed);
        openPrintWindow(buildPrintDocument(body, typed.title ?? "My Block", STYLES), "my-block");
    },
};
```

**Rules:**
- Always guard against empty/missing data before rendering
- Call `escapeHtml()` on every string from user data — never skip it
- Add `page-break-inside: avoid` for repeating elements
- Add `print-color-adjust: exact` for any colored backgrounds
- Default `variantId` in the function signature — don't leave it truly `undefined` in logic
- `settings` parameter is a `Record<string, boolean | string | number>` — read with `settings?.showNumbers ?? defaultValue`

### 2. Wire into the component

**`ChatCollapsibleWrapper` blocks (FlashcardsBlock pattern):**

```typescript
import { myBlockPrinter } from "./my-block-printer";
import { PrintOptionsDialog, usePrintOptions } from "@/features/chat/components/print/PrintOptionsDialog";
import { Printer } from "lucide-react";

const { open: printOpen, setOpen: setPrintOpen, triggerPrint } = usePrintOptions(
    myBlockPrinter,
    blockData    // the value passed to printer.print() as first arg
);

// In the controls prop:
controls={
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={triggerPrint}>
        <Printer className="h-3.5 w-3.5" />
    </Button>
}

// After the wrapper, at the bottom of the JSX return (not inside the wrapper):
<PrintOptionsDialog printer={myBlockPrinter} data={blockData} open={printOpen} onOpenChange={setPrintOpen} />
```

If you add `PrintOptionsDialog` as a sibling to the wrapper, wrap both in a fragment: `<>...</>`.

**`ContentBlockWrapper` blocks (MathProblemBlock pattern):**

```typescript
const customActions = [
    {
        icon: Printer,
        tooltip: "Print",
        onClick: triggerPrint,
        className: "bg-slate-500 dark:bg-slate-600 text-white ...",
    },
];

return (
    <>
        <ContentBlockWrapper customActions={customActions} ...>
            ...
        </ContentBlockWrapper>
        <PrintOptionsDialog printer={myBlockPrinter} data={blockData} open={printOpen} onOpenChange={setPrintOpen} />
    </>
);
```

### 3. `usePrintOptions` behaviour

```typescript
const { open, setOpen, triggerPrint } = usePrintOptions(printer, data);
```

- If `printer.variants.length === 0` AND `(printer.settings?.length ?? 0) === 0` → calls `printer.print(data)` immediately
- Otherwise → opens `PrintOptionsDialog` which manages variant + setting state and calls `printer.print(data, variantId, settingValues)`

---

## Strategy B — DOM Capture Printer

### 1. Add ref, loading state, and handler

```typescript
import { useState, useRef, useCallback } from "react";
import { Printer } from "lucide-react";

const blockContentRef = useRef<HTMLDivElement>(null);
const [isPrinting, setIsPrinting] = useState(false);

const handlePrint = useCallback(async () => {
    if (!blockContentRef.current || isPrinting) return;
    setIsPrinting(true);
    try {
        const { captureBlockElement } = await import('@/features/chat/utils/dom-capture-block-printer');
        // Use "portrait" for tall/list content; "landscape" is the default
        await captureBlockElement(blockContentRef.current, 'my-block-filename', 'landscape');
    } catch (err) {
        console.error('[MyBlock] Print failed:', err);
    } finally {
        setIsPrinting(false);
    }
}, [isPrinting]);
```

**Always `await` `captureBlockElement`** — without it, errors are silent unhandled rejections.

### 2. Attach the ref to the correct element

```tsx
<div ref={blockContentRef} className="...">
    {/* the content to capture — not the whole block, not the header, just the content */}
</div>
```

Attach to the meaningful content container, not `document.body` or the block's outer shell.

### 3. Add the print button

```tsx
<button
    onClick={handlePrint}
    disabled={isPrinting}
    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-500 dark:bg-slate-600 text-white text-sm font-semibold shadow-md disabled:opacity-50"
>
    <Printer className="h-4 w-4" />
    <span>{isPrinting ? 'Saving…' : 'Print'}</span>
</button>
```

### 4. Add print button to fullscreen header

If your block has a fullscreen mode, the regular toolbar is typically hidden. Always add a print button to the fullscreen header/footer so users can still print from there.

```tsx
{isFullScreen && (
    <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between ...">
        <div className="...">...title...</div>
        <div className="flex items-center gap-2">
            <button onClick={handlePrint} disabled={isPrinting} className="... bg-slate-500 text-white ...">
                <Printer className="h-4 w-4" />
                <span>{isPrinting ? 'Saving…' : 'Print'}</span>
            </button>
            <button onClick={() => setIsFullScreen(false)} className="...">
                <Minimize2 className="h-4 w-4" />
                <span>Exit</span>
            </button>
        </div>
    </div>
)}
```

**No printer file, no `PrintOptionsDialog`, no `usePrintOptions` needed** for DOM capture.

---

## Adding User-Configurable Settings (HTML Template only)

Settings appear as toggle switches in `PrintOptionsDialog` below the variant picker.

```typescript
settings: [
    {
        type: "boolean" as const,
        id: "showNumbers",
        label: "Show card numbers",
        description: "Prints #1, #2 … on each card",
        defaultValue: false,
        appliesTo: ["default", "compact"],   // omit to apply to all variants
    },
],
```

In `print()`, read settings safely:

```typescript
print(data: unknown, variantId = "default", settings?: PrintSettings) {
    const showNumbers = (settings?.showNumbers ?? false) as boolean;
    // use showNumbers in your HTML
}
```

---

## Variant Design Rules

- List the most useful variant first — `PrintOptionsDialog` auto-selects it
- Add `description` to variants that might confuse users
- "Print with defaults" always works — the first variant + default settings is the one-click path
- Keep variant IDs as stable strings — they travel through URLs and logs

---

## File naming

| File | Location |
|---|---|
| Printer object | `components/mardown-display/blocks/<block-name>/<block-name>-printer.ts` |
| Block component | `components/mardown-display/blocks/<block-name>/<BlockName>Block.tsx` |

Both live in the same folder. The printer is a plain `.ts` file — no JSX, no React import.

---

## Quick checklist

**HTML template printer:**
- [ ] `<block-name>-printer.ts` exports a `const` named `<blockName>Printer`
- [ ] Imports from `@/features/chat/utils/block-print-utils` only
- [ ] All user strings through `escapeHtml()`
- [ ] Empty-data guard at the top of `print()`
- [ ] `STYLES` has `page-break-inside: avoid` for repeating elements
- [ ] `STYLES` has `print-color-adjust: exact` for colored backgrounds
- [ ] `settings` parameter destructured safely with `?? defaultValue` fallbacks
- [ ] `usePrintOptions(printer, data)` called in component
- [ ] `<Printer>` button wired to `triggerPrint`
- [ ] `<PrintOptionsDialog>` rendered outside (not inside) the block wrapper

**DOM capture block:**
- [ ] `useState(false)` for `isPrinting`
- [ ] `handlePrint` has `if (!ref.current || isPrinting) return` guard
- [ ] `captureBlockElement` is `await`-ed inside try/catch
- [ ] `finally` block sets `setIsPrinting(false)`
- [ ] `ref` attached to content container (not the whole block)
- [ ] Print button has `disabled={isPrinting}` and shows "Saving…" label
- [ ] Print button also present in fullscreen header if block has fullscreen mode
- [ ] Correct orientation passed (`"portrait"` for tall content, `"landscape"` default)
