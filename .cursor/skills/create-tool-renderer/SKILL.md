---
name: create-tool-renderer
description: Create custom MCP tool result displays for the chat interface. Builds both inline (chat-stream preview) and overlay (full-screen modal) components with proper registry integration. Use when the user wants to add a new tool visualization, create a tool renderer, display tool results in chat, or mentions creating components for MCP tool output.
---

# Create Tool Renderer

Build custom visualizations for MCP tool results in the AI Matrx chat interface. Given a tool name and example output data, create production-ready inline + overlay components.

## Prerequisites

The user must provide:
1. **Tool name** — the exact `mcp_input.name` string (e.g., `"api_news_fetch_headlines"`)
2. **Example output data** — a sample of `mcp_output.result` so you can type the data and build the UI

## System Architecture

```
features/chat/components/response/tool-renderers/
├── types.ts              # ToolRendererProps, ToolRenderer interfaces
├── registry.tsx          # Tool registry + helper functions
├── index.ts              # Barrel exports
├── GenericRenderer.tsx   # Fallback for unregistered tools
└── {tool-name}/          # One directory per custom tool
    ├── {Tool}Inline.tsx  # Required: compact chat-stream display
    ├── {Tool}Overlay.tsx # Optional: full-screen modal display
    └── index.ts          # Barrel exports
```

The system wraps every overlay renderer in a `ToolGroupTab` that provides:
- A blue gradient header bar with tool name, subtitle, result count
- A toggle icon to switch between Results and Input views
- **Overlay renderers must NOT render their own header**

## Data Shape

Every tool update is a `ToolCallObject`:

```typescript
interface ToolCallObject {
    id?: string;
    type: "mcp_input" | "mcp_output" | "mcp_error" | "step_data" | "user_visible_message";
    mcp_input?: { name: string; arguments: Record<string, any> };
    mcp_output?: Record<string, unknown>;
    mcp_error?: string;
    step_data?: { type: string; [key: string]: any };
    user_visible_message?: string;
}
```

Your components receive `toolUpdates: ToolCallObject[]` scoped to one tool call group.

## Step-by-Step Workflow

### 1. Create the directory

```
features/chat/components/response/tool-renderers/{tool-name}/
```

Use kebab-case for the directory name.

### 2. Define TypeScript interfaces

Type the tool's output data based on the user's example. Put interfaces at the top of each component file (inline and overlay share the same types — duplicate them or extract to a shared file if complex).

### 3. Create the Inline Renderer

**File:** `{tool-name}/{Tool}Inline.tsx`

The inline component renders in the chat stream inside a collapsible accordion. Rules:
- Always add `"use client";` directive
- Implement `ToolRendererProps` from `../types`
- Destructure `toolGroupId = "default"` from props
- Show a compact preview (3-6 items max)
- Add a "View all X results" button that calls `onOpenOverlay(\`tool-group-${toolGroupId}\`)`
- Always use `e.stopPropagation()` on click handlers (parent is an accordion toggle)
- Use `currentIndex` for progressive reveal: `toolUpdates.slice(0, currentIndex + 1)`
- Use staggered `animationDelay` with `animate-in fade-in` classes for smooth reveal
- Handle missing images with `onError` fallbacks
- Use responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**Standard "View all" button pattern:**
```tsx
{hasMore && onOpenOverlay && (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onOpenOverlay(`tool-group-${toolGroupId}`);
        }}
        className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
    >
        View all {count} results
    </button>
)}
```

### 4. Create the Overlay Renderer (optional but recommended)

**File:** `{tool-name}/{Tool}Overlay.tsx`

The overlay component renders inside the full-screen modal. Rules:
- Always add `"use client";` directive
- Implement `ToolRendererProps` from `../types`
- **Do NOT render a header** — the system provides a blue gradient header automatically
- Extract data with `useMemo` keyed on `[toolUpdates]`
- Go full-featured: filters, sorting, searching, copy-all, view toggles
- Always provide dark mode variants (`dark:` classes)
- Handle empty states with an icon + message
- Wrap content in `<div className="p-4 space-y-4">` or similar

### 5. Create barrel export

**File:** `{tool-name}/index.ts`

```tsx
export { {Tool}Inline } from "./{Tool}Inline";
export { {Tool}Overlay } from "./{Tool}Overlay";
```

### 6. Register in the registry

**File:** `features/chat/components/response/tool-renderers/registry.tsx`

Add import at the top, then add entry to `toolRendererRegistry`:

```tsx
import { {Tool}Inline, {Tool}Overlay } from "./{tool-name}";

// Inside toolRendererRegistry:
"{exact_mcp_input_name}": {
    displayName: "Human Readable Name",
    resultsLabel: "Short Results Label",  // Tab label in overlay
    inline: {Tool}Inline,
    overlay: {Tool}Overlay,               // Optional
    keepExpandedOnStream: true,           // Keep visible when AI starts typing
},
```

### 7. Add to barrel exports

**File:** `features/chat/components/response/tool-renderers/index.ts`

Add: `export * from "./{tool-name}";`

### 8. Verify

- [ ] Inline renders in the chat stream with preview items
- [ ] "View all" button opens the correct modal tab
- [ ] Overlay shows full results without a duplicate header
- [ ] Input toggle in blue header works
- [ ] Dark mode looks correct
- [ ] Empty states handled
- [ ] No lint errors

## Reference Example

**Best example to study:** The News API tool renderer.

| File | Path |
|------|------|
| Inline | `features/chat/components/response/tool-renderers/news-api/NewsInline.tsx` |
| Overlay | `features/chat/components/response/tool-renderers/news-api/NewsOverlay.tsx` |
| Barrel | `features/chat/components/response/tool-renderers/news-api/index.ts` |
| Registry entry | `registry.tsx` — key `"api_news_fetch_headlines"` |

**Data shape for this example:**
```typescript
interface NewsApiResult {
    status: string;
    totalResults: number;
    articles: Array<{
        source: { id: string | null; name: string };
        author: string | null;
        title: string;
        description: string | null;
        url: string;
        urlToImage: string | null;
        publishedAt: string;
        content: string | null;
    }>;
}
// Accessed via: outputUpdate.mcp_output.result as NewsApiResult
```

**What makes it great:**
- Inline: 3x2 responsive card grid with images, source badges, dates, staggered animations
- Overlay: Full article list with source filter buttons, sort by newest/oldest, images, descriptions
- Handles missing images with placeholder SVG fallback
- Clean empty state with icon when filters return no results

For the full implementation details, read the reference files listed above.

## Styling Standards

- **Icons:** Lucide React only
- **Colors:** Use semantic Tailwind classes with `dark:` variants
- **Spacing:** `space-y-3` for inline, `space-y-4` for overlay
- **Cards:** `bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700`
- **Hover states:** `hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all`
- **Badges:** `@/components/ui/badge` — `<Badge variant="default">`
- **Buttons:** `@/components/ui/button` — `<Button variant="outline" size="sm">`
- **External links:** Always `target="_blank" rel="noopener noreferrer"` with `ExternalLink` icon
