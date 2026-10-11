# Universal Ingest & Data Ownership (`education/onboard`)

The front door (one input -> grounded study kit) and back door (export / import / own your data).
Every kit artifact is grounded (`TrustEnvelope`), metered, and lineage-linked by a `source`
association edge to a durable `cld_files` anchor: "the kit" is the anchor's associations, no new table.

Routes: `/education/kits/new` is THE create page (`StartHero`; `/education/start` redirects there
keeping `?source=`/`?from=`; constant `NEW_KIT_HREF` in `startRoutes.ts`); `/education/data` is
`DataOwnershipPage`; `/education/summaries[/new|/[id]|/[id]/edit]` is the summary library
(`study_media` `media_kind='summary'`, writes in `summaryWrites.ts`). The kit as a place is `../kits`.

## Architecture (the load-bearing split)

```
Source input ─SourceSet─▶ POST /sources/resolve ─useIngest─▶ { text, title, anchor } ─useKitGeneration─▶ convertMany
                          (server owns raw→text)                                      (converter owns text→artifact)
```

- Material enters ONLY through the unified Source input (`features/resource-manager/source-input`);
  no local input UI or client-side reader here. No "Topic" mode (the focus line carries a topic).
  Delivery is `["direct"]`.
- `kitSources.ts` (pure): ONE Source backed by a stored file anchors on that `files.files` id (a
  later run MERGES into the same kit); anything else is kept as one `.md` the person owns
  (storage failure degrades to no lineage, loudly). A Source the server left out or read raw is
  listed on the board (`meta.notes`).
- `useIngest.ts` clamps to the `education.study_kit.max_source_chars` knob.
- `useKitGeneration.ts` is a tab-bound run (`lib/wizard-draft/useTabBoundRun`) with a journal
  (frozen request, anchor, kit name, outputs, section conversation ids): a reload continues by
  itself (<=30 min, then one Continue), adopts outputs whose lineage edge landed, and reads
  finished sections back (`convert/sectionJournal.ts`) instead of paying again.
- `kitTitle.ts` names the kit ONCE between ingest and fan-out; that value is every generator's
  `source.title`. Floor `humanizeSourceTitle`; on top the `education.kit_title` mandate (bounded
  20 s, a late answer still renames). Naming never blocks a kit.
- Ingest owns raw->text, the converter (`../convert/FEATURE.md`, targets in
  `convert/generators/index.ts`) owns text->artifact; never mix. `notes` ON by default; audio is a default target.
- The kit deck runs `flashcards.generate_from_source` via `runHeadlessAgentJson`; `deck.ts`
  synthesizes `### Chunk cN` markers because the card agents return nothing for an un-chunked blob.

## Data ownership

- Export (`export/deckFormats.ts`): json (round-trips), md, anki TSV, csv; per deck or whole library
  as zip. Study-spine export and reversible-window delete/restore via `data/dataRightsService.ts`
  (`edu_export_study_data` / `edu_delete_study_data` / `edu_restore_study_data`).
- Import: Quizlet/CSV/TSV, Matrx JSON, pasted pairs, Anki `.apkg` (review history seeded into FSRS
  through the ONE RPC `edu_import_review_history`). **`persistImportedDeck` (`import/importDeck.ts`)
  is THE one import entry (IC-11)** — never `createSetWithCards` directly. zstd `collection.anki21b`
  is refused with re-export instructions.
- `sql.js` (WASM) and jszip load ONLY by dynamic import from `ImportDeckPanel`; a static chain hangs
  the page build (`code-splitting` skill).
- Each pledge line on `DataOwnershipPage` is backed by a real button; keep it so.

## Invariants

- Kit size follows the MATERIAL: `StartHero` passes `depth` (`quick|standard|thorough`) and optional
  exact `count`; law and knobs in `../convert/FEATURE.md` § THE COVERAGE LAW.
- A document we could not read all of is an amber WARNING naming how much was read, never a footnote.
- The board is up from the first millisecond and every stage says what it is doing (`KitBoard`
  mounts for `ingesting`; byte-accurate upload, per-page extraction, section counts). A bare spinner
  in this flow is a defect.
- A file is uploaded ONCE: PDFs extract by `file_id` against the anchor's stored bytes.
- Every headless generation run passes an `organizationId` (required by type); it is resolved AT THE
  BUTTON (`StartHero` holds the press with `OrganizationContextNotice`), never inside the run.
- A target that creates a run must RUN it: `KitAudioRunner` hosts `useStudioRun` and persists via
  `useAudioStudyRunPersistence` (`../media/FEATURE.md`).
- One dispatch (`convertContent`), one file door (`fileHandler`); every artifact links a `source`
  edge to `ref.fileId` — lineage is never optional.
- Runs carry no page context (`surfaceName: null`), or the namer adopts the page surface and burns tool calls.
- `kit_request_draft` on `matrx-user/education-start` (`startAgentWrites.ts`) ADDS Sources, never builds.
- `StartHero` root carries `matrx-touch-targets`; `KitDepthPicker`'s count input is `h-11`, spinners hidden.

Entitlements: the kit meters once per run (`useEntitlementGuard("education.ingest_document")`);
per-target guarding is open owner decision Q-kit-per-target-cost in `common-docs/operations/conflicts.md`.

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/education/STATE.md — read it before touching this feature in ANY repo.
