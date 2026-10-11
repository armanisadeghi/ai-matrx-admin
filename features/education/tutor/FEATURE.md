# FEATURE.md — AI Tutor (`features/education/tutor`)

**Status:** `active` · **Tier:** `1` · Product: common-docs/systems/education/VISION.md.

One conversational tutor, grounded in the learner's OWN material, remembering across sessions and
honest about the edge of what it knows. Not a new chat store: the canonical `/chat` agent-execution
+ conversation infra, education-skinned, plus **grounding injection**. Conversations are
`chat.conversation` rows tagged `source_feature: "education-tutor"` — never fork a conversation store.

## Where it lives

- Routes `app/(core)/education/tutor/`: `TutorHome` (list-first), `new` and `[conversationId]` ->
  `EducationTutorClient` (fresh mints a grounded conversation and promotes the URL after the first
  message via `useConversationRoutePromotion`; `embedded` mode powers AskTutor panels).
- `AskTutorButton` is the shared "ask my tutor" primitive (takes a `seed`; docks in
  `MatrxDynamicPanelHost`, never a blocking `Sheet`).
- Every study surface carries it (deck study, Write, Test, Match, assessment taker, study guide, mind map, kit hub, summary, notes); per-row "Ask why" lists (assessment results, Fast Fire) render ONE `AskTutorPanel` re-seeded per row. Seeds come only from `seeds.ts`.
- `mandates.ts`: `education.tutor_message` via `useMandate`; an unresolved mandate REFUSES with the
  error visible, never a fallback agent id.
- `learnerMemory.ts` is THE cross-session memory assembler (study spine, FSRS `item_mastery`,
  streak, goals); `lanes/learnerContext.ts` only reshapes the CURRENT session — do not confuse them.
- `settings.ts` (durable `userPreferences.tutor.*`, vocabulary in `types.ts` shared with the
  manifest); `lanes/` are one-shot JSON lanes for flashcards surfaces (`helpLive`, `reviewSession`
  float; `microCoach` is headless and toasts).

## Grounding (load-bearing)

Retrieval contract: IC-3 in `common-docs/systems/education/INTEGRATION_MAP.md`.

- Zero user-facing agent variables. Grounding is CONTEXT, not input: `EducationTutorClient`
  dispatches `setContextEntries(...)`, re-sent every turn.
- Before every idle send the awaited `beforeExecute` (`prepareTutorTurn`) runs
  `retrieveGroundedPassages` over the learner's exact `(source_kind, source_id)` inventory
  (`listLearnerOwnedGroundingSources` -> `files.my_rag_jobs('completed')`). Empty inventory fails
  closed; a search failure aborts before the composer is snapshotted (the draft is never lost).
  The pre-send window says "Searching your study material"; a failure stays with Retry.
- **Source scope:** a seed with `studyContext: { entityType, entityId, title? }` (kit `scope`, `fc_set`, `note`, `study_media`, `assessment`, a Source itself) searches ONLY that place's Sources (`sourceScope.ts` → `corpus: explicit`); none mappable = whole library; a read failure refuses the send. `TutorSourceStrip` shows them (chips open) with "All my material" to widen.
- The Holder reads the request-only `tutor_retrieved_evidence` key (passages + seed + weak-card
  digest), which surface auto-context policy cannot filter. Four fixed `tutor_grounding_citation_N`
  slots overwrite every send (unused blank) and persist chunk/file/document/page coordinates on the
  user turn; full passages stay deferred, never duplicated into the message row.

## Trust

- **Per turn:** the agent emits one hidden `<!--MATRX_TRUST_V1 {...}-->` on the final line of every
  answer. `extractTurnTrust()` coerces it via `coerceTrustEnvelope`; `reconcileTurnTrust` keeps only
  citation ids present in the same-turn retrieved CHUNK result or the persisted ledger and restores
  canonical title/file/document/page, so a fabricated id can never make a turn `grounded`. Rendered by
  `TutorTurnTrust` via `afterMessages`.
- **Pre-answer only:** `TutorTrustStrip` shows `deriveGroundingTrust` (floored at `inferred`) for a
  fresh conversation. An old or malformed answer with no envelope gets no reconstructed claim.
- Low-confidence or unverified rerank fails closed.

## Voice and inline help

Spoken round-trip comes from `AgentConversationColumn`; no audio code lives here. On `StudyDeck`,
`VoiceTutorPanel` is deliberately card-grounded, not document-RAG (no web tool; hands off to the full
tutor); `AskTutorButton` uses the same seed for typed help via `flashcards.help_live`
(`LiveHelpAnswerBlock`, carries a `TrustEnvelope`).

## Invariants

- The composer draft is read imperatively in the surface's `getScope()` (`store.getState()`), never a selector (re-render on every keystroke).
- Send is metered, view is access-gated: the composer binds `useEntitlement` (`education.tutor_message`; limits in `billing.capability*`, header of `features/entitlements/registry.ts`); the existing-conversation view binds `useAccess("conversation", id)` (view-only sharee: read-only transcript; owner: `ShareButton`). Both fail open while resolving; RLS is the boundary.
- Surface `matrx-user/education-tutor` write targets: `teaching_mode`, `personality_style` (same `useSetting` path as `TutorSettingsPanel`) and `tutor_message_draft` (`replace|append`; the draft is sacred; refuses while `send_blocked`). A read-only shared view registers NO handlers. NOT writable: `learner_memory`, `study_material`/`grounding_seed`, trust envelopes, gate/sharing values. Validation: `tutorConversationAgentWrites.ts`.

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/education/STATE.md — read it before touching this feature in ANY repo.
