Here's the guide and then the database-block analysis.

## The Block Printer Guide

It's been written to `features/chat/components/print/BLOCK-PRINTER-GUIDE.md`. It covers:

- When to use HTML-template vs DOM-capture strategy
- The exact pattern for each strategy with copy-pasteable code
- How to wire into `ChatCollapsibleWrapper` vs `ContentBlockWrapper` blocks
- Variant design rules
- `usePrintOptions` semantics
- A quick checklist at the end

Intentionally terse — it assumes you know React and TypeScript and only documents the system-specific rules.

---

## Database-Dynamic Blocks: What's Missing

Here's the current architecture and the exact gaps:

### What exists today

The render pipeline is a **static chain**:

```
AI output text
  → MarkdownStream parser  (detects block type tags)
  → BlockRenderer.tsx      (switch(block.type) → component)
  → BlockComponentRegistry.tsx  (static map of lazy imports)
```

All three layers are **hardcoded in the codebase**. Adding a new block type means editing all three files.

### The three things needed for database blocks

**1. A dynamic component loader**

`BlockComponentRegistry` uses `lazy(() => import("..."))` — static paths only. For database blocks, you need to evaluate code at runtime. The existing `Prompt Apps` system already does exactly this:

```
AI-generated JSX → Babel transform → new Function() with scoped imports
```

That pipeline (`features/prompt-apps/`) is the template. For database blocks, the same eval approach would be used — the block's render code (stored as a string in the DB) gets compiled into a React component on first use, memoized by `blockType` string.

**2. A dynamic type → component registry**

`BlockRenderer.tsx` is a `switch` statement. It needs to become a lookup:

```typescript
// today (static):
case "flashcards": return <FlashcardsBlock {...} />;

// with dynamic blocks:
const DynamicComponent = dynamicBlockRegistry.get(block.type);
if (DynamicComponent) return <DynamicComponent {...} />;
```

The `dynamicBlockRegistry` would be a `Map<string, React.ComponentType>` populated at startup from the database and updated when new blocks are published.

**3. A dynamic printer registry**

The print system is already decentralized (each block owns its printer), but the **connection** from block type → printer still needs a runtime path. Today it's direct (the component imports its own printer). For DB blocks, the printer would be a second field stored alongside the render code, eval'd the same way.

```typescript
// Block record in DB:
{
  type: "custom_kanban",
  render_code: "export default function KanbanBlock({ data }) { ... }",
  printer_code: "export const kanbanPrinter = { label: ..., variants: [], print(...) { ... } }"
}
```

The host eval's both, registers the component and the printer, and the rest of the system is unchanged.

### What we'd need to build

| Piece | Complexity | Notes |
|---|---|---|
| `DynamicBlockRegistry` — a client-side `Map` with `register(type, component, printer?)` | Low | ~50 lines; same pattern as prompt-apps component cache |
| `BlockRenderer` patch — fall through to registry after the `switch` | Low | ~10 lines |
| DB eval pipeline for render code | Already exists in prompt-apps | Reuse `BabelTransform` + `new Function()` pattern |
| DB eval pipeline for printer code | Low | Same eval; extract the exported `printer` const |
| API route to fetch block definitions | Low | Returns `{ type, render_code, printer_code }[]` |
| Cache/invalidation | Medium | Cache by `blockType`, invalidate on block publish |

### What does NOT need to change

- `BlockPrinter` interface — it's already serialization-friendly (just `label`, `variants[]`, and a `print` function)
- `PrintOptionsDialog` — receives any `BlockPrinter`, doesn't care where it came from
- `usePrintOptions` hook — same
- All existing block printers — they keep working; they just also get registered in the dynamic registry

### The key insight

The print system was designed exactly for this. The only structural gap is the **component registry** and the **eval pipeline** — both of which have working precedents in `features/prompt-apps/`. The print system doesn't need to change at all to support database blocks; it just needs the registry to hand it a printer object that was eval'd instead of statically imported.

When you're ready to build it, the right first step is extracting the Babel + `new Function()` eval logic from `prompt-apps` into a shared `features/block-runtime/` utility, then building `DynamicBlockRegistry` on top of it. That's where I'd start the conversation.