# Spoken Practice — FEATURE.md

**Route:** `/education/practice-oral` (`?mode=oral_exam|interview_prep|debate|pronunciation`; entry `practice-oral` in `features/education/data/tools.ts`). **Status:** Live. Product: common-docs/systems/education/VISION.md.

The student answers OUT LOUD; a mode-framed examiner / interviewer / debate opponent / language
coach poses grounded prompts, grades each answer on meaning, then closes with a batch review.

## The one rule: reuse the voice + grading + spine stack, never fork it

New voice surface = new prompt/rubric + orchestration UI, NOT a new capture or grading path.
Reused: `continuousCapture` (`features/flashcards/fast-fire/audio/`), the spoken-grade primitives in
`features/flashcards/fast-fire/agents/grading-core.ts` (`uploadResponseClip`, `runSpokenGrader`,
`coerceSpokenGrade` -> `SpokenGrade`), `studyService`, `useCartesiaSpeaker`, and
`features/education/trust`. In-feature: `data/gradePracticeAnswer.ts` (upload -> grade -> record),
`data/reviewPracticeSession.ts` (writes `session_review`).

**Dedicated mode-aware mandates** (`mandates.ts` `SPOKEN_PRACTICE_MANDATES`; the DB picks the agent).
Never reuse the FastFire flashcard grader or review lane (flashcard and tool-narration framing):
`design` (+ `design_language` for pronunciation: target-language phrase in guillemets + English
gloss), `grade` (mode rides as FACTUAL data on the first line of `rubric`), `grade_pronunciation`
(same `SpokenGrade` plus optional `pronunciation {accuracy, fluency, intelligibility, prosody, notes}`),
`review` (tools disabled; `{summary, strengths[], weaknesses[]}`). Pronunciation is holistic
transcript-level judgment, never phoneme scores — the UI says so. Mode config:
`constants.ts#MODE_CONFIG`; manifest/validator vocabulary: `vocabulary.ts`.

## Data model — no new table

Session = one `education.study_session` (`mode` free-form; `settings.prompts[]` holds the designed
plan; `source_kind` `set` or `topic`; `session_review`, `aggregate_score`, `session_audio_file_id` set
at the end). Each answer = one `study_attempt` via `gradeSpokenAnswer` -> `study_record_attempt`:
`item_type` `spoken_prompt` (`SPOKEN_PROMPT_ITEM_TYPE`), `item_id` a client-minted uuid per prompt
(polymorphic, no FK), `method` = the mode, `response_kind` `spoken`.

## Invariants

- `useSpokenPractice` phase machine (generating -> warm mic -> create session -> asking (TTS) ->
  answering (press Done; `ANSWER_MAX_SECONDS` runaway guard only) -> grading -> result -> reviewing ->
  summary) is local state, not Redux; audio never enters state (only `file_id`s and grades).
- **Completion is terminal-FIRST:** `endSession` marks the session `completed` + `ended_at` +
  `aggregate_score` as its first await, before the best-effort audio upload and review. A failed
  upload or review never leaves an `active` session.
- Every prompt carries a `TrustEnvelope` (`data/grounding.ts#promptTrust`). Grades are on meaning
  (`SpokenGrade.verdict` is a `GradeVerdict`); never string-match.
- Verdicts render through `AnswerGradeBlock` / `BatchReviewBlock` (shared kind components); the three
  runs stream inline with `LiveRunDisplay` via `onConversationCreated` + `useLiveRunHandle`.
- Metered by `education.spoken_practice` (pronunciation reuses it): `useEntitlementGuard` +
  `EntitlementMeter` (`billing.capability*`, header of `features/entitlements/registry.ts`).
- Surface `matrx-user/education-practice-oral`: `setupSnapshot.ts` keeps `getScope` synchronous; two
  `ask` targets (`practice_mode`, composite `practice_setup`, validated in `setupWrites.ts` against the
  patched result) register only while `phase === "idle"`. Starting a session is NOT agent-writable
  (spends a run, opens the mic, meters); `session_prompts` is the answer key (`autoContext: false`).
- **Setup is a Create page (1 Sources, 2 Style and details, 3 Start)** on the ONE `SourceInput`
  (surface key `education-practice-oral:<mode>`, no Topic tile — the focus is the topic, deliveries
  `direct`). A deck is a Source (`fc_set`, Use existing "Decks"; `?deck=` seeds it); pasted text is the
  Paste text tile. Start sends `set.resolve()` (server reads decks as Q/A cards) through
  `data/practiceSources.ts` (60k-char budget, equal shares, cut said aloud). Lineage: the chosen
  `SourceSet` + names ride `study_session.settings.source_set/source_names`; `source_set_id` = the deck.
  Use existing offers Decks on this screen only (`extraKinds=["fc_set"]`; the global list stays the nine). When the session opens, `data/recordPracticeLineage.ts` writes a `study_session --source--> <Source>` edge per chosen Source (pairs registered in platform.association_types, provenance only).
  The assistant's `deck_id` / `source_text` writes go through the same Source input (deck + pasted can combine).
- The setup form opts into `matrx-touch-targets`. Runs reuse sibling source-feature tags
  (`education-assessment*`, `education-tutor`); add `education-spoken-practice*` when `features/agents` is next touched.

Open: a per-turn live rebuttal agent for debate (prompts are designed up front).

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/education/STATE.md — read it before touching this feature in ANY repo.
