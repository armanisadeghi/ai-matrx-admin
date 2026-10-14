/**
 * Run one {@link RenderPathId} for real and report what the reader would get.
 *
 * Pure of React so it is unit-testable and so the UI cannot quietly diverge
 * from what the checker asserts. Every function here drives PRODUCTION
 * classes — `StreamBlockAccumulator`, `applyIrKindRoute`,
 * `resolveProvisionalKindRender` — never a lookalike. Where an input has to be
 * constructed locally (the server's partial event), the path spec says so and
 * the verdict carries a note.
 */

import {
  IR_ENVELOPE_KEY,
  KIND_KEY,
  isCanonicalBlockIR,
  type CanonicalBlockIR,
} from "@ai-matrx/content-ir";
import { envelopeFromCompleteValue } from "@ai-matrx/rich-content/kinds/registry/kind-correctors";
import type { RenderBlockPayload } from "@ai-matrx/agents/generated/stream-events";
import { StreamBlockAccumulator } from "@ai-matrx/chat/agents/redux/execution-system/utils/stream-block-accumulator";
import {
  applyIrKindRoute,
  readIrRouteMarker,
  DB_KIND_COMPONENT_KEY,
  GENERIC_STRUCTURED_COMPONENT_KEY,
} from "@ai-matrx/rich-content/kinds/react/kind-route";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import {
  buildWireText,
  chunkWireText,
  recordFromUpsert,
  withKindFirst,
  type StreamTickRecord,
} from "@/features/content-ir/studio/stream-simulator";
import type { RenderPathId, RenderPathVerdict } from "./paths";
import { wrapArtifactText } from "@/features/canvas/materialization/artifactWire";
import {
  resolveArtifactDef,
  resolveArtifactDefByKind,
} from "@/features/canvas/artifact-types/artifact-type-registry";
import { drawsKindAsRawJson } from "./draws-raw-kind-json";

/** What a path run hands the UI: blocks to render + the honest verdict. */
export interface RenderPathRun {
  pathId: RenderPathId;
  /** Blocks in their FINAL routed form — what the renderer mounts. */
  blocks: RenderBlockPayload[];
  /** Per-chunk history; empty for non-streaming paths. */
  records: StreamTickRecord[];
  /** The wire text this path put on the stream (null when it streams nothing). */
  wire: string | null;
  verdict: RenderPathVerdict;
  /**
   * Every upserted frame with the MESSAGE's stream state it is drawn under —
   * what the DOM frame judge (G2) renders. Streaming paths only.
   */
  frames?: Array<{ block: RenderBlockPayload; isStreamActive: boolean }>;
}

function envelopeOf(block: RenderBlockPayload): CanonicalBlockIR | null {
  const candidate = block.metadata?.[IR_ENVELOPE_KEY];
  return isCanonicalBlockIR(candidate) ? candidate : null;
}

/**
 * Did the kind's OWN component render?
 *
 * Deliberately not "does a component row exist" — that question is what let
 * every broken kind report healthy. This reads the route's actual answer:
 * `generic_structured` is the floor, not the component; `db_kind_component` is
 * a user-authored component; anything else is the kind's registered key.
 */
export function reachedRealComponent(block: RoutedBlock): boolean {
  if (block.type === GENERIC_STRUCTURED_COMPONENT_KEY) return false;
  if (block.type === DB_KIND_COMPONENT_KEY) return true;
  // A route marker that is not the generic fallback = the resolver bound a
  // component. `serverData` alone proves nothing: an unregistered kind keeps
  // its payload on a plain `code` block (the raw-JSON card).
  const marker = readIrRouteMarker(block.metadata);
  return marker !== null && marker.by !== "generic" && !marker.unverified;
}

/**
 * The projection `SafeBlockRenderer` routes — `data` becomes `serverData`.
 * Built the same way here so the verdict describes the SAME decision the
 * renderer below it is about to make, not a parallel guess at it.
 */
export interface RoutedBlock {
  type: string;
  serverData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export function routeBlock(block: RenderBlockPayload): RoutedBlock {
  return applyIrKindRoute({
    type: block.type,
    ...(block.data ? { serverData: block.data } : {}),
    metadata: block.metadata,
  });
}

/** The block this run is ABOUT — the one whose envelope names the kind. */
function principalBlock(
  blocks: RenderBlockPayload[],
  kind: string,
): RenderBlockPayload | null {
  return (
    blocks.find((b) => envelopeOf(b)?.root.kind === kind) ?? blocks[0] ?? null
  );
}

/** The canvas types whose card draws a `{"__kind": …}` body through the kind front door. */
const KIND_DOOR_CANVAS_TYPES: ReadonlySet<string> = new Set(["html", "kind_value"]);

function readString(record: unknown, key: string): string | undefined {
  if (record === null || typeof record !== "object") return undefined;
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * What an `artifact` block's card ACTUALLY draws for this kind.
 *
 * The route keeps an artifact block as "artifact" by design (it has an id, a
 * version and a Canvas to open in), so the route's type says nothing about
 * what the reader sees. The card resolves a canvas type from the tag's `type`
 * (ArtifactBlock → `resolveArtifactDef`): `html` with a `{"__kind": …}` body
 * (HtmlArtifact → KindValueFrontDoor) and `kind_value` both hand the value to
 * the kind front door — `KindInstanceRender`, which routes a complete envelope
 * exactly as the reload path does. That route's answer is the verdict. Any
 * other canvas type is a dedicated artifact renderer, which is that shape's
 * own view. Null = not an artifact block (or no kind body), judge normally.
 */
function artifactCardVerdict(
  source: RenderBlockPayload,
  kind: string,
  notes: string[],
): RenderPathVerdict | null {
  if (source.type !== "artifact") return null;
  const artifactType =
    readString(source.data, "artifactType") ?? readString(source.metadata, "artifactType");
  const canvasType = resolveArtifactDef("artifact", artifactType)?.canvasType ?? null;
  const kindState = envelopeOf(source)?.root.kindState ?? null;
  if (canvasType !== null && !KIND_DOOR_CANVAS_TYPES.has(canvasType)) {
    return {
      resolvedAs: canvasType,
      reachedRealComponent: true,
      kindState,
      fallbackReason: null,
      notes: [...notes, `Drawn by the ${canvasType} artifact view.`],
    };
  }
  let body: unknown;
  try {
    body = JSON.parse(source.content ?? "");
  } catch {
    return null;
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) return null;
  const { [KIND_KEY]: bodyKind, ...fields } = body as Record<string, unknown>;
  if (bodyKind !== kind) return null;
  const routed = routeBlock({
    blockId: `${source.blockId}:card`,
    blockIndex: source.blockIndex,
    type: "code",
    status: "complete",
    content: source.content,
    metadata: { [IR_ENVELOPE_KEY]: envelopeFromCompleteValue({ ...fields }, kind) },
  });
  const reached = reachedRealComponent(routed);
  return {
    resolvedAs: routed.type,
    reachedRealComponent: reached,
    kindState,
    fallbackReason: readIrRouteMarker(routed.metadata)?.reason ?? null,
    notes,
  };
}

function verdictFor(
  blocks: RenderBlockPayload[],
  kind: string,
  notes: string[],
): RenderPathVerdict {
  const source = principalBlock(blocks, kind);
  const card = source ? artifactCardVerdict(source, kind, notes) : null;
  if (card) return card;
  const principal = source ? routeBlock(source) : null;
  if (!principal || !source) {
    return {
      resolvedAs: "(nothing rendered)",
      reachedRealComponent: false,
      kindState: null,
      fallbackReason: null,
      notes: [...notes, "This path produced no block at all."],
    };
  }
  const marker = readIrRouteMarker(principal.metadata);
  const reached = reachedRealComponent(principal);
  const why: string[] = [];
  // A plain-value shape (root form: any value, a number, a list) can never
  // travel as a tagged object, so a chat answer that tags it is refused by
  // design — say so, rather than leave "broken-instance" to imply a bad example.
  if (!reached && marker?.reason === "broken-instance" && kindRegistry.getSchema(kind)?.root) {
    why.push(
      "This shape holds a single plain value, so an answer that tags it as an object can't be recognized in chat. It draws as itself when reopened from a record.",
    );
  }
  return {
    resolvedAs: principal.type,
    reachedRealComponent: reached,
    kindState: envelopeOf(source)?.root.kindState ?? null,
    fallbackReason: marker?.reason ?? null,
    notes:
      reached || principal.type === GENERIC_STRUCTURED_COMPONENT_KEY
        ? [...notes, ...why]
        : [...notes, ...why, `No component drew this: the route returned a plain "${principal.type}" block.`],
  };
}

/**
 * Feed wire text through the REAL accumulator, chunk by chunk, routing every
 * upsert exactly as the chat renderer does.
 *
 * `chunkSize` mimics a provider's token cadence; the value only affects how
 * many intermediate frames are recorded, never the settled result.
 */
export function runStreamingPath(
  pathId: RenderPathId,
  kind: string,
  wire: string,
  chunkSize = 36,
): RenderPathRun {
  const latest = new Map<string, RenderBlockPayload>();
  const order: string[] = [];
  const records: StreamTickRecord[] = [];
  const frames: Array<{ block: RenderBlockPayload; isStreamActive: boolean }> = [];
  let chunkNo = 0;

  const accumulator = new StreamBlockAccumulator(`render-path-${pathId}`, ((
    payload: { requestId: string; block: RenderBlockPayload },
  ) => ({ type: "render-path/upsert", payload })) as never);

  let finalizing = false;
  const dispatch = (action: unknown) => {
    const block = (action as { payload?: { block?: RenderBlockPayload } })
      .payload?.block;
    if (!block) return action;
    // Keep the RAW block for the renderer — SafeBlockRenderer routes it itself,
    // and pre-routing here would mean the preview renders something the chat
    // renderer never sees. Route a projection alongside, purely to record what
    // the decision WAS on this frame.
    if (!latest.has(block.blockId)) order.push(block.blockId);
    latest.set(block.blockId, block);
    const routed = routeBlock(block);
    const record = recordFromUpsert(chunkNo, block);
    record.routed = {
      type: routed.type,
      hasServerData: routed.serverData !== undefined,
    };
    // Every frame, judged as BlockRenderer draws it: the MESSAGE streams until
    // finalize, so a block that settled mid-stream is drawn live (V5a).
    record.drawsKindAsRawJson = drawsKindAsRawJson(block, {
      isStreamActive: !finalizing,
    });
    records.push(record);
    frames.push({ block, isStreamActive: !finalizing });
    return action;
  };

  for (const chunk of chunkWireText(wire, chunkSize)) {
    chunkNo += 1;
    accumulator.ingest(chunk, dispatch);
  }
  chunkNo += 1;
  finalizing = true;
  accumulator.finalize(dispatch);

  const blocks = order
    .map((id) => latest.get(id))
    .filter((b): b is RenderBlockPayload => Boolean(b))
    .filter((b) => (b.content ?? "").trim().length > 0);

  return {
    pathId,
    blocks,
    records,
    wire,
    verdict: verdictFor(blocks, kind, []),
    frames,
  };
}

/** Wrap a payload in a generic XML tag, one line, the way a model often answers. */
export function xmlTagWire(kind: string, value: Record<string, unknown>) {
  const body = JSON.stringify(withKindFirst(value, kind));
  return `Here it is:\n<output>\n${body}\n</output>\nDone.\n`;
}

/** Wrap a payload the way the artifact system does. */
export function artifactWire(kind: string, value: Record<string, unknown>) {
  const body = JSON.stringify(withKindFirst(value, kind));
  return `<artifact type="${kind}" id="preview" title="${kind}">\n${body}\n</artifact>\n`;
}

/** The made-up canvas id the materialized path carries (UUID-shaped, so it renders by id). */
export const MATERIALIZED_PREVIEW_ID = "5f0c2a8e-3b1d-4c6e-9a7f-2d4b6e8c1a3f";

/** The canvas type a kind materializes as (its artifact def, else the generic kind value). */
export function canvasTypeForKind(kind: string): string {
  return resolveArtifactDefByKind(kind)?.canvasType ?? "kind_value";
}

/**
 * The MATERIALIZED wire (K5, round 7): what a saved answer's text holds once
 * the Canvas has its row — prose, then the id-bearing tag the materializer
 * writes (`wrapArtifactText`), body = compact canonical JSON.
 */
export function materializedArtifactWire(kind: string, value: Record<string, unknown>) {
  const body = JSON.stringify(withKindFirst(value, kind));
  const title = typeof value.title === "string" ? value.title : kind;
  return `Here is what you asked for.\n\n${wrapArtifactText({
    canvasType: canvasTypeForKind(kind),
    id: MATERIALIZED_PREVIEW_ID,
    version: 1,
    title,
    body,
  })}\n`;
}

/**
 * The RELOAD path: a stored value, already parsed, routed as a rehydrated
 * message is. No text is produced and none is parsed — in production either.
 */
export function runReloadPath(
  kind: string,
  value: Record<string, unknown>,
): RenderPathRun {
  const envelope = envelopeFromCompleteValue({ ...value }, kind);
  const block: RenderBlockPayload = {
    blockId: "reload-0",
    blockIndex: 0,
    type: "code",
    status: "complete",
    content: JSON.stringify(withKindFirst(value, kind), null, 2),
    metadata: { [IR_ENVELOPE_KEY]: envelope },
  };
  return {
    pathId: "reload",
    blocks: [block],
    records: [],
    wire: null,
    verdict: verdictFor([block], kind, []),
  };
}

/**
 * The SERVER-PARTIAL path. The rendering is production
 * (`resolveProvisionalKindRender` → `applyIrKindRoute`); the partial event is
 * built here rather than received from Python, and the verdict says so.
 */
export function runServerPartialPath(
  kind: string,
  value: Record<string, unknown>,
): RenderPathRun {
  const envelope = envelopeFromCompleteValue({ ...value }, kind);
  const block: RenderBlockPayload = {
    blockId: "partial-0",
    blockIndex: 0,
    type: "code",
    status: "streaming",
    content: JSON.stringify(withKindFirst(value, kind)),
    metadata: {
      __ir_partial: {
        seq: 1,
        root: { ...envelope.root, kindState: "speculative", status: "streaming" },
      },
      [IR_ENVELOPE_KEY]: envelope,
    },
  };
  return {
    pathId: "server_partial",
    blocks: [block],
    records: [],
    wire: null,
    verdict: verdictFor([block], kind, [
      "The partial event was constructed in this browser, not received from the server — this checks the render half only.",
    ]),
  };
}

/** Build the wire text for a streaming path. */
export function wireForPath(
  pathId: RenderPathId,
  kind: string,
  value: Record<string, unknown>,
): string | null {
  if (pathId === "chat_fence") return buildWireText(value, kind, "fenced");
  if (pathId === "chat_fence_one_line")
    return buildWireText(value, kind, "fenced_one_line");
  if (pathId === "chat_xml_tag") return xmlTagWire(kind, value);
  if (pathId === "chat_bare") return buildWireText(value, kind, "bare");
  if (pathId === "chat_artifact") return artifactWire(kind, value);
  if (pathId === "chat_artifact_materialized") return materializedArtifactWire(kind, value);
  return null;
}

/** Run whichever path was asked for. `direct`, `loading` and `input` mount a
 * component rather than producing blocks, so the UI owns those. */
export function runRenderPath(
  pathId: RenderPathId,
  kind: string,
  value: Record<string, unknown>,
  chunkSize = 36,
  /**
   * The component registry's version when this run is made. Unused in the body ON
   * PURPOSE: it is the React Compiler's memo key, so a caller re-runs when a view
   * lands after first paint (the verdict routes through the live resolver).
   */
  registryVersion?: number,
): RenderPathRun | null {
  void registryVersion;
  const wire = wireForPath(pathId, kind, value);
  if (wire !== null) return runStreamingPath(pathId, kind, wire, chunkSize);
  if (pathId === "reload") return runReloadPath(kind, value);
  if (pathId === "server_partial") return runServerPartialPath(kind, value);
  return null;
}

/**
 * The kind's MEASURED schema state (see `KindRegistry.schemaState`). A screen
 * may claim "no schema" only on `absent`; `pending` is said as pending.
 * `registryVersion` is the React Compiler's memo key — pass the kind's
 * repaint version so a schema landing after first paint is re-read.
 */
export function readKindSchemaState(
  kind: string,
  registryVersion?: number,
): "loaded" | "pending" | "absent" | "failed" {
  void registryVersion;
  return kindRegistry.schemaState(kind);
}
