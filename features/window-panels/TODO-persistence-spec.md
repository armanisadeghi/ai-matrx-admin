# Window Persistence Spec

## Core Concept
Every window registers as a row in a single `windows` table. On refresh, the app reads window IDs from URL params, fetches all configs in one query, and components self-organize based on their type.

## Database Table

```sql
create table windows (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  data jsonb not null default '{}',
  panel_state jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_windows_type on windows(type);
create index idx_windows_updated_at on windows(updated_at);
```

### `panel_state` Column
Stores the WindowPanel's own layout/UI state: size, position, sidebar open/closed, active tab, etc. This is universal across all window types — every window has it because every window uses WindowPanel.

### `panel_state` Save Triggers (ONLY these two)
1. **Piggyback** — when `data` is being saved for any reason, include current `panel_state` in the same write.
2. **Explicit** — user clicks "Save Window State" in the sidebar's window manager.

**No other saves.** Moving, resizing, toggling sidebar, switching tabs — none of these trigger a database write on their own.

## Window Type Registration
Every window type is registered in a central registry mapping a `type` string to its component and config. This is the single source of truth — the database `type` column matches these keys exactly.

```ts
// Example structure — not prescriptive on implementation
const windowRegistry = {
  scrape: { component: ScrapeWindow, label: "Web Scraper" },
  agents: { component: AgentsWindow, label: "Agents" },
  editor: { component: EditorWindow, label: "Editor" },
  // ...new types just add an entry here
};
```

Adding a new window type = register it here. No URL logic changes, no persistence changes.

## URL Structure
- Window IDs stored as URL params (e.g. `?w=uuid1,uuid2,uuid3`)
- App doesn't need to know window types at load time — just IDs

## Three Data Patterns (One Table)

| Pattern | What's in `data` | Component behavior |
|---|---|---|
| **Full state** | Complete window state as JSON | Render immediately from `data` |
| **UI state** | Minimal UI state (scroll pos, selections, etc.) | Render immediately from `data` |
| **DB reference** | `{table, id}` or similar pointer | Component does a second fetch to hydrate |

## WindowPanel Core Component
WindowPanel is the reusable wrapper for all windows. It owns:
- Size, position, sidebar state, open tabs, and all universal panel UI
- Reading/writing `panel_state` — consumers never touch this
- Enforcing the two save triggers above (piggyback + explicit)
- Exposing a save callback so child components can trigger a `data` save (which auto-includes `panel_state`)

**Consumers only worry about their own `data` field.** Panel layout persistence is invisible to them.

## Key Decisions
- **One row per window** — not one monolithic state blob. Better write perf, independent caching, per-window undo/redo potential, no conflict on concurrent updates.
- **No server-side RPC resolution** — components fetch their own referenced data. Better parallelism, simpler error handling, no coupling between window system and schema.
- **Full UUIDs for now** — don't optimize to short IDs until URL length is actually a problem.
- **JSONB not JSON** — faster queries and indexing.
- **Each window manages its own persistence cadence** — on blur, debounced, whatever fits the component.
- **`panel_state` is never saved independently** — only on piggyback or explicit user action. No DB writes on move/resize.