# Phase 8 — Agent Apps Public Runner

**Status:** not-started
**Owner:** _unassigned_
**Prerequisites:** Phase 5
**Unblocks:** Phase 9, Phase 10

## Goal

Build `/p/[slug]` for agents with feature parity to the prompt-apps system: Babel-transformed JSX/TSX with import allowlisting, rate-limiting (fingerprint + IP), guest execution tracking, public SELECT/private CRUD RLS.

## Success criteria
- [ ] New DB tables: `agent_apps`, `agent_app_executions`, `agent_app_errors`, `agent_app_rate_limits`, `agent_app_versions`, `agent_app_categories`. Schema mirrors prompt-apps equivalents but keys off `agx_agent` / `agx_version`.
- [ ] `features/agent-apps/` feature directory with public renderer (port `PromptAppPublicRendererFastAPI` pattern), editor, creation flows.
- [ ] Public API: `/api/public/agent-apps/[slug]/execute` + `/api/public/agent-apps/response/[taskId]`.
- [ ] Babel import allowlist (`allowed-imports.ts`) ported verbatim — security-critical, review carefully.
- [ ] Guest limit / fingerprint services reused unchanged (they're agent/prompt-agnostic).
- [ ] `/p/[slug]` resolves agent apps before falling back to prompt apps during the dual-run window.

## Change log
| Date | Who | Change |
|---|---|---|
