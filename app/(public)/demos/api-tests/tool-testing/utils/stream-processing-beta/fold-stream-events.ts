import type {
  StreamEvent,
  ChunkPayload,
  ReasoningChunkPayload,
  PhasePayload,
  InitPayload,
  CompletionPayload,
  TypedDataPayload,
  ToolEventPayload,
  WarningPayload,
  InfoPayload,
  ErrorPayload,
  ContentBlockPayload,
  RecordReservedPayload,
  RecordUpdatePayload,
  HeartbeatPayload,
  EndPayload,
  BrokerPayload,
} from "@/types/python-generated/stream-events";
import {
  isChunkEvent,
  isReasoningChunkEvent,
  isPhaseEvent,
  isInitEvent,
  isCompletionEvent,
  isTypedDataEvent,
  isToolEventEvent,
  isWarningEvent,
  isInfoEvent,
  isErrorEvent,
  isContentBlockEvent,
  isRecordReservedEvent,
  isRecordUpdateEvent,
  isHeartbeatEvent,
  isEndEvent,
  isBrokerEvent,
} from "@/types/python-generated/stream-events";
import type { FinalPayload, ToolStreamEvent } from "../../types";
import { buildToolCallObjectsForPreview } from "./build-tool-call-objects";
import type { ToolCallObject } from "@/lib/api/tool-call.types";
import { toolEventPayloadToToolStreamEvent } from "./normalize-tool-event";

/** Wire event that did not match any known V2 discriminator (same as `process-stream` fallback). */
export interface UnknownWireEvent {
  event: string;
  data: unknown;
}

/** Fold bucket key — one row appended per wire event (arrival order). */
export type BackendStreamFoldBucket =
  | "chunk"
  | "reasoning_chunk"
  | "phase"
  | "init"
  | "completion"
  | "data"
  | "tool_event"
  | "warning"
  | "info"
  | "error"
  | "content_block"
  | "record_reserved"
  | "record_update"
  | "heartbeat"
  | "end"
  | "broker"
  | "unknown";

/**
 * One arrival step: wire row `i` → bucket + `record` (object stored in that bucket).
 * `toolTester` captures demo-only side effects on the same row (final payload / tool row).
 */
export interface BackendStreamArrivalEntry {
  wireEvent: string;
  bucket: BackendStreamFoldBucket;
  record: unknown;
  toolTester?: {
    finalPayload?: FinalPayload | null;
    toolStreamEvent?: ToolStreamEvent;
  };
}

function toolTesterDelta(
  beforeFinal: FinalPayload | null,
  beforeToolLen: number,
  state: BackendStreamFoldState,
): BackendStreamArrivalEntry["toolTester"] | undefined {
  const finalChanged = state.toolTesterFinalPayload !== beforeFinal;
  const toolAdded = state.toolStreamEvents.length > beforeToolLen;
  if (!finalChanged && !toolAdded) return undefined;
  return {
    ...(finalChanged && { finalPayload: state.toolTesterFinalPayload }),
    ...(toolAdded && {
      toolStreamEvent:
        state.toolStreamEvents[state.toolStreamEvents.length - 1],
    }),
  };
}

/**
 * Full fold of an NDJSON stream — mirrors branching order in
 * `lib/api/stream-parser.ts` `consumeStream` and `process-stream.ts`.
 * Use for offline replay, tests, or after capturing `StreamEvent[]` via `onEvent`.
 */
export interface BackendStreamFoldState {
  rawEvents: StreamEvent[];
  accumulatedText: string;
  accumulatedReasoning: string;
  chunks: ChunkPayload[];
  reasoningChunks: ReasoningChunkPayload[];
  phases: PhasePayload[];
  inits: InitPayload[];
  completions: CompletionPayload[];
  dataPayloads: Array<TypedDataPayload | Record<string, unknown>>;
  toolEventPayloads: ToolEventPayload[];
  warnings: WarningPayload[];
  infos: InfoPayload[];
  errors: ErrorPayload[];
  contentBlocks: ContentBlockPayload[];
  recordReserved: RecordReservedPayload[];
  recordUpdates: RecordUpdatePayload[];
  heartbeats: HeartbeatPayload[];
  ends: EndPayload[];
  brokers: BrokerPayload[];
  unknownWireEvents: UnknownWireEvent[];
  /** Counts per category (debug / parity with `process-stream` metrics). */
  counts: {
    total: number;
    chunk: number;
    reasoningChunk: number;
    phase: number;
    init: number;
    completion: number;
    data: number;
    tool: number;
    warning: number;
    info: number;
    error: number;
    contentBlock: number;
    recordReserved: number;
    recordUpdate: number;
    heartbeat: number;
    end: number;
    broker: number;
    unknown: number;
  };
  // ─── Tool-testing demo slice (order-sensitive; same rules as prior `foldStreamEventsToToolTestState`) ───
  toolStreamEvents: ToolStreamEvent[];
  toolTesterFinalPayload: FinalPayload | null;
  /** Same length as `rawEvents`: per-wire-event fold contribution (arrival order). */
  arrivalTimeline: BackendStreamArrivalEntry[];
}

function emptyCounts(): BackendStreamFoldState["counts"] {
  return {
    total: 0,
    chunk: 0,
    reasoningChunk: 0,
    phase: 0,
    init: 0,
    completion: 0,
    data: 0,
    tool: 0,
    warning: 0,
    info: 0,
    error: 0,
    contentBlock: 0,
    recordReserved: 0,
    recordUpdate: 0,
    heartbeat: 0,
    end: 0,
    broker: 0,
    unknown: 0,
  };
}

function emptyFoldState(): BackendStreamFoldState {
  return {
    rawEvents: [],
    accumulatedText: "",
    accumulatedReasoning: "",
    chunks: [],
    reasoningChunks: [],
    phases: [],
    inits: [],
    completions: [],
    dataPayloads: [],
    toolEventPayloads: [],
    warnings: [],
    infos: [],
    errors: [],
    contentBlocks: [],
    recordReserved: [],
    recordUpdates: [],
    heartbeats: [],
    ends: [],
    brokers: [],
    unknownWireEvents: [],
    counts: emptyCounts(),
    toolStreamEvents: [],
    toolTesterFinalPayload: null,
    arrivalTimeline: [],
  };
}

function pushArrival(
  state: BackendStreamFoldState,
  wireEvent: string,
  bucket: BackendStreamFoldBucket,
  record: unknown,
  toolTester: BackendStreamArrivalEntry["toolTester"],
): void {
  const entry: BackendStreamArrivalEntry = {
    wireEvent,
    bucket,
    record,
  };
  if (toolTester && Object.keys(toolTester).length > 0) {
    entry.toolTester = toolTester;
  }
  state.arrivalTimeline.push(entry);
}

function applyToolTesterRules(
  state: BackendStreamFoldState,
  event: StreamEvent,
): void {
  if (isPhaseEvent(event) && event.data.phase === "complete") {
    state.toolTesterFinalPayload = { status: "complete" } as FinalPayload;
  } else if (isCompletionEvent(event)) {
    state.toolTesterFinalPayload = event.data as unknown as FinalPayload;
  } else if (isTypedDataEvent(event)) {
    state.toolTesterFinalPayload = event.data as unknown as FinalPayload;
  } else if (isToolEventEvent(event)) {
    state.toolStreamEvents.push(toolEventPayloadToToolStreamEvent(event.data));
  }
}

/**
 * Single-pass fold of `StreamEvent[]` into structured state (all V2 event kinds).
 * Branch order matches `consumeStream` in `@/lib/api/stream-parser`.
 */
export function foldBackendStreamEvents(
  events: Iterable<StreamEvent>,
): BackendStreamFoldState {
  const state = emptyFoldState();

  for (const event of events) {
    state.rawEvents.push(event);
    state.counts.total++;

    const beforeFinal = state.toolTesterFinalPayload;
    const beforeToolLen = state.toolStreamEvents.length;
    applyToolTesterRules(state, event);
    const tt = toolTesterDelta(beforeFinal, beforeToolLen, state);
    const wire = event.event;

    if (isChunkEvent(event)) {
      state.counts.chunk++;
      const text = event.data.text;
      state.accumulatedText += text;
      state.chunks.push(event.data);
      pushArrival(state, wire, "chunk", event.data, tt);
    } else if (isReasoningChunkEvent(event)) {
      state.counts.reasoningChunk++;
      const text = event.data.text;
      state.accumulatedReasoning += text;
      state.reasoningChunks.push(event.data);
      pushArrival(state, wire, "reasoning_chunk", event.data, tt);
    } else if (isPhaseEvent(event)) {
      state.counts.phase++;
      state.phases.push(event.data);
      pushArrival(state, wire, "phase", event.data, tt);
    } else if (isInitEvent(event)) {
      state.counts.init++;
      state.inits.push(event.data);
      pushArrival(state, wire, "init", event.data, tt);
    } else if (isCompletionEvent(event)) {
      state.counts.completion++;
      state.completions.push(event.data);
      pushArrival(state, wire, "completion", event.data, tt);
    } else if (isTypedDataEvent(event)) {
      state.counts.data++;
      state.dataPayloads.push(event.data);
      pushArrival(state, wire, "data", event.data, tt);
    } else if (isToolEventEvent(event)) {
      state.counts.tool++;
      state.toolEventPayloads.push(event.data);
      pushArrival(state, wire, "tool_event", event.data, tt);
    } else if (isWarningEvent(event)) {
      state.counts.warning++;
      state.warnings.push(event.data);
      pushArrival(state, wire, "warning", event.data, tt);
    } else if (isInfoEvent(event)) {
      state.counts.info++;
      state.infos.push(event.data);
      pushArrival(state, wire, "info", event.data, tt);
    } else if (isErrorEvent(event)) {
      state.counts.error++;
      state.errors.push(event.data);
      pushArrival(state, wire, "error", event.data, tt);
    } else if (isContentBlockEvent(event)) {
      state.counts.contentBlock++;
      state.contentBlocks.push(event.data);
      pushArrival(state, wire, "content_block", event.data, tt);
    } else if (isRecordReservedEvent(event)) {
      state.counts.recordReserved++;
      state.recordReserved.push(event.data);
      pushArrival(state, wire, "record_reserved", event.data, tt);
    } else if (isRecordUpdateEvent(event)) {
      state.counts.recordUpdate++;
      state.recordUpdates.push(event.data);
      pushArrival(state, wire, "record_update", event.data, tt);
    } else if (isHeartbeatEvent(event)) {
      state.counts.heartbeat++;
      state.heartbeats.push(event.data);
      pushArrival(state, wire, "heartbeat", event.data, tt);
    } else if (isEndEvent(event)) {
      state.counts.end++;
      state.ends.push(event.data);
      pushArrival(state, wire, "end", event.data, tt);
    } else if (isBrokerEvent(event)) {
      state.counts.broker++;
      state.brokers.push(event.data);
      pushArrival(state, wire, "broker", event.data, tt);
    } else {
      state.counts.unknown++;
      const ev = event as { event?: string; data?: unknown };
      const unknownRec: UnknownWireEvent = {
        event: String(ev.event ?? "undefined"),
        data: ev.data,
      };
      state.unknownWireEvents.push(unknownRec);
      pushArrival(state, wire, "unknown", unknownRec, tt);
    }
  }

  return state;
}

/** @deprecated Prefer `foldBackendStreamEvents` + `.toolStreamEvents` / `.toolTesterFinalPayload`. */
export function foldStreamEventsToToolTestState(events: StreamEvent[]): {
  toolEvents: ToolStreamEvent[];
  finalPayload: FinalPayload | null;
} {
  const folded = foldBackendStreamEvents(events);
  return {
    toolEvents: folded.toolStreamEvents,
    finalPayload: folded.toolTesterFinalPayload,
  };
}

/**
 * Tool renderer pipeline: fold → `ToolCallObject[]` for `ToolCallVisualization`.
 */
export function streamEventsToRenderedToolCalls(input: {
  toolName: string;
  args: Record<string, unknown>;
  streamEvents: StreamEvent[];
}): {
  fold: BackendStreamFoldState;
  toolEvents: ToolStreamEvent[];
  finalPayload: FinalPayload | null;
  toolCallObjects: ToolCallObject[];
} {
  const fold = foldBackendStreamEvents(input.streamEvents);
  const toolCallObjects = buildToolCallObjectsForPreview(
    input.toolName,
    input.args,
    fold.toolStreamEvents,
    fold.toolTesterFinalPayload,
  );
  return {
    fold,
    toolEvents: fold.toolStreamEvents,
    finalPayload: fold.toolTesterFinalPayload,
    toolCallObjects,
  };
}
