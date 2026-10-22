import { humanizeIdentifier } from "@ai-matrx/kit/text-case";
/**
 * planMaterialization — pure transform from a committed `cx_message.content`
 * array into (a) the artifacts to persist and (b) the rewritten content with
 * each NEW materializable render-block replaced by its canonical id-bearing form
 * (vision R1): `<artifact type="X" id="<uuid>" version="N">body</artifact>` —
 * plain text the model reads natively and the UI renders by id.
 *
 * Because the id is only known after the canvas upsert, NEW artifacts are emitted
 * here as `ArtifactPendingMarker` placeholders carrying their `artifactIndex`;
 * the orchestrator fills the real UUID and serializes them to text.
 *
 * PURE (no I/O) so it runs identically at stream-end and during reconcile.
 *
 * Idempotency (R3): a `<artifact>` whose id is already a real canvas UUID is
 * recognized as MATERIALIZED and passed through untouched — it is not counted as
 * a new artifact, so a fully-materialized message yields `hasChanges: false` and
 * the orchestrator skips the rewrite entirely. Indices are assigned by stable
 * left-to-right position over ALL materializable artifacts (materialized + new),
 * matching the `(source_system, source_id, artifact_index)` natural key.
 *
 * STRUCTURED (kind-IR) blocks (Track 2B): a JSON region whose resolved
 * `__kind` maps to a registered `ArtifactTypeDef.kinds` entry plans with a
 * `structured` value object (persisted as `content.data`, zero reprocessing
 * on reload) — detected via the block's `metadata.__ir` envelope when present,
 * else by parsing the JSON root. String-payload planning is unchanged.
 */

import type {
  CxContentBlock,
  CxTextContent,
} from "@ai-matrx/chat/public-chat/types/cx-tables";
import { splitContentIntoBlocksV2 } from "@ai-matrx/rich-content/display/markdown-classification/processors/utils/content-splitter-v2";
import { getCatalogEntry } from "@ai-matrx/rich-content/mermaid/catalog";
import {
  detectDiagramType,
  extractMermaidTitle,
} from "@ai-matrx/rich-content/mermaid/diagram-type";
import {
  resolveCanvasType,
  resolveArtifactDefByKind,
} from "@/features/canvas/artifact-types/artifact-type-registry";
import { isMaterializedArtifactId } from "@ai-matrx/kit/artifact-id";
import {
  readEnvelope,
  reconstructRegionValue,
} from "@ai-matrx/rich-content/kinds/redux/render-block-envelope";
import { locateBlockSource } from "./blockSourceSpan";
import {
  detectKindInJsonText,
  type KindValueDetection,
} from "@/features/canvas/artifact-types/storedKindValue";
import { parseDiagramJSON } from "@ai-matrx/rich-content/display/blocks/diagram/parseDiagramJSON";

export interface PlannedArtifact {
  /** Stable 1-based order within the message (= canvas_items.artifact_index). */
  artifactIndex: number;
  /** canvas_items.type. */
  canvasType: string;
  title: string;
  /** Raw payload string the type's renderer consumes (markdown or JSON). */
  content: string;
  /**
   * The block's body EXACTLY as the answer holds it — the bytes the stored `<artifact>` tag
   * wraps. Never re-written: a structured value's compact JSON goes to the canvas row
   * (`content` / `structured`), never into the person's answer.
   */
  body: string;
  /**
   * Structured (kind-IR) value for kind-detected JSON blocks — persisted AS
   * `canvas_items.content.data` (an object carrying `__kind`, zero
   * reprocessing on reload) instead of the string. `content` still carries
   * the compact canonical JSON for the message wire form. Absent for
   * string-payload types.
   */
  structured?: Record<string, unknown>;
  /** Type-specific metadata persisted into canvas_items.content.metadata. */
  metadata?: Record<string, unknown>;
}

/**
 * Internal placeholder for a NEW artifact in the rewritten content. Replaced by
 * the orchestrator with a `{type:"text"}` block carrying the canonical R1 tag
 * once the canvas upsert returns the real id/version. Never persisted.
 */
export interface ArtifactPendingMarker {
  __artifactPending: true;
  artifactIndex: number;
  /** The block's wrapper + body exactly as written — put back if the artifact is not saved. */
  source: string;
  /** The text block this marker was cut from (its pieces re-join into that one block). */
  of: CxTextContent;
}

/**
 * The bytes of a text block around its materialized blocks, verbatim. Consecutive pieces and
 * markers that share `of` re-join, with NO separator, into one text block carrying every other
 * field of `of` (id, metadata, citations).
 */
export interface TextPiece {
  type: "text";
  text: string;
  of: CxTextContent;
}

export function isTextPiece(b: unknown): b is TextPiece {
  return (
    typeof b === "object" &&
    b !== null &&
    (b as TextPiece).type === "text" &&
    typeof (b as TextPiece).of === "object"
  );
}

export function isArtifactPending(b: unknown): b is ArtifactPendingMarker {
  return (
    typeof b === "object" &&
    b !== null &&
    (b as ArtifactPendingMarker).__artifactPending === true
  );
}

export interface MaterializationPlan {
  /** Artifacts to upsert, in message order. Empty when nothing materializes. */
  artifacts: PlannedArtifact[];
  /**
   * Rewritten content. NEW artifacts are `ArtifactPendingMarker`s (id filled by
   * the orchestrator); the text around them is kept as verbatim `TextPiece`s and
   * every other block passes through as the same object. Assemble it with
   * `assembleMaterializedContent`. Only consumed when `hasChanges` is true.
   */
  rewrittenBlocks: (CxContentBlock | ArtifactPendingMarker | TextPiece)[];
  /** True when at least one NEW artifact was found to materialize. */
  hasChanges: boolean;
  /** UUID refs already present in the source, for the orchestrator to verify. */
  materializedArtifactIds: string[];
}

export interface PlanMaterializationOptions {
  /** UUID refs whose backing row was proven absent and must be rebuilt. */
  missingArtifactIds?: ReadonlySet<string>;
}

function isTextBlock(b: CxContentBlock): b is CxTextContent {
  return (b as { type?: string }).type === "text";
}

function titleFor(
  blockType: string,
  metadata: Record<string, unknown> | undefined,
  index: number,
): string {
  const t = metadata?.artifactTitle;
  if (typeof t === "string" && t.trim()) return t.trim();
  const label = humanizeIdentifier(blockType) || blockType;
  return `${label} ${index}`;
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

type StructuredDetection = KindValueDetection;

/** Enrich a diagram without discarding kind discriminators or residue. */
function materializeDiagramValue(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = parseDiagramJSON(JSON.stringify(value));
  const authoredNodes = Array.isArray(value.nodes) ? value.nodes : [];
  const authoredEdges = Array.isArray(value.edges) ? value.edges : [];
  return {
    ...value,
    ...normalized,
    nodes: normalized.nodes.map((node, index) => ({
      ...(typeof authoredNodes[index] === "object" &&
      authoredNodes[index] !== null &&
      !Array.isArray(authoredNodes[index])
        ? (authoredNodes[index] as Record<string, unknown>)
        : {}),
      ...node,
    })),
    edges: normalized.edges.map((edge, index) => ({
      ...(typeof authoredEdges[index] === "object" &&
      authoredEdges[index] !== null &&
      !Array.isArray(authoredEdges[index])
        ? (authoredEdges[index] as Record<string, unknown>)
        : {}),
      ...edge,
    })),
  };
}

/**
 * Detect a STRUCTURED (kind-IR) artifact in a splitter block (Track 2B).
 *
 * Two routes, both PURE:
 *  1. Envelope: the splitter attached `metadata.__ir` and the kind parser
 *     RESOLVED a registered kind → reconstruct the zero-loss value (residue
 *     extras merged back in).
 *  2. Parsed root: no envelope (flag off / legacy payload), but the block is
 *     a JSON object whose root carries `__kind` matching a registered kind.
 *
 * Returns null for anything else — string-payload planning is unchanged.
 */
function detectStructuredArtifact(sb: {
  type: string;
  content?: string;
  language?: string;
  metadata?: Record<string, unknown>;
}): StructuredDetection | null {
  const envelope = readEnvelope(sb.metadata);
  // kindState gate: refuse "raw" (checked and FAILED) — and ONLY "raw".
  // "unverified" (no schema was ever available — never checked) is GOOD data
  // and takes this validated branch; gating on === "resolved" sent every
  // unverified instance down the parse fallback below, which re-reads the
  // kind with ZERO validity check — strictly less safe than the branch it
  // was excluded from (2026-08-31 kindState audit; the 2026-08-28 outage
  // doctrine: never treat never-checked as failed).
  if (
    envelope &&
    envelope.root.kind &&
    envelope.root.kindState !== "raw" &&
    envelope.root.status === "complete"
  ) {
    const def = resolveArtifactDefByKind(envelope.root.kind);
    if (def?.materializable) {
      return {
        def,
        kind: envelope.root.kind,
        structured: reconstructRegionValue(envelope),
      };
    }
  }

  // A payload the envelope CHECKED AND FAILED must never materialize as its
  // claimed kind — not here, and not via the unguarded parse fallback below,
  // which would happily re-read the same broken bytes and mint a typed
  // artifact from them (the flashcards empty-title class, on the artifact
  // store instead of fc_set).
  if (envelope?.root.kind && envelope.root.kindState === "raw") return null;

  // Parse fallback — JSON blocks (fenced ```json or bare-object regions; the
  // splitter stamps language "json" on both) AND `<artifact>`-tagged bodies.
  // A model that wraps a kind payload in a tag with a non-UUID id
  // (`<artifact type="flashcards" id="mitosis-deck">{"__kind":…}</artifact>`)
  // gets no envelope; skipping it here stored the value as a JSON STRING with
  // no metadata.kind — a row that rendered zero cards (2026-09-30).
  const isJsonBlock = sb.type === "code" && sb.language === "json";
  if (!isJsonBlock && sb.type !== "artifact") return null;
  return detectKindInJsonText(sb.content);
}

export function planMaterialization(
  content: CxContentBlock[],
  options?: PlanMaterializationOptions,
): MaterializationPlan {
  const rewritten: (CxContentBlock | ArtifactPendingMarker | TextPiece)[] = [];
  const artifacts: PlannedArtifact[] = [];
  const materializedArtifactIds = new Set<string>();

  // Left-to-right position over EVERY materializable artifact (already-
  // materialized + new). New artifacts take their position as artifact_index.
  let position = 0;

  for (const block of content) {
    // Non-text blocks (thinking, tool_call, media, …) pass through verbatim —
    // they are never raw artifact markup.
    if (!isTextBlock(block)) {
      rewritten.push(block);
      continue;
    }

    const text = block.text ?? "";
    if (!text) {
      rewritten.push(block);
      continue;
    }

    // BYTE-EXACT (2026-10-21): only a materialized block's wrapper is replaced. Its body and
    // every byte around it stay exactly as written — the pieces between are sliced from `text`,
    // never re-serialized from the split blocks.
    const pieces: (ArtifactPendingMarker | TextPiece)[] = [];
    let cursor = 0;
    const cut = (start: number, end: number, artifactIndex: number) => {
      if (start > cursor) pieces.push({ type: "text", text: text.slice(cursor, start), of: block });
      pieces.push({
        __artifactPending: true,
        artifactIndex,
        source: text.slice(start, end),
        of: block,
      });
      cursor = end;
    };

    const splitterBlocks = splitContentIntoBlocksV2(text);
    for (const sb of splitterBlocks) {
      const artifactType =
        typeof sb.metadata?.artifactType === "string"
          ? (sb.metadata.artifactType as string)
          : undefined;
      const canvasType = resolveCanvasType(sb.type, artifactType);

      // Already materialized (R3): a `<artifact>` carrying a real canvas UUID.
      // Left exactly as written and NOT re-materialized. Still counts toward
      // position so later new artifacts get a non-colliding index. Checked
      // FIRST so a materialized structured body is never re-detected.
      const existingId =
        typeof sb.metadata?.artifactId === "string"
          ? (sb.metadata.artifactId as string)
          : undefined;
      if (
        sb.type === "artifact" &&
        canvasType &&
        isMaterializedArtifactId(existingId)
      ) {
        materializedArtifactIds.add(existingId as string);
        if (!options?.missingArtifactIds?.has(existingId as string)) {
          position += 1;
          const span = locateBlockSource(text, cursor, sb);
          if (span) cursor = Math.max(cursor, span.end);
          continue;
        }
      }

      // Structured (kind-IR) detection — catches JSON regions the fence/tag
      // heuristics can't type (the splitter calls them "code") plus
      // `<artifact>`-tagged bodies carrying a kind. When the tag's type and
      // the kind's type disagree, the tag wins (falls to the string path).
      const structuredHit = detectStructuredArtifact(sb);
      const structuredFits =
        structuredHit !== null &&
        (!canvasType || canvasType === structuredHit.def.canvasType);
      if (!structuredFits && !canvasType) continue; // not an artifact — stays as written

      // A block whose exact bytes cannot be placed is left as written: it is never saved from
      // bytes the answer does not hold.
      const span = locateBlockSource(text, cursor, sb);
      if (!span) {
        console.warn(
          `[materialize] a ${sb.type} block was left as written: its exact source was not found`,
        );
        continue;
      }

      if (structuredFits && structuredHit) {
        position += 1;
        let structured = structuredHit.structured;
        if (structuredHit.def.canvasType === "diagram") {
          try {
            structured = materializeDiagramValue(structuredHit.structured);
          } catch {
            // Invalid complete values retain the existing zero-loss path.
          }
        }
        const title =
          firstNonEmptyString(
            structured.title,
            structured.set_title,
            structured.name,
            sb.metadata?.artifactTitle,
          ) ?? titleFor(structuredHit.def.canvasType, sb.metadata, position);
        artifacts.push({
          artifactIndex: position,
          canvasType: structuredHit.def.canvasType,
          title,
          // The canvas row's payload: compact canonical JSON beside the structured value.
          content: JSON.stringify(structured),
          body: span.body,
          structured,
          metadata: { kind: structuredHit.kind },
        });
        cut(span.start, span.end, position);
        continue;
      }

      // NEW materializable artifact → a pending marker + plan. The orchestrator
      // fills the UUID and serializes it to R1 text around the verbatim body.
      const newCanvasType = canvasType as string;
      position += 1;
      let title = titleFor(sb.type, sb.metadata, position);
      let artifactMetadata: Record<string, unknown> | undefined;
      let structured: Record<string, unknown> | undefined;
      if (newCanvasType === "mermaid") {
        // Mermaid identity travels in metadata: the user-facing label is the
        // diagram type's feature name (Flowchart, Mind Map, …), never "mermaid".
        const source = sb.content ?? "";
        const diagramType = detectDiagramType(source);
        title =
          extractMermaidTitle(source) ?? getCatalogEntry(diagramType).label;
        artifactMetadata = { diagramType, title };
      } else if (newCanvasType === "diagram") {
        try {
          structured = materializeDiagramValue(
            parseDiagramJSON(sb.content ?? "") as unknown as Record<
              string,
              unknown
            >,
          );
          title =
            typeof structured.title === "string" && structured.title
              ? structured.title
              : title;
        } catch {
          // Preserve the previous string path when diagram parsing fails.
        }
      }
      artifacts.push({
        artifactIndex: position,
        canvasType: newCanvasType,
        title,
        content: sb.content ?? "",
        body: span.body,
        structured,
        metadata: artifactMetadata,
      });
      cut(span.start, span.end, position);
    }

    if (pieces.length === 0) {
      rewritten.push(block);
      continue;
    }
    if (cursor < text.length) pieces.push({ type: "text", text: text.slice(cursor), of: block });
    rewritten.push(...pieces);
  }

  return {
    artifacts,
    rewrittenBlocks: rewritten,
    hasChanges: artifacts.length > 0,
    materializedArtifactIds: [...materializedArtifactIds],
  };
}

/**
 * The stored content for a plan: each pending marker becomes the wire text `wireFor` returns
 * (its `<artifact>` tag around the verbatim body) — or its own source again when `wireFor`
 * returns null (an artifact that was not saved keeps its bytes). Pieces re-join into the text
 * block they came from with no separator; every other block is the same object.
 */
export function assembleMaterializedContent(
  plan: Pick<MaterializationPlan, "rewrittenBlocks">,
  wireFor: (marker: ArtifactPendingMarker) => string | null,
): CxContentBlock[] {
  const out: CxContentBlock[] = [];
  let of: CxTextContent | null = null;
  let run = "";
  const close = () => {
    if (of) out.push({ ...of, text: run } as CxTextContent);
    of = null;
    run = "";
  };
  for (const b of plan.rewrittenBlocks) {
    if (isArtifactPending(b) || isTextPiece(b)) {
      const piece = isArtifactPending(b) ? (wireFor(b) ?? b.source) : b.text;
      if (of !== b.of) {
        close();
        of = b.of;
      }
      run += piece;
      continue;
    }
    close();
    out.push(b);
  }
  close();
  return out;
}
