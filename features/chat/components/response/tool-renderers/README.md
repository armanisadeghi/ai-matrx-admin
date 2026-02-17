# Tool Renderers System

A registry-based system for creating custom displays for MCP tool results. Each tool gets beautiful, tool-specific visualizations in both the chat stream (inline) and a full-screen modal (overlay), without touching core orchestration code.

---

## Architecture Overview

```
User sends message
  → Agent calls MCP tools
    → Socket emits ToolCallObject[] updates (input, messages, output)
      → ToolCallVisualization groups by tool ID, picks inline renderers
        → Inline renderers show compact preview in chat
          → "View all" button opens ToolUpdatesOverlay modal
            → One tab per tool, each with a blue gradient header
              → Results view (default) or Input view (toggle)
```

### Key Files

| File | Purpose |
|------|---------|
| `types.ts` | `ToolRendererProps`, `ToolRenderer`, `ToolRegistry` interfaces |
| `registry.tsx` | Tool registry + helper functions (`getResultsLabel`, `getToolDisplayName`, etc.) |
| `index.ts` | Barrel exports for the entire system |
| `GenericRenderer.tsx` | Fallback renderer for unregistered tools |
| `ToolUpdatesOverlay.tsx` | Full-screen modal — groups tools into tabs, renders blue header + toggle |
| `ToolCallVisualization.tsx` | Chat-stream container — groups updates, renders inline components |

### Data Flow

1. **`ToolCallVisualization`** receives the full `toolUpdates: ToolCallObject[]` array
2. Groups updates by `update.id` (each tool call has a unique ID)
3. For each group, looks up the inline renderer via `getInlineRenderer(toolName)`
4. Passes the **group** (subset) to the inline renderer, plus `toolGroupId` and `onOpenOverlay`
5. When the user clicks "View all", `ToolUpdatesOverlay` opens with one tab per tool group
6. Each tab renders a **blue gradient header** (tool name, subtitle, toggle icon) + the overlay content

---

## ToolCallObject Shape

Every tool update is a `ToolCallObject` from `@/lib/redux/socket-io/socket.types`:

```typescript
interface ToolCallObject {
    id?: string;  // Unique ID for the tool call (groups related updates)
    type: "mcp_input" | "mcp_output" | "mcp_error" | "step_data" | "user_visible_message";
    mcp_input?: {
        name: string;        // Tool name (e.g., "get_news_headlines")
        arguments: Record<string, any>;  // Tool parameters
    };
    mcp_output?: Record<string, unknown>;  // Tool result data
    mcp_error?: string;                     // Error message if tool failed
    step_data?: { type: string; [key: string]: any };  // Streaming intermediate data
    user_visible_message?: string;          // Status messages (e.g., "Browsing https://...")
}
```

A typical tool call produces updates in this order:

| # | Type | Description |
|---|------|-------------|
| 1 | `mcp_input` | Tool name + arguments (always first) |
| 2–N | `user_visible_message` | Optional status messages during execution |
| 2–N | `step_data` | Optional intermediate data (e.g., partial search results) |
| N+1 | `mcp_output` | Final result data (always last on success) |
| N+1 | `mcp_error` | Error message (instead of output, on failure) |

---

## Creating a Custom Tool Renderer

### Step 1: Create the Directory

```
features/chat/components/response/tool-renderers/
└── my-tool/
    ├── MyToolInline.tsx      # Required: compact chat-stream display
    ├── MyToolOverlay.tsx      # Optional: enhanced modal display
    └── index.ts               # Barrel exports
```

### Step 2: Create the Inline Renderer

The inline renderer shows in the chat stream. Keep it compact — show a preview with a "View all" button.

```tsx
// my-tool/MyToolInline.tsx
"use client";

import React from "react";
import { ToolRendererProps } from "../types";

export const MyToolInline: React.FC<ToolRendererProps> = ({
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    toolGroupId = "default",
}) => {
    // Slice to only show updates that have been revealed (for animation)
    const visibleUpdates = currentIndex !== undefined
        ? toolUpdates.slice(0, currentIndex + 1)
        : toolUpdates;

    // Extract your output data
    const outputUpdate = visibleUpdates.find(u => u.type === "mcp_output");
    const result = outputUpdate?.mcp_output?.result as YourResultType | undefined;

    if (!result) return null;

    // Show a compact preview
    const previewItems = result.items.slice(0, 6);
    const hasMore = result.items.length > previewItems.length;

    return (
        <div className="space-y-3">
            {/* Compact preview grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {previewItems.map((item, index) => (
                    <div key={index} className="bg-white dark:bg-slate-800 rounded-lg border p-3">
                        <h3 className="text-sm font-semibold">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                ))}
            </div>

            {/* "View all" button — opens the overlay to this tool's tab */}
            {hasMore && onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
                >
                    View all {result.items.length} results
                </button>
            )}
        </div>
    );
};
```

**Key points:**
- Always destructure `toolGroupId` with a default of `"default"`
- Call `onOpenOverlay(\`tool-group-${toolGroupId}\`)` to open the modal to this tool's tab
- Use `e.stopPropagation()` on click handlers (the parent is a collapsible accordion)
- Use `currentIndex` for progressive reveal animation

### Step 3: Create the Overlay Renderer (Optional)

The overlay renderer shows in the full-screen modal. Go full-featured here — filters, sorting, detailed views.

**Important:** The overlay renderer does NOT need to render its own header. The `ToolGroupTab` wrapper automatically provides:
- A blue gradient header bar with the tool's `resultsLabel`
- A subtitle extracted from the tool's input arguments (query, url, etc.)
- A toggle icon to switch between Results and Input views

Your overlay component receives the **group** of `ToolCallObject[]` for this specific tool only.

```tsx
// my-tool/MyToolOverlay.tsx
"use client";

import React, { useState, useMemo } from "react";
import { ToolRendererProps } from "../types";

export const MyToolOverlay: React.FC<ToolRendererProps> = ({ toolUpdates }) => {
    const [filter, setFilter] = useState("all");

    // Extract result data
    const result = useMemo(() => {
        const outputUpdate = toolUpdates.find(u => u.type === "mcp_output");
        if (!outputUpdate?.mcp_output) return null;
        return outputUpdate.mcp_output.result as YourResultType;
    }, [toolUpdates]);

    if (!result) {
        return (
            <div className="p-4 text-center text-muted-foreground">
                No data available
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Filters, sorting controls */}
            <div className="flex items-center gap-2">
                {/* Your filter UI */}
            </div>

            {/* Full results list */}
            <div className="space-y-4">
                {result.items.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg border bg-white dark:bg-slate-800/50">
                        <h3 className="text-base font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
```

**Key points:**
- Do NOT add a header bar — the system provides one automatically
- The component receives `toolUpdates` scoped to THIS tool's group only
- Use `useMemo` for data extraction since it may re-render on toggle
- Provide filter/sort/search features for better UX

### Step 4: Create the Barrel Export

```tsx
// my-tool/index.ts
export { MyToolInline } from "./MyToolInline";
export { MyToolOverlay } from "./MyToolOverlay";
```

### Step 5: Register the Tool

Add your tool to `registry.tsx`:

```tsx
import { MyToolInline, MyToolOverlay } from "./my-tool";

export const toolRendererRegistry: ToolRegistry = {
    // ... existing tools

    "my_tool_name": {
        displayName: "My Tool",           // Shown in chat header and overlay
        resultsLabel: "My Tool Results",   // Tab label in the overlay modal
        inline: MyToolInline,              // Required
        overlay: MyToolOverlay,            // Optional (falls back to inline, then GenericRenderer)
        keepExpandedOnStream: true,        // Optional: keep visible when AI starts typing
    },
};
```

**Registry fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `displayName` | Yes | Human-readable name (shown in chat header, auto-generated tab labels) |
| `resultsLabel` | No | Custom tab label in overlay (defaults to `${displayName} Results`) |
| `inline` | Yes | Compact chat-stream component |
| `overlay` | No | Full-featured modal component (falls back to inline → GenericRenderer) |
| `keepExpandedOnStream` | No | If `true`, tool results stay visible when AI response text starts streaming (default: `false`, auto-collapses) |

### Step 6: Add to Barrel Exports

In `index.ts`:

```tsx
export * from "./my-tool";
```

---

## The Overlay Modal System

### How Tabs Work

The `ToolUpdatesOverlay` modal creates **one tab per tool call**:

- Tab ID: `tool-group-{toolCallId}`
- Tab label: from `resultsLabel` in registry, or `${displayName} Results`, or auto-generated from snake_case
- Default view: Results (custom overlay renderer, or generic output view)
- Toggle: Settings icon in the blue header bar switches to Input view

### The Blue Gradient Header

Every tool tab gets a consistent blue gradient header bar that shows:

1. **Tool icon** (Wrench icon)
2. **Title** — `resultsLabel` when showing results, `{displayName} — Input` when toggled
3. **Subtitle** — Auto-extracted from the tool's input arguments (`query`, `q`, `search`, `url`, `urls`)
4. **Result count** — Auto-extracted from output (`articles.length`, `totalResults`, etc.)
5. **Toggle button** — Small pill with Settings icon, toggles between Results and Input views

Custom overlay renderers do NOT need to provide their own header. However, tools like `NewsOverlay` that have their own enhanced header (with filter/sort controls) can keep it — it renders inside the content area below the blue bar.

### Fallback Rendering

For tools without a custom overlay renderer, the system provides:

- **OutputView** — Detects text content (`result`, `text`, `content` fields) and renders it as prose, or falls back to formatted JSON
- **ErrorView** — Red-themed error card with the error message
- **InputView** — Parameter display with formatted values and raw JSON reference

---

## Props Reference

### ToolRendererProps

```typescript
interface ToolRendererProps {
    toolUpdates: ToolCallObject[];  // Updates for this tool group only
    currentIndex?: number;          // For progressive reveal animation (inline only)
    onOpenOverlay?: (initialTab?: string) => void;  // Opens the modal (inline only)
    toolGroupId?: string;           // This tool's group ID for tab targeting (inline only)
}
```

### Accessing Data in Your Components

```tsx
// Get tool input arguments
const inputUpdate = toolUpdates.find(u => u.type === "mcp_input");
const toolName = inputUpdate?.mcp_input?.name;
const args = inputUpdate?.mcp_input?.arguments;

// Get tool output (the main result)
const outputUpdate = toolUpdates.find(u => u.type === "mcp_output");
const result = outputUpdate?.mcp_output?.result;

// Get streaming step data (intermediate results)
const stepUpdates = toolUpdates.filter(u => u.type === "step_data");

// Get status messages (e.g., "Browsing https://...")
const messages = toolUpdates
    .filter(u => u.type === "user_visible_message")
    .map(u => u.user_visible_message);

// Check if tool execution is complete
const isComplete = toolUpdates.some(u => u.type === "mcp_output" || u.type === "mcp_error");
const hasError = toolUpdates.some(u => u.type === "mcp_error");
```

---

## Design Guidelines

### Inline Renderers

- **Compact** — Show only the most important data (3-6 items max)
- **Progressive disclosure** — Preview items + "View all X results" button
- **Responsive** — Grid layouts that collapse on mobile (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- **Animated** — Use `animate-in fade-in` with staggered `animationDelay` for smooth reveal
- **Loading-aware** — Use `currentIndex` to show updates as they arrive
- **Click handling** — Always `e.stopPropagation()` (parent is an accordion toggle)

### Overlay Renderers

- **Full-featured** — Filters, sorting, searching, detailed views
- **No header needed** — The system provides the blue gradient header bar
- **Scrollable** — Content area is `overflow-auto`, just render your content
- **Dark mode** — Always provide `dark:` variants for all colors
- **Export options** — Copy, save functionality where relevant
- **Empty states** — Handle no-data gracefully with icon + message

### Styling Patterns

```tsx
// Standard "View all" button (use in inline renderers)
<button
    onClick={(e) => {
        e.stopPropagation();
        onOpenOverlay(`tool-group-${toolGroupId}`);
    }}
    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
>
    View all {count} results
</button>

// Card pattern for overlay items
<div className="p-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">

// Source badge
<Badge variant="default" className="text-xs">{source}</Badge>

// External link
<a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
    Read full article <ExternalLink className="w-3 h-3" />
</a>
```

---

## Existing Implementations (Reference)

### 1. News Headlines (`get_news_headlines`)

**Best example for a full custom implementation.**

| Component | Path |
|-----------|------|
| Inline | `news-api/NewsInline.tsx` |
| Overlay | `news-api/NewsOverlay.tsx` |

- **Inline:** 3x2 grid of article cards with images, source badges, dates, and "View all X articles" button
- **Overlay:** Full article list with source filtering buttons, newest/oldest sorting, images, full descriptions
- **Data shape:** `mcp_output.result` is `{ status, totalResults, articles: [{ source, title, description, url, urlToImage, publishedAt, content }] }`

### 2. Web Research (`web_search_v1`)

| Component | Path |
|-----------|------|
| Inline | `web-research/WebResearchInline.tsx` |
| Overlay | `web-research/WebResearchOverlay.tsx` |

- **Inline:** Research progress (sources browsed), top 5 findings with previews, "View complete research report" button
- **Overlay:** Cards view + Full Text view toggle, copy-all functionality, parsed findings with title/URL/preview
- **Data shape:** `mcp_output.result` is a text string with structured `Title:/Url:/Content Preview:` sections

### 3. Core Web Search (`core_web_search`)

| Component | Path |
|-----------|------|
| Inline | `core-web-search/CoreWebSearchInline.tsx` |
| Overlay | `core-web-search/CoreWebSearchOverlay.tsx` |

- Multi-query parallel search results
- **Data shape:** `mcp_output.result` contains multiple query results with URLs and snippets

### 4. SEO Tools (`seo_check_meta_tags_batch`, `seo_check_meta_titles`, `seo_check_meta_descriptions`)

- Analysis displays with pass/fail indicators, pixel width measurements, character counts
- **Data shape:** Arrays of analysis results with `_ok` boolean fields

### 5. Brave Search (`web_search`)

- Uses `step_data` for streaming partial results
- Adapts legacy `BraveSearchDisplay` component

---

## Debugging

### Tool Name Mismatch

The registry key must exactly match `mcp_input.name`. Check:

```tsx
import { hasCustomRenderer } from "./registry";
console.log(hasCustomRenderer("my_tool")); // true/false
```

### Viewing Raw Data

Open the modal → click the Settings toggle icon in the blue header → see the Input view with raw JSON.

### Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Generic renderer shown instead of custom | Registry key doesn't match `mcp_input.name` | Check exact spelling in registry |
| "View all" opens wrong tab | `toolGroupId` not destructured or wrong format | Ensure `onOpenOverlay(\`tool-group-${toolGroupId}\`)` |
| Overlay shows wrong tool's data | Overlay renderer searching full array | Overlay receives the group only — use `toolUpdates.find(...)` directly |
| No output data | Tool still running | Check `isComplete` before rendering |
| Images broken | Missing `onError` handler | Add fallback: `onError={(e) => e.currentTarget.style.display = "none"}` |

---

## Adding a New Tool — Checklist

- [ ] Create directory: `features/chat/components/response/tool-renderers/{tool-name}/`
- [ ] Create `{ToolName}Inline.tsx` implementing `ToolRendererProps`
- [ ] (Optional) Create `{ToolName}Overlay.tsx` implementing `ToolRendererProps`
- [ ] Create `index.ts` with barrel exports
- [ ] Register in `registry.tsx` with `displayName`, `resultsLabel`, `inline`, and optionally `overlay`
- [ ] Add export line in `features/chat/components/response/tool-renderers/index.ts`
- [ ] Verify: inline renders in chat, "View all" opens correct modal tab, toggle works
