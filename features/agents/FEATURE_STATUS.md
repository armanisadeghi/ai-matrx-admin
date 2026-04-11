# Agent Feature Status

## AgentCard (Grid at `/agents/`)

Icon buttons in the card footer + click-to-open `AgentActionModal`:

| Feature | Status |
|---|---|
| ~~Run agent~~ (`/agents/[id]/run`) | ✅ Working |
| ~~Edit agent~~ (`/agents/[id]/build`) | ✅ Working |
| ~~View agent~~ (`/agents/[id]/run`) | ✅ Working |
| ~~Duplicate agent~~ (calls `onDuplicate` → RPC) | ✅ Working |
| ~~Share~~ (opens `ShareModal`) | ✅ Working |
| ~~Edit Details~~ (opens `AgentMetadataModal`) | ✅ Working |
| ~~Save as Template~~ (`POST /api/agents/[id]/convert-to-template`) | ✅ Working |
| Create App | ⚠️ Coming Soon (modal stub) |
| Admin → Convert to Agent Builtin | ⚠️ Coming Soon (admin only, modal stub) |
| Favorite / unfavorite | ✅ Working |
| Delete | ✅ Working |

### `AgentActionModal` (click on card)

| Action | Status |
|---|---|
| ~~Run Agent~~ | ✅ Working |
| ~~Edit Agent~~ | ✅ Working |
| Create App | ⚠️ Coming Soon |
| ~~View~~ | ✅ Working |
| ~~Duplicate~~ | ✅ Working |
| ~~Share~~ | ✅ Working |
| Delete | ✅ Working |

---

## AgentOptionsMenu (dropdown in builder header at `/agents/[id]/build`)

### General Items

| Feature | Status |
|---|---|
| ~~Edit Agent Info~~ (opens settings window panel) | ✅ Working |
| View Run History | ⚠️ Coming Soon |
| View All Versions | ⚠️ Coming Soon |
| Advanced Settings View | ⚠️ Coming Soon |
| Matrx Agent Optimizer | ⚠️ Coming Soon |
| Full Screen Editor | ⚠️ Coming Soon |
| Open Run Modal | ⚠️ Coming Soon |
| Duplicate | ⚠️ Coming Soon |
| ~~Convert to Template~~ (`POST /api/agents/[id]/convert-to-template`) | ✅ Working |
| Create App | ⚠️ Coming Soon |
| Add Data Storage Support | ⚠️ Coming Soon |
| Try Interface Variations (sub-menu) | ⚠️ Coming Soon |

### Admin Items

| Feature | Status |
|---|---|
| Convert/Update System Agent | ⚠️ Coming Soon (admin only) |
| Create/Update Shortcut | ⚠️ Coming Soon (admin only) |
| Find Usages | ⚠️ Coming Soon (admin only) |

---

## Template System (`/agents/templates/`)

| Feature | Status |
|---|---|
| ~~Templates listing page~~ (`/agents/templates`) | ✅ Working |
| ~~Template detail page~~ (`/agents/templates/[id]`) | ✅ Working |
| ~~Use Template~~ (creates agent → redirects to `/agents/[id]/build`) | ✅ Working |
| ~~Save as Template from AgentCard~~ | ✅ Working |
| ~~Save as Template from builder dropdown~~ | ✅ Working |
| Template search / filtering | ⚠️ Not built |
| Template categories / tags UI | ⚠️ Not built |
| Template preview with variable inputs | ⚠️ Not built |

---

## Notes

- "Duplicate" in the builder dropdown calls `comingSoon()` — it is **not** wired to the same RPC as the AgentCard duplicate button. These should be unified.
- Share is not in the builder dropdown — could be added alongside "Convert to Template."
- `AgentActionModal` is a `Dialog` — should be converted to `Drawer` on mobile per project conventions.
