# Socket.io → FastAPI Migration: Entry Point

> **This is the single starting point.** Read `00-MIGRATION-OVERVIEW.md` first, then the other docs in order.

---

## Document Map

| # | Document | What's In It | Read When |
|---|---|---|---|
| 0 | [00-MIGRATION-OVERVIEW.md](./00-MIGRATION-OVERVIEW.md) | Master plan: what exists, what's being replaced, status at a glance | **First — always** |
| 1 | [01-ROUTE-INVENTORY.md](./01-ROUTE-INVENTORY.md) | Per-route verified audit: transport, Redux deps, migration strategy, key files | Before touching any route |
| 2 | [02-UNIFIED-LAYER-SPEC.md](./02-UNIFIED-LAYER-SPEC.md) | What to build (and what NOT to — most infra already exists), endpoint contracts, canonical streaming pattern | Before writing any code |
| 3 | [03-MIGRATION-PLAYBOOK.md](./03-MIGRATION-PLAYBOOK.md) | Phase-by-phase execution, parallel work tracks, checklists, rollback plan | When executing migration |

---

## Quick Facts

- **Deadline:** 2 weeks to fully deprecate socket.io
- **Already migrated:** `/p/chat`, `/p/fast/[slug]`, `/p/fast-test/[slug]`, `/p/research`
- **No migration needed:** `/ai/runs`, `/notes`, `/p` (listing)
- **Must migrate:** `/ai/prompts`, `/prompt-apps`, `/scraper`, `/p/[slug]`, canvas
- **Deferred:** `/ai/cockpit`, `/ai/recipes`, `/applets`, `/apps`, `/chat`

## Core Architecture

```
Prompt/Builtin → POST /api/ai/agent/execute   (Agent path)
Raw Messages   → POST /api/ai/chat/unified    (Chat path)
Both return    → NDJSON stream (StreamEvent per line)
Parse with     → parseNdjsonStream() from lib/api/stream-parser.ts
Auth with      → useApiAuth() → getHeaders()
```

## Fastest Wins (Start Here)

1. **Phase 1 — `/p/[slug]`:** Swap one import (`PromptAppPublicRenderer` → `PromptAppPublicRendererFastAPI`). Takes 5 minutes. Zero risk.
2. **Phase 0 — Bridge Thunk:** Build `executeMessageFastAPI` thunk. Writes to same Redux slices. All existing UI works unchanged.
3. **Phase 3 — Scraper:** Replace `useScraperSocket` with direct FastAPI calls. Independent track.
