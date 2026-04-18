# Agent System Audits

Post-unification audit reports. Generated after Phase 9 package scaffold
landed; use as reference for follow-up cleanup work.

- [`01-new-work-audit.md`](./01-new-work-audit.md) — correctness bugs + integration gaps in Phase 5–9 work. Critical items were fixed in-session.
- [`02-chat-rewrite-gap-map.md`](./02-chat-rewrite-gap-map.md) — what to keep / rewrite / delete in `features/cx-chat/`, `cx-conversation/`, `conversation/`, `chat/` when rebuilding the chat UI on `@matrx/agents`.
- [`03-type-duplication-scan.md`](./03-type-duplication-scan.md) — local types that shadow global / DB / canonical definitions. Prioritized list.
- [`04-legacy-obliteration-plan.md`](./04-legacy-obliteration-plan.md) — wave-by-wave deletion of deprecated aliases, legacy shims, and vestigial naming.
