# FEATURE.md — `education/media` (Generated Study Media: Audio Study, Mind Maps)

**Status:** `active` · **Tier:** `2`. Product status and the audio success-rate bar: `common-docs/systems/education/STATE.md`.

Turns study material into podcast-style **audio** (overview, debate, panel, spoken audio-review quiz)
and clickable **mind maps**, as thin orchestration over the podcast studio pipeline. Both persist to
ONE registry table, `education.study_media` (`media_kind` = `audio | mind_map | summary | memory_aid`,
`types.ts`), through `service.ts` (`studyMediaService`, the only direct CRUD).

## Where it lives

- Routes `app/(core)/education/{audio-study,mind-maps}/**` and the shareable viewer `/education/media/[id]`.
- `audio/`: `audioBrief.ts` (`buildAudioRequest`/`serializeDeck`: the one format -> `PodcastGenerateRequest`
  mapping, also used by the flashcard Convert affordance), `audioGenerator.ts` (convert generator,
  capability `education.audio_generate`), `useAudioStudyRunPersistence.ts`.
- `mindmap/`: `useGenerateMindMap.ts` (`diagram_spec`), `linkCards.ts` (stamps `node.metadata.cardId`),
  `mandates.ts` (`education.mindmap_generate`), `mindMapWrites.ts` (`withUniqueEdgeIds`).
- `components/MediaRouter.tsx` dispatches by `media_kind` to audio, mind-map, memory (`memory/`) or
  summary (`onboard/`). **A new media kind must be added to `EduMediaKind` AND to `MediaRouter`**, or
  its rows open the audio player.
- Reuses `features/podcasts` (`studioRunsService`, `useStudioRun`, `RunRecoveryBanner`, aidream
  `/podcast/generate`), `InteractiveDiagramBlock`, `gradeSpokenAnswer` + `studyService.recordAttempt`
  (`method: 'audio_review'`), tutor `AskTutorButton`, `education/trust`.

## Invariants

- One table, one service. No parallel store.
- Audio never persists an expiring URL: it stores a re-mintable `audio_file_id` or a durable
  `episode_id`; `AudioPlayback` renders the shared `PodcastAudioPlayer`, never native controls or a raw signed URL.
- `InteractiveDiagramBlock.onNodeClick` stays opt-in.
- Mind-map and audio artifacts carry a grounded `TrustEnvelope` derived from the source (their agents
  emit no citations) — never `trust: null`.
- A deck's `study_session.source_kind` is `'set'`, never `'deck'` (DB check constraint).
- Every stored mind map has unique, present edge ids (`withUniqueEdgeIds`; the edit page refuses duplicates).
- A surface that creates an audio run MUST stream it: `audioGenerator` creates the run + row and stashes
  the request in module memory; a row nobody streams stays `generating` forever. Hosts: `AudioStudyDetail`
  and `KitAudioRunner`, both persisting via `useAudioStudyRunPersistence`.
- A failed audio study shows what failed plus a real retry (re-runs the stored request on the same row),
  or a regenerate door when no request exists.
- Mind-map node panel and Sources panel are docked (`MatrxDynamicPanelHost`), never a modal `Sheet`.
- `AudioReviewSession` quit marks its `study_session` `abandoned`; completion marks it `completed`.

## Known gap: generation is owned by a browser tab

The client starts generation only when the detail page mounts, so an unopened fan-out row runs
nothing and a dead tab leaves `generating` forever. The server-side owner is
`education_media_reconcile` (`aidream/aidream/services/education_media/FEATURE.md`; contract IC-6 in
`common-docs/systems/education/INTEGRATION_MAP.md`); it is suspended pending schedule approval
(`common-docs/systems/education/STATE.md`), so stuck rows are not currently healed.

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/education/STATE.md — read it before touching this feature in ANY repo.
