# Decisions Log — Prompts → Agents Migration

Append one entry per decision. Never edit past entries; supersede with a new entry that links to the old one.

## Format

```
### YYYY-MM-DD — <short title>
**Phase:** N | all
**Decision:** <one sentence>
**Rationale:** <why>
**Consequences:** <what breaks if we reverse this, what is now true>
```

---

### 2026-04-20 — Dead concepts excluded from migration scope
**Phase:** all
**Decision:** No recipe→anything converter will be built. No prompt→agent converter will be built.
**Rationale:** All active recipes were long since converted to prompts, and all active user/system prompts have already been converted to agents. Users have no remaining source material to convert.
**Consequences:** `api/recipes/[id]/convert-to-prompt` is dead code (removed in Phase 17). No data-migration phase exists in this plan.

### 2026-04-20 — Shortcuts are multi-scope from day one
**Phase:** 1–13
**Decision:** Shortcuts, categories, and content blocks are CRUDable at admin (global), user (personal), and organization scopes from the first migration commit.
**Rationale:** The old system was admin-only and the UnifiedContextMenu already contained unused placeholders for user/org scopes. Building multi-scope as a retrofit would mean touching every shortcut file twice.
**Consequences:** `shortcut_categories` needs scope columns (Phase 1 DB migration). CRUD UI components must be scope-agnostic and mounted three times (admin/user/org routes). RLS must enforce scope boundaries.

### 2026-04-20 — Code editor: two-step replacement
**Phase:** 6 & 15
**Decision:** Phase 6 is a quick `usePromptRunner → useAgentLauncher` wrapper just to keep the one live coding feature (prompt_app component editing) working. Phase 15 is a full rebuild on agent tools with VSCode-style context slots.
**Rationale:** The new agent tool system is rich enough to eventually power a VSCode extension. Doing the big rebuild now would block too many downstream phases; doing only a wrapper permanently would lock in the weakest design.
**Consequences:** Phase 6 code will be deleted in Phase 15. Anything built in Phase 6 should be thin.

### 2026-04-20 — `(a)/chat` is an agent-runner shell
**Phase:** 7
**Decision:** The chat route lives under `(a)/chat` and is implemented as a thin shell over the existing agent runner. Agent selection spans own / system / community agents.
**Rationale:** If the execution-system is correct, chat is ~95% automatic. Resisting the temptation to build chat-specific state keeps the RTK surface clean.
**Consequences:** Chat does not get its own slices. `lib/ai/aiChatSlice` is deprecated in Phase 20.

### 2026-04-20 — Applets vision captured, not ported verbatim
**Phase:** 10
**Decision:** The `features/applet/` parent-app-with-children pattern (and its shared-context concept) is captured as an **agent-native pattern** built on `context-slots-management` — not by moving applet code over.
**Rationale:** The applets system predates real cross-app context sharing; now that context slots exist, the clean expression of that vision is an agent pattern, not a carried-over feature.
**Consequences:** `features/applet/` eventually deprecates (after Phase 10). `app/(authenticated)/apps/custom/*` routes redirect or sunset.
