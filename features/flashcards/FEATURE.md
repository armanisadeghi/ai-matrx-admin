# Flashcards — FEATURE

The largest education subsystem: decks, cards, detail layers, study modes, Fast Fire, the editor,
public deck pages. Product truth, status and open work: `/Users/armanisadeghi/code/common-docs/systems/education/STATE.md`.
Card images: `/Users/armanisadeghi/code/common-docs/systems/education/flashcard-images/FEATURE.md`.
This file holds the contracts a code reader can't see. Print is the platform printer
(`flashcardsPrinter` from `@ai-matrx/print`, [`features/print/FEATURE.md`](../print/FEATURE.md)) — never a second print UI.

## Data spine

`education.fc_set` / `fc_card` / `fc_detail`, read directly from the client through
[data/fcService.ts](./data/fcService.ts). Set membership is a `platform.associations` edge
(`fc_card -member-> fc_set`), not a column. A card loads as `CardWithDetails`; detail rows are the
per-card layers (text, audio, `front_image`/`back_image`). Every read filters `deleted_at is null`.

- A detail row carries its CARD's `organization_id` (`addDetail`); a null lets a trigger file it in the writer's personal workspace. Guard: `pnpm check:organization-context`.
- Removals prove they landed: `softDeleteOne` / `setDetailAudio` / `reviewCardImage` ride `tryWriteOne` (`utils/supabase/writeOne.ts`); an RLS-filtered update returns no error, so a bare `update().eq()` toasts success while nothing changed. Guards: `data/__tests__/card-removal-proves-it-landed.test.ts`, `pnpm check:single-record-writes`.
- `fcService.mergeSetMetadata` is THE compare-and-swap merge for `fc_set.metadata`. Keys written there (`source_set`, `source_names`, `continued_from`, …) must be registered in `platform.metadata_reserved_keys`, or `platform._metadata_guard` refuses the save.
- `/education/flashcards/**` is authenticated (guests go through `loginHref` with the destination intact; set detail also checks `getServerAuth`). Public decks: `/p/e/fc_set/[id]`; shared deck `/s/<token>`.
- Retired, do not revive: prototype tables `education.flashcard_*` (schema `graveyard`) and `users.user_flashcard_sets` / `user_flashcard_reviews`. `education.fc_*` is canonical.

## Routes

Route -> component is in `app/(core)/education/flashcards/**` and [routes.ts](./routes.ts). Rules:
the home list is server RPCs via `data/deckListService.ts` (the browser never holds the library);
`/new` (`components/create/CreateDeckPage.tsx`) is the ONE creation page and `/new/from-source`,
`/new/import`, `/education/flashcards-2` redirect there keeping the query (`createDeckHref.ts`);
study modes share `StudyDeck`; `/admin` is `admin/flashcardsAdminMap.ts` via `FeatureAdminPage` —
add every new route/component there; the offline deck snapshot (`data/offlineDeck.ts`) is a read
cache, never a write-back source. Deck card views are `?view=overview|fronts|backs|list|table`.
Windows live in `features/window-panels/windows/flashcards/`.

## Creating a deck

Sources (the one Source input, surfaceKey `flashcards:new`) -> Style -> Make; "Import a deck file"
(`DeckFileImport`) goes through `persistImportedDeck`, no AI. Picks persist in `wizardDraft`.

- Sources go `useSourceSet().resolve()` -> [data/generateDeckFromSources.ts](./data/generateDeckFromSources.ts) -> `education/convert/segmentedGenerate.ts`; each citation is backfilled from ITS OWN Source; each Source gets a `source` lineage edge (`recordSourceLineage`). A topic alone uses `useGenerateCards`. `FLASHCARD_SOURCE_DELIVERIES = ["direct"]`. Previews render through `MarkdownStream`.
- THE COUNT LAW: an explicit card count is delivered exactly (`convert/coverage.ts`, `mergeSectionItems`); mechanism and no-freeze rule in `education/convert/FEATURE.md`.
- Max cards per run is the knob `flashcards.max_cards_per_run` (`data/useMaxCardsPerRun.ts`); a failed read is said on screen and blocks the run; no constant stands in.
- A card run is tab-bound (`data/cardRunRequest.ts`, `lib/wizard-draft/useTabBoundRun.ts`): a reload mid-run shows "stopped" with Try again (no server run to re-attach to).
- The deck's Source set is saved by exactly two writers (`CreateDeckPage`, `AddMoreCardsButton`) via `data/deckSourceSet.ts`; page loads write nothing.
- Add more cards is steerable (`foldSteer`) and undoable: each run stamps `metadata.batch_id`; Undo archives exactly that batch (`data/undoCardBatch.ts`, soft delete).
- A deck made from chat flashcards is named after its subject, never "Flashcards" (`utils/deckName.ts`).

## Agent-generated decks — the single-writer contract

A headless run has two possible `fc_set` writers: the surface's save and the stream's render-block materialization (`FLASHCARDS_CANONICAL_ADAPTER`). Keep ONE row, keyed by the run's conversation id:

- Surfaces never call `createSetWithCards` for a generated deck; they call `fcService.createGeneratedSetForConversation(conversationId, input, cards)`, which adopts the adapter's set if it won the race, else creates it stamped `metadata.source_system="cx_conversation"` / `source_id=<cid>`.
- Every generation here launches with `surfaceOwnsOutput: true`, so neither stream commit nor reload reconcile materializes a twin.
- Try again continues the stopped run's deck (`{ continues }` -> `continueGeneratedSet`) instead of saving a second.
- Pinned by `data/__tests__/generated-set-single-writer.test.ts` and `try-again-continues-the-stopped-runs-deck.test.ts`. Limit: dedupe is look-before-write, not a DB constraint (a global unique would break multi-deck chats).

## Images on card faces

**One renderer** ([`FlashcardFaceImage`](../../components/mardown-display/blocks/flashcards/FlashcardFaceImage.tsx)), **one adapter** ([`components/study/cardImages.ts`](./components/study/cardImages.ts) — never inline `details.find(...)`), **one writer** (`fcService.setCardImage` / `removeCardImage`; server lanes in aidream `services/education/card_images.py`). Traps: alt text required on both free lanes; a signed URL is never persisted (`isSignedUrl`); the print window is unauthenticated, so a `file_id`-only face is skipped and counted in a toast (`utils/deckPrintData.ts`, the one deck-to-printer mapper); `fcService.reviewCardImage` stamps `metadata.human_review` before a soft delete.

## Enrichment (detail layers)

- ONE reader [`data/cardDetailLayers.ts`](./data/cardDetailLayers.ts) defines "this card is enriched" (excludes audio, image, memory-aid rows); ONE renderer `components/study/CardDetailLayers.tsx`; ONE lane `data/enrichCardLane.ts` (`enrichAndSaveCard`). Kind `card_enrichment` renders PROPOSALS, not stored rows.
- Bulk: `set-detail/bulkEnrichRun.ts` `planBulkEnrich` decides the work AND the button label; an explicit pick beats skip-already-enriched. Each in-flight card reads its own `selectKindEnvelope(requestId, "card_enrichment")` (no second parser); concurrency 3. Guarded once on `education.card_enrichment`, committed per card, COPPA before billing.

## Study modes

- Every grade funnels through `useFlashcardStudy().grade` (writes `study_attempt`, advances `item_mastery`, offline-aware via `recordAttemptOfflineAware`); both layouts use `FlashcardConfidenceRow` (`confidenceToResult` in `lib/srs/fsrs.ts`) — never a fork.
- Learn is staged (`components/study/LearnSurface.tsx` + pure `data/learnQueue.ts`): multiple choice (`buildQuizQuestions`) → typed recall (a normalised match is correct instantly with no AI; otherwise `gradeTypedSemantic` runs in the background and `settleTypedVerdict` applies a late verdict, shown on the round screen with "I was right") → mastered; honors `userPreferences.flashcard.answerWith` for basic cards; the session is completed only when every card is mastered (ending earlier records it partial); a miss returns later in the round, a missed recall drops back to choice; rounds of `userPreferences.flashcard.learnRoundSize`, graded once via `grade({ cardId, attemptId })`.
- Round size for Test / Write / Match: `data/roundSize.ts`, per learner at `userPreferences.flashcard.{testQuestionCount,writeCardCount,matchPairCount}` (0 = every card). Cloze/formula cards render through `studyFaces` / `CardFaceBlock`, never raw markup.
- Swipe-to-grade (Study, touch only, armed once flipped): `components/study/SwipeToGrade.tsx` — right = knew it, left = again, through the same `handleGrade`; axis-locked (`touch-action: pan-y`), tap-to-flip untouched; on a phone it replaces left/right navigation while armed.
- "Answer with" definition | term: `userPreferences.flashcard.answerWith`, in the deck's study options menu; `orientedStudyFaces` in `utils/cardVariants.ts` turns basic cards only (cloze/matching/formula keep their direction).
- Edit card while studying: the pencil (deck editors only, `useAccess("fc_set")`) opens `components/study/StudyCardEditDialog.tsx` — the editor page's own exported `CardEditor`; each autosave calls `refreshCards`, anchored on the current card.
- Collapse-on-mastery: `data/collapse.ts` folds mastered `expands_into` sub-cards; decision in `item_mastery.collapse_state`. Fast Fire launcher only.
- The public deck page studies the real deck signed out with the SAME `StudyDeck`; progress is device-local (`data/useLocalFlashcardStudy.ts`) because `study_record_attempt` would file a visitor's attempts under the deck OWNER's organization. Matching/formula cards study as plain flips there.
- Semantic Write grading is `gradeTypedSemantic` on `flashcards.grade_typed_answer` (Levenshtein stays the instant verdict). Give-away fixer (`components/giveaway/FixGiveawayCardsAction.tsx`) answers `list_change_proposal_v1`; accepted rewrites save via `fcService.updateCard`.

## Fast Fire (`fast-fire/`)

- The spoken grader takes the clip as the mandate's NAMED value `variables.answer_audio = <durable file_id>` (`kind="file"`; the server refuses a no-audio run before any spend). `runSpokenGrader` (`fast-fire/agents/grading-core.ts`) is the only launch path; with no clip the learner sees `NO_ANSWER_HEARD`, never a blank "skipped". Same for `education.spoken_practice_grade` and `education.grade_handwritten`.
- Microphone capture starts BEFORE the durable study session is created. The coach review waits for every launched card grade to settle before snapshotting Redux. Spoken-front/variation hashes stay unsigned (a negative index silently drops TTS offers).
- The local QA audio fixture activates only in a dev build on `localhost`/`127.0.0.1` with the exact `matrxQaAudio=fastfire-browser-spoken-answer-fixture-v2` query value.
- Helper audio: `flashcards.enrich_card` writes `helper` text, `flashcards.helper_tts` renders it once to `audio_file_id` on that `fc_detail` row; missing cache = old behavior. Transcript (`fast-fire/session-transcript.ts`) persists to `study_session.session_transcript`.
- The education layout owns header clearance once; the page adds no second offset.

## AI jobs and agent surfaces

- The AI job list is [data/mandates.ts](./data/mandates.ts) (`FC_MANDATES`), declared in aidream `aidream/services/education/mandates.py` (+ TTS in `aidream/services/mandates/client_mandates.py`). Never copy the list, hardcode an agent id or prompt, or hand-edit offer types (generated `@ai-matrx/agents` provision offers). One reader per result (`data/coerce-card.ts`, `coerceGradeVerdict`, `parseSessionReview`); kind components via `KindInstanceRender`; the generated-set title is the `flashcard_set` kind's `title` only.
- Each surface registers only the mandates it can launch (`data/mandate-disclosure.ts`, `intelligence-places.ts`), UI-free: disclosure is the shell's Agents menu. Plan: `common-docs/systems/intelligence/mandates/REGISTER.md`.
- Surface manifests: `features/surfaces/manifests/education-flashcards`, `-flashcard-set`, `-flashcard-editor`, `-flashcard-study`. Study routes register through ONE hook, `components/study/useFlashcardStudySurface.ts`; Deck and Edit register write targets from `components/editor/deckWriteHandlers.ts`; the list exposes `create_decks` / `update_decks` / `delete_decks` / `duplicate_decks` (`components/home/deckAgentWrites.ts`). A broad route prefix must never claim a child route whose vocabulary it can't emit.
- Inline voice tutoring (`VoiceTutorPanel`, `education.voice_tutor`) is closed to the current card (no web_search); it hands off to the full tutor for anything else.
