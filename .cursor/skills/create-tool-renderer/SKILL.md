---
name: create-tool-renderer
description: Create custom MCP tool result displays for the chat interface. Builds both inline (chat-stream preview) and overlay (full-screen modal) components with proper registry integration. Use when the user wants to add a new tool visualization, create a tool renderer, display tool results in chat, or mentions creating components for MCP tool output.
---

# Create Tool Renderer

Build custom visualizations for MCP tool results in the AI Matrx chat interface. Given a tool name and example output data, create production-ready inline + overlay components.

## Cardinal Rule: HIDE ABSOLUTELY NOTHING

Every piece of data received from a tool call MUST be displayed to the user. This is non-negotiable.

- If data arrives, it MUST appear somewhere in the UI — inline preview AND full overlay.
- This is NOT about only showing what looks pretty. It's about showing ALL data in the prettiest way possible.
- The inline component gives users the most important information at a glance so they rarely need to open the modal.
- The overlay modal provides EVERYTHING — every field, every nested object, every source, every metadata value.
- Never truncate data in the overlay Results tab without an expand mechanism. Truncation in inline is acceptable with "View all" to the overlay.
- If a field exists in the data, it gets rendered. Period.

## Prerequisites

The user must provide:
1. **Tool name** — the exact `mcp_input.name` string (e.g., `"web_search_v1"`)
2. **Example output data** — a sample of tool updates so you can type the data and build the UI

## System Architecture

```
features/chat/components/response/tool-renderers/
├── types.ts              # ToolRendererProps, ToolRenderer interfaces
├── registry.tsx          # Tool registry + helper functions
├── index.ts              # Barrel exports
├── GenericRenderer.tsx   # Fallback for unregistered tools
└── {tool-name}/          # One directory per custom tool
    ├── {Tool}Inline.tsx  # Required: compact chat-stream display
    ├── {Tool}Overlay.tsx # Required: full-screen modal display
    └── index.ts          # Barrel exports
```

The system wraps every overlay renderer in a `ToolGroupTab` that provides:
- A blue gradient header bar with tool name, subtitle, result count
- A toggle icon to switch between **Results**, **Input**, and **Raw** views
- Support for custom header subtitle and extras via registry functions
- **CRITICAL: Overlay renderers must NEVER render their own header or summary banner**

If your tool needs to show summary stats (e.g., "3 Passed, 2 Need Attention") or other contextual info in the header, use `getHeaderExtras` in the registry entry — NOT a custom header inside the overlay component.

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

### Data Comes in Many Formats

Tool output is NOT always JSON. Data arrives in multiple formats and your parser must handle all of them:

- **JSON objects/arrays** — standard `mcp_output.result` as parsed JSON
- **Structured text with XML-like tags** — e.g., `<read_result>`, `<search_result>`, `<title>` tags embedded in string output
- **Markdown with headers** — `###` headers, `**bold**` labels, `*` bullet lists used as semantic structure
- **Delimited text blocks** — `---` separators, `Title: ...` / `Url: ...` / `Description: ...` key-value patterns
- **Mixed formats** — JSON output containing markdown strings containing XML-like tags

Your parser function must:
1. Check if `mcp_output.result` is a string or object
2. If string: look for known structural patterns (XML tags, markdown headers, key-value blocks, delimiters)
3. Extract ALL data points — never skip a field because it's hard to parse
4. Handle `step_data` updates (status changes, summaries, intermediate results)
5. Handle `user_visible_message` updates (browsing URLs, status messages)

## The Three Modal Tabs

The overlay modal provides three tabs automatically. Understand what each must contain:

### Results Tab (your overlay component)
This is where your custom overlay renderer lives. It MUST display:
- **Every data point** from the tool output, organized beautifully
- **All metadata** — dates, sources, URLs, counts, statuses
- **All nested data** — expand sections, collapsible cards, tabbed views for sub-categories
- **All supplementary data** — additional sources, related items, previews, content excerpts
- View mode toggles, filters, search, and sorting when data volume warrants it
- Copy functionality for individual sections and full export

### Input Tab (automatic)
Shows the tool's input arguments. Provided by the system — no action needed.

### Raw Tab (automatic)
Shows ALL `ToolCallObject` entries as a JSON list. Provided by the system — no action needed. However, raw JSON alone is NOT sufficient for data display — the Results tab must present the same data in a structured, readable format.

## Step-by-Step Workflow

### 1. Create the directory

```
features/chat/components/response/tool-renderers/{tool-name}/
```

Use kebab-case for the directory name.

### 2. Analyze and Type ALL Data

Study the example output thoroughly. Type EVERY field, including:
- Nested objects and arrays
- Optional fields that may or may not appear
- String fields that contain structured text (markdown, XML tags, key-value pairs)
- Metadata like dates, counts, status fields, URLs

Put interfaces at the top of each component file or extract to a shared types file if complex.

### 3. Build a Comprehensive Parser

Create a parser function that extracts ALL data from `toolUpdates`. This is the foundation — if the parser misses data, the UI can never show it.

```typescript
function parseToolData(updates: ToolCallObject[]): ParsedToolData {
    const inputUpdate = updates.find((u) => u.type === "mcp_input");
    const outputUpdate = updates.find((u) => u.type === "mcp_output");
    const stepDataUpdates = updates.filter((u) => u.type === "step_data");
    const visibleMessages = updates.filter((u) => u.type === "user_visible_message");
    const errorUpdate = updates.find((u) => u.type === "mcp_error");

    // Extract from mcp_input
    const args = inputUpdate?.mcp_input?.arguments ?? {};

    // Extract from mcp_output — handle string vs object
    const rawResult = outputUpdate?.mcp_output?.result;
    const resultText = typeof rawResult === "string" ? rawResult
        : rawResult != null ? JSON.stringify(rawResult) : "";
    const resultObject = typeof rawResult === "object" ? rawResult : null;

    // Extract from step_data (intermediate results, summaries, status)
    // Extract from user_visible_message (browsing URLs, progress updates)
    // Parse structured text if result is a string with known patterns

    return { /* ALL extracted data */ };
}
```

### 4. Create the Inline Renderer

**File:** `{tool-name}/{Tool}Inline.tsx`

The inline component renders in the chat stream inside a collapsible accordion. It should give users MOST of what they need without opening the modal.

**Rules:**
- Always add `"use client";` directive
- Implement `ToolRendererProps` from `../types`
- Destructure `toolGroupId = "default"` from props
- Show the most valuable data upfront — not just 3 items, but the key information the user cares about
- Use `currentIndex` for progressive reveal: `toolUpdates.slice(0, currentIndex + 1)`
- Use staggered `animationDelay` with `animate-in fade-in` classes for smooth reveal
- Always use `e.stopPropagation()` on click handlers (parent is an accordion toggle)
- Handle missing images with `onError` fallbacks
- Use responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**What the inline MUST show:**
- A clear status indicator (loading, complete, error)
- The most important summary/preview of results
- Key metrics or counts (e.g., "4 Queries, 12 Deep Reads, 48 Additional Sources")
- A preview of the primary content (analysis excerpt, top results, key findings)
- A preview of secondary content (first few source cards, top items)
- Count of remaining items not shown inline
- A prominent "View full results" button to the overlay

**Standard "View all" button pattern:**
```tsx
{isComplete && onOpenOverlay && (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onOpenOverlay(`tool-group-${toolGroupId}`);
        }}
        className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer animate-in fade-in slide-in-from-bottom"
    >
        View complete results
    </button>
)}
```

### 5. Create the Overlay Renderer

**File:** `{tool-name}/{Tool}Overlay.tsx`

The overlay component renders inside the full-screen modal's Results tab. This is where ALL data lives.

**Rules:**
- Always add `"use client";` directive
- Implement `ToolRendererProps` from `../types`
- **CRITICAL: Do NOT render any header, title banner, or summary section** — the system provides a blue gradient header automatically via `ToolGroupTab`.
- Extract data with `useMemo` keyed on `[toolUpdates]`
- Always provide dark mode variants (`dark:` classes) — but prefer semantic color variables (see Styling below)
- Handle empty states with an icon + message
- Wrap content in `<div className="p-6 space-y-6 bg-background">` or similar
- Start directly with actionable content — no decorative headers

**What the overlay MUST show — EVERY piece of data:**
- All input parameters (queries, instructions, URLs, configurations)
- All intermediate data (browsing progress, step statuses, summaries)
- All primary output (analysis, results, content)
- All secondary output (additional sources with full descriptions AND content previews)
- All metadata (dates, domains, counts, categories, tags)
- Full text of all content — use collapsible sections for long text, never omit

**Required UX features for data-rich overlays:**
- **View mode toggles** — e.g., Analysis / Sources / Full Text
- **Copy buttons** — per-section copy AND full export copy
- **Collapsible sections** — for long text, show truncated with "Show more"/"Show less"
- **Search/filter** — when more than ~10 items exist
- **Sort options** — when items have sortable attributes (date, relevance)
- **External links** — always `target="_blank" rel="noopener noreferrer"` with `ExternalLink` icon

### 6. Create barrel export

**File:** `{tool-name}/index.ts`

```tsx
export { {Tool}Inline } from "./{Tool}Inline";
export { {Tool}Overlay } from "./{Tool}Overlay";
```

### 7. Register in the registry

**File:** `features/chat/components/response/tool-renderers/registry.tsx`

Add import at the top, then add entry to `toolRendererRegistry`:

```tsx
import { {Tool}Inline, {Tool}Overlay } from "./{tool-name}";

// Inside toolRendererRegistry:
"{exact_mcp_input_name}": {
    displayName: "Human Readable Name",
    resultsLabel: "Short Results Label",
    inline: {Tool}Inline,
    overlay: {Tool}Overlay,
    keepExpandedOnStream: true,
},
```

#### Registry Header Customization

The universal blue gradient header auto-detects a subtitle from input args and result counts. If your tool needs a **custom subtitle** or **extra content** in the header, use these optional registry fields:

```tsx
"{exact_mcp_input_name}": {
    displayName: "Human Readable Name",
    resultsLabel: "Short Results Label",
    inline: {Tool}Inline,
    overlay: {Tool}Overlay,
    keepExpandedOnStream: true,

    getHeaderSubtitle: (toolUpdates) => {
        // Return a custom string, or null for default behavior
        return "Custom subtitle text";
    },

    getHeaderExtras: (toolUpdates) => {
        // Return JSX rendered inside the blue gradient header
        return (
            <div className="flex items-center gap-3 text-white/90 text-xs mt-1">
                <span>4 Queries</span>
                <span>12 Deep Reads</span>
            </div>
        );
    },
},
```

### 8. Add to barrel exports

**File:** `features/chat/components/response/tool-renderers/index.ts`

Add: `export * from "./{tool-name}";`

### 9. Verify

- [ ] Inline shows meaningful preview data in the chat stream
- [ ] Inline shows key metrics, status, and content preview without opening the modal
- [ ] "View all" button opens the correct modal tab
- [ ] Overlay Results tab shows ALL data — nothing omitted
- [ ] Overlay has view modes, copy buttons, collapsible sections as needed
- [ ] If using `getHeaderExtras`, verify extras appear in the blue header
- [ ] Dark mode looks correct using semantic color variables
- [ ] Empty states handled with icon + message
- [ ] No lint errors

## Loading States for Long-Running Tools

When a tool is long-running (web research, deep analysis, multi-step processes), loading states MUST reflect reality. Generic spinners are NOT acceptable.

### Required Loading Patterns

**1. Progressive status messages** — cycle through realistic phase descriptions:
```typescript
const PHASES = [
    "Scraping page content...",
    "Reading page content...",
    "Sending to research agent...",
    "Summarizing findings...",
] as const;
```
Use randomized durations (3-7s per phase) for natural, non-robotic timing.

**2. Per-item progress cards** — when processing multiple items (URLs, queries):
- Show each item as a card with its own phase progression
- Use staggered `animationDelay` for natural appearance
- Show completion state (checkmark) when an item finishes
- Active items show pulsing dots or spinner

**3. Aggregate waiting indicator** — after individual items complete:
- Show a summary "brain" indicator with messages like "Comparing sources...", "Putting it all together..."
- Use `user_visible_message` updates to drive real status when available
- Fall back to timed phases only when no real status is streaming

**4. Step data awareness** — use `step_data` updates for real progress:
```typescript
const isSummarizing = updates.some(
    (u) => u.type === "step_data" && u.step_data?.status === "summarizing"
);
```

**5. Browsing/activity indicators** — when URLs are being visited:
- Show favicon + domain for each URL
- Show active processing state with pulsing animation
- Transition to completed state as results arrive

See `WebResearchInline.tsx` for the gold-standard implementation of all five patterns.

## Styling Standards

### Color System — USE PROJECT VARIABLES

**CRITICAL:** Use semantic Tailwind color variables defined in `globals.css`. Never hardcode hex/HSL values or use generic Tailwind colors like `blue-500` or `slate-800` unless you have a specific reason.

**Required color classes:**

| Purpose | Class |
|---------|-------|
| Primary actions, links, active states | `text-primary`, `bg-primary`, `border-primary` |
| Primary on colored bg | `text-primary-foreground` |
| Body text | `text-foreground` |
| Secondary text, labels | `text-muted-foreground` |
| Card backgrounds | `bg-card` |
| Page background | `bg-background` |
| Subtle backgrounds | `bg-muted`, `bg-accent` |
| Borders | `border-border` |
| Success states | `text-success`, `bg-success` |
| Warning states | `text-warning`, `bg-warning` |
| Error states | `text-destructive`, `bg-destructive` |
| Info states | `text-info`, `bg-info` |

**Opacity modifiers for subtle effects:**
- `bg-primary/5` — very subtle primary tint for backgrounds
- `bg-primary/10` — light primary tint for badges, tags
- `border-primary/20` — subtle primary border for active items
- `text-foreground/80` — slightly muted body text

**Dark mode:** The semantic variables auto-switch for dark mode. Only add explicit `dark:` overrides for special cases. For example: `bg-card` already handles light/dark — no need for `dark:bg-slate-800`.

### Component Library

- **Icons:** Lucide React only
- **Spacing:** `space-y-3` for inline, `space-y-4` or `space-y-6` for overlay
- **Cards:** `bg-card rounded-lg border border-border`
- **Hover states:** `hover:border-primary/30 transition-colors`
- **Badges:** `@/components/ui/badge` — `<Badge variant="default">`
- **Buttons:** `@/components/ui/button` — `<Button variant="outline" size="sm">`
- **External links:** Always `target="_blank" rel="noopener noreferrer"` with `ExternalLink` icon
- **Markdown rendering:** `@/components/mardown-display/chat-markdown/BasicMarkdownContent` for rich text

### Animation Classes

```
animate-in fade-in slide-in-from-left    — for items entering from the left
animate-in fade-in slide-in-from-bottom  — for items entering from below
```

Use staggered delays:
```tsx
style={{
    animationDelay: `${index * 80}ms`,
    animationDuration: "300ms",
    animationFillMode: "backwards",
}}
```

## Reference Example

**Best example to study:** The Web Research tool renderer — it handles the most complex data format (JSON + structured text + XML-like patterns + browsing progress).

| File | Path |
|------|------|
| Inline | `features/chat/components/response/tool-renderers/web-research/WebResearchInline.tsx` |
| Overlay | `features/chat/components/response/tool-renderers/web-research/WebResearchOverlay.tsx` |
| Barrel | `features/chat/components/response/tool-renderers/web-research/index.ts` |
| Registry entry | `registry.tsx` — key `"web_search_v1"` |

**What makes it excellent:**

*Inline:*
- Progressive loading with per-page phase cards and per-phase status messages
- Realistic timing with randomized durations (not robotic intervals)
- Query badge pills shown during streaming
- Status bar that transitions: loading -> analyzing -> complete with stats
- Browsing progress cards with favicons, domains, and real-time phase indicators
- Waiting indicator after all pages process with cycling brain messages
- AI analysis preview (truncated to ~400 chars)
- Top 3 source preview cards with favicons, dates, descriptions
- "+N more sources" indicator
- Prominent "View complete research report" button with full stat line

*Overlay:*
- Three view modes: Analysis / Sources / Full Text (raw export)
- Search queries shown as badge pills with copy button
- Agent-to-agent instructions shown in full when present
- Pages Read section with favicon chips for every URL visited
- Full AI analysis rendered as markdown, split into section cards when headers are found
- ALL additional sources shown as rich cards with: title, domain, date, description, content preview (collapsible)
- Per-section and per-source copy buttons
- Full text export with "Copy All Text" button
- Footer stat line

*Parser:*
- Handles `mcp_input` arguments (queries array or single query, instructions)
- Handles `user_visible_message` browsing URLs
- Handles `step_data` summaries (web_result_summary with text content)
- Handles `mcp_output.result` as string — parses structured text blocks with regex
- Extracts AI analysis text (strips delimiters, headers)
- Extracts unread source cards from `Title: / Url: / Description: / Content Preview:` blocks
- Never drops a data point

Read these files before building any new tool renderer. They set the standard.

## Checklist Before Marking Complete

- [ ] Parser extracts EVERY field from the tool data — nothing is ignored
- [ ] Inline gives users enough info they may not need the modal
- [ ] Overlay Results tab shows ALL data — every field, every source, every nested value
- [ ] Overlay has view modes / tabs when multiple data categories exist
- [ ] Copy buttons exist for sections and full export
- [ ] Collapsible sections handle long text (never omit, always expandable)
- [ ] Loading states match reality for long-running tools (not generic spinners)
- [ ] Colors use semantic project variables (`text-primary`, `bg-card`, `border-border`, etc.)
- [ ] Dark mode works via semantic variables (no hardcoded colors)
- [ ] Empty states render with icon + message
- [ ] No duplicate header in overlay (system provides the blue gradient header)
- [ ] Registry entry includes `getHeaderExtras` if tool has summary stats
- [ ] All external links use `target="_blank" rel="noopener noreferrer"`
