# TrustEnvelope — the P0 grounded-AI contract

> **The contract every education AI feature builds against.** Mechanics: [`FEATURE.md`](./FEATURE.md).
> Typed definition: [`types.ts`](./types.ts). Any education AI output without this envelope is a defect.

Every AI-generated study artifact (flashcard, quiz item, tutor answer, audio segment, note) carries
ONE small shape describing how grounded it is in the learner's **own** material:

```ts
type TrustConfidence = "grounded" | "inferred" | "not_in_material";

interface SourceCitation {
  sourceId: string;      // chunk id / section id / doc id — the passage identity
  sourceKind: "document" | "chunk" | "section" | "file" | "url" | "scope" | "transcript" | "web";
  locator?: string;      // "p. 12", "0:340-0:512", "12:04"
  excerpt?: string;      // the verbatim passage it was grounded in
  title?: string;        // display label
  // Durable OPENABLE refs: the persisting surface backfills these (the agent does not know them)
  fileId?: string; documentId?: string; url?: string; page?: number;   // page is 1-based
}

interface TrustEnvelope { citations: SourceCitation[]; confidence: TrustConfidence; groundedIn?: string }
```

| `confidence` | meaning | UI obligation |
|---|---|---|
| `grounded` | every claim traces to a cited passage | show citation chips |
| `inferred` | reasoned *from* the material, not directly stated | "inferred" badge + any citations |
| `not_in_material` | **not** supported by the corpus | a clear "not from your material" label on the answer — never presented as if grounded. Grounded *answering* (tutor) answers from general knowledge right away; grounded *generation* drops the item |

## Consumer rules

1. **Pass it through.** The agent emits `trust` inside the same content-IR payload the content streams
   in (per item and/or per set); carry it to the render layer unchanged — never re-derive it.
2. **Render with the shared primitives** (`trust/components/`): `<SourceCitations trust={item.trust} />`
   (chips open the real source — whole file/PDF/URL — with no wiring; resolver `open-source.ts`),
   `<ConfidenceBadge confidence={item.trust?.confidence} />`, `<RefusalNotice … onAnswerAnyway={…} />`.
3. **Coerce untyped agent output** with `coerceTrustEnvelope(raw)` (never throws; `null` when there is
   no envelope); grading with `coerceGradeVerdict(raw)`. Backfill of durable refs (`attachSourceRefs`)
   and the open rules live in `FEATURE.md`.

## Grade-on-meaning — ONE verdict core

Grading judges **meaning, not exact strings**. Every grading path (typed and spoken) resolves to:

```ts
type GradeResult = "correct" | "partial" | "incorrect";   // the ONE result vocabulary
interface GradeVerdict { correct: boolean; partial: boolean; misconception: string | null; explanation: string }
```

Both paths are thin adapters carrying extras around this core — never a second verdict shape:
typed/short-answer `GradedAnswer` (`assessment/data/grading.ts`: `scoreValue`, `gradedBy`) and spoken
`SpokenGrade` (`flashcards/fast-fire/agents/grading-core.ts`: `score`, `rubric`, `transcript`, `missing`,
optional `pronunciation`). Helpers beside the core in `types.ts`: `verdictResult`, `gradeResultScore`,
`resultFromScore`, `verdictFromResult`; every result union (`SpokenResult`, `AttemptResult`,
`ReviewResult`) aliases the one `GradeResult`; the spoken coercer is the single `coerceSpokenGrade`.
Persisted: `study_attempt.score` jsonb is `{ rubric, missing, feedback }`.

## Agent-side contract

Every **generation** agent emits `trust` per item; every **grounded** agent (source-generation, tutor)
**never passes general knowledge off as the material** — `confidence:"not_in_material"` with empty `citations`. Agent
definitions live in the database behind their mandates. Three prompt rules (never a client filter):

- **Grounded generation:** each item cites the exact passage. With `### Chunk <chunk_id>` markers in
  the source, echo that id as `sourceId` (`sourceKind:"chunk"`), the page as `locator`, the supporting
  sentence as `excerpt`. An item the material cannot support is dropped, never invented.
- **Ungrounded generation** (cards from a bare topic): `citations:[]`, `confidence:"inferred"`, no `groundedIn`.
- **Grounded answering** (Arman, 2026-10-11): when the material does not support the question, answer
  from general knowledge right away, say so in one short line, and mark it `not_in_material` with no
  citations. The client signals it per turn with the context entry `grounding_mode`
  (`material` | `general_knowledge`); the surface labels the answer "Not from your material".

Reference retrofits: mandates `flashcards.generate_from_source` (real citations) and
`flashcards.help_live` (honest refusal).

## Wire and rest

- **Streaming:** rides the item's content-IR envelope under `trust` (the IR residue channel carries it
  losslessly; `trust_envelope` and `citation` are registered kinds, mirror in `features/content-ir/kinds/trust-envelope.ts`).
- **At rest (flashcards):** `fc_card.metadata.trust`; source lineage also survives as the
  `fc_card -> file` association edge (`role: source`).
