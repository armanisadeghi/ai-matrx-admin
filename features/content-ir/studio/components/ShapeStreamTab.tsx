"use client";

/**
 * Stream tab — replay the EXACT stream this shape's component receives in
 * production, before an agent ever streams it for real.
 *
 * The canonical example is serialized to wire text (chat fence or bare
 * structured-output), chunked, and fed through the REAL
 * `StreamBlockAccumulator` — the same class chat runs — and the resulting
 * blocks render through the REAL `SafeBlockRenderer` stages (kind route →
 * provisional → pending loader → dispatch). Nothing here is a lookalike:
 * if the loading skeleton doesn't appear instantly, or the component
 * snaps in only at the end, that is exactly what users see in chat.
 *
 * The verdict panel makes the check explicit: instant detection, loading
 * component identity, progressive growth, raw-JSON flash, final swap.
 * Contract: common-docs/systems/architecture/content-ir/FEATURE.md.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Gauge,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button, Select } from "@ai-matrx/design-system/controls";
import type { Json } from "@/types/database.types";
import type { RenderBlockPayload } from "@ai-matrx/agents/generated/stream-events";
import { StreamBlockAccumulator } from "@ai-matrx/chat/agents/redux/execution-system/utils/stream-block-accumulator";
import { SafeBlockRenderer } from "@ai-matrx/rich-content/display/chat-markdown/internal-handlers/SafeBlockRenderer";
import { kindRegistry } from "@/features/content-ir/registry/kind-registry";
import { componentRegistry } from "@/features/content-ir/registry/component-registry";
import { isPartialReadyKind } from "@ai-matrx/rich-content/kinds/react/partial-kind-route";
import { useLoadingSlugForKind } from "@ai-matrx/rich-content/kinds/react/loading/use-loading-slug";
import { useKindExamples } from "@/features/content-ir/studio/kind-examples";
import {
  WIRE_MODE_LABEL,
  buildWireText,
  chunkWireText,
  deriveStreamVerdicts,
  recordFromUpsert,
  streamVerdictOutcome,
  type StreamTickRecord,
  type StreamVerdicts,
  type WireMode,
} from "@/features/content-ir/studio/stream-simulator";
import { drawsKindAsRawJson } from "@/features/content-ir/render-paths/draws-raw-kind-json";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

interface ShapeStreamTabProps {
  kind: string;
  label: string;
  kindDefinitionId: string;
}

const TICK_MS = 60;

const SPEEDS: Array<{ label: string; charsPerTick: number }> = [
  { label: "Slow", charsPerTick: 12 },
  { label: "Realistic", charsPerTick: 36 },
  { label: "Fast", charsPerTick: 140 },
];

type RunState = "idle" | "playing" | "done" | "error";

const noop = () => {};

function VerdictRow({
  ok,
  warn,
  pending,
  title,
  detail,
}: {
  ok: boolean;
  /** Soft outcome — expected for some kinds, shown amber instead of red. */
  warn?: boolean;
  /** Not measurable yet (the stream is still running) — neutral, never red. */
  pending?: boolean;
  title: string;
  detail: string;
}) {
  const Icon = pending ? CircleDashed : ok ? CircleCheck : warn ? CircleAlert : CircleX;
  const tone = pending
    ? "text-muted-foreground"
    : ok
      ? "text-emerald-600 dark:text-emerald-400"
      : warn
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export default function ShapeStreamTab({
  kind,
  label,
  kindDefinitionId,
}: ShapeStreamTabProps) {
  const examples = useKindExamples(kindDefinitionId);
  const [mode, setMode] = useState<WireMode>("fenced");
  const [speedIdx, setSpeedIdx] = useState(1);
  const [runState, setRunState] = useState<RunState>("idle");
  const [runId, setRunId] = useState(0);
  const [blocks, setBlocks] = useState<RenderBlockPayload[]>([]);
  const [verdicts, setVerdicts] = useState<StreamVerdicts | null>(null);
  const [progress, setProgress] = useState({ chunk: 0, total: 0 });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordsRef = useRef<StreamTickRecord[]>([]);

  // Warm both registries up front so a cloud kind's schema/component resolve
  // during the run the same way they would mid-chat (cold fetch included).
  useEffect(() => {
    void kindRegistry.ensureWarm();
    void componentRegistry.ensureWarm();
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const canonical =
    examples.status === "ready"
      ? (examples.rows.find((r) => r.isCanonical) ?? examples.rows[0] ?? null)
      : null;

  const play = useCallback(() => {
    if (!canonical) return;
    const data = canonical.data as Json;
    if (typeof data !== "object" || data === null || Array.isArray(data))
      return;

    if (timerRef.current) clearInterval(timerRef.current);
    recordsRef.current = [];
    setBlocks([]);
    setVerdicts(null);
    setRunState("playing");
    setRunId((n) => n + 1);

    const wire = buildWireText(data as Record<string, unknown>, kind, mode);
    const chunks = chunkWireText(wire, SPEEDS[speedIdx].charsPerTick);
    setProgress({ chunk: 0, total: chunks.length });

    const requestId = `shape-stream-sim-${kind}-${Date.now()}`;
    const byId = new Map<string, RenderBlockPayload>();
    let chunkNo = 0;

    let finalizing = false;
    const accumulator = new StreamBlockAccumulator(requestId, (payload) => {
      const block = payload.block;
      byId.set(block.blockId, block);
      const record = recordFromUpsert(chunkNo, block);
      // The renderer's own answer — the verdict must never be blinder than
      // the screen (the one-line ```json defect passed the old flag).
      // Judged with the MESSAGE's stream state, as BlockRenderer draws it (V5a).
      record.drawsKindAsRawJson = drawsKindAsRawJson(block, {
        isStreamActive: !finalizing,
      });
      recordsRef.current.push(record);
      return payload;
    });
    const publish = () => {
      setBlocks([...byId.values()].sort((a, b) => a.blockIndex - b.blockIndex));
      setVerdicts(deriveStreamVerdicts(recordsRef.current, kind));
      setProgress({ chunk: chunkNo, total: chunks.length });
    };
    const dispatch = (action: unknown) => action;

    timerRef.current = setInterval(() => {
      chunkNo += 1;
      const next = chunks[chunkNo - 1];
      if (next !== undefined) {
        accumulator.ingest(next, dispatch);
        publish();
        return;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      finalizing = true;
      accumulator.finalize(dispatch);
      publish();
      setRunState("done");
    }, TICK_MS);
  }, [canonical, kind, mode, speedIdx]);

  const interrupt = useCallback(() => {
    if (runState !== "playing") return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunState("error");
  }, [runState]);

  const partialReady = isPartialReadyKind(kind);
  // What the RUNTIME will actually render for this kind — declared, derived,
  // generic, or still being read — the one measured answer every surface reads
  // (it re-reads when the schema lands, so tab order cannot change it).
  const resolvedLoading = useLoadingSlugForKind(kind);
  // Pending until the stream ENDS — never a red verdict about the end before it.
  const ended = runState === "done";
  const detectedOutcome = streamVerdictOutcome({
    ok: verdicts?.detectedWhileStreaming ?? false,
    ended,
  });
  const resolvedOutcome = streamVerdictOutcome({
    ok: verdicts?.kindResolvedWhileStreaming ?? false,
    ended,
  });
  const flashOutcome = streamVerdictOutcome({
    ok: !(verdicts?.rawTextFlash ?? false),
    ended,
    sense: "defect",
  });
  const growthOutcome = streamVerdictOutcome({
    ok: (verdicts?.growthSteps ?? 0) > 1,
    ended,
  });
  const completedOutcome = streamVerdictOutcome({
    ok: verdicts?.completedAsKind ?? false,
    ended,
  });
  const isStreamActive = runState === "playing";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      {/* ── Live render (the production path) ── */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            icon={runState === "done" ? <RotateCcw /> : <Play />}
            onClick={play}
            disabled={!canonical || runState === "playing"}
          >
            {runState === "done" ? "Replay stream" : "Play stream"}
          </Button>
          {runState === "playing" ? (
            <Button variant="danger" icon={<CircleX />} onClick={interrupt}>
              Simulate interruption
            </Button>
          ) : null}
          <Select<WireMode>
            value={mode}
            onValueChange={setMode}
            disabled={runState === "playing"}
            aria-label="Wire mode"
            options={(Object.keys(WIRE_MODE_LABEL) as WireMode[]).map((m) => ({
              value: m,
              label: WIRE_MODE_LABEL[m],
            }))}
          />
          <Select
            value={String(speedIdx)}
            onValueChange={(v) => setSpeedIdx(Number(v))}
            disabled={runState === "playing"}
            aria-label="Stream speed"
            options={SPEEDS.map((s, i) => ({
              value: String(i),
              label: s.label,
              meta: `${s.charsPerTick} chars/tick`,
            }))}
          />
          {progress.total > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Gauge className="h-3.5 w-3.5" />
              {Math.min(progress.chunk, progress.total)}/{progress.total} chunks
            </span>
          )}
        </div>

        {runState === "error" ? (
          <div
            role="alert"
            className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive-ink"
          >
            Simulated stream interruption. No data was written. The last valid
            partial render stays visible below with streaming disabled.
            <ErrorAlchemyMenu className="ml-auto" />
          </div>
        ) : null}

        <div className="rounded-lg border border-border bg-card p-4">
          {examples.status === "error" && (
            <p className="text-sm text-destructive">{examples.message} <ErrorAlchemyMenu error={examples.message} /></p>
          )}
          {examples.status === "ready" && !canonical && (
            <p className="text-sm text-muted-foreground">
              No saved example for {label} — add a canonical sample on the
              Preview tab first; the simulator streams that sample.
            </p>
          )}
          {canonical && runState === "idle" && (
            <p className="text-sm text-muted-foreground">
              Press Play to stream the canonical example through the real chat
              pipeline. Watch for: an instant loading state, progressive
              fill-in, and a clean final swap — never raw JSON.
            </p>
          )}
          <div key={runId}>
            {blocks.map((block, index) => (
              <SafeBlockRenderer
                key={block.blockId}
                block={{
                  type: block.type,
                  content: block.content ?? "",
                  serverData: block.data ?? undefined,
                  metadata: block.metadata,
                  isStreamingBlock: block.status === "streaming",
                }}
                index={index}
                isStreamActive={isStreamActive}
                replaceBlockContent={noop}
                handleOpenEditor={noop}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── The checks ── */}
      <aside className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Registry facts
          </p>
          {/* THE RUNTIME'S OWN ANSWER, not a re-derivation. This panel used
              to compute only "is the declared slug known?", which since
              derivation shipped stated the OPPOSITE of the pane rendering
              beside it: it called every undeclared kind a generic skeleton
              (~95% of them now derive a real silhouette) and claimed an
              invalid declaration falls back to generic (it falls through to
              derivation). It also read DB metadata only, so ~23 kinds that
              declare a loader in CODE were reported as undeclared. */}
          <VerdictRow
            ok={resolvedLoading.origin === "declared" || resolvedLoading.origin === "derived"}
            warn={
              resolvedLoading.origin === "pending" ||
              resolvedLoading.origin === "generic" ||
              resolvedLoading.invalidDeclared !== undefined
            }
            title={
              resolvedLoading.origin === "pending"
                ? "Loading component: checking"
                : `Loading component: ${resolvedLoading.slug ?? "generic skeleton"}`
            }
            detail={
              resolvedLoading.origin === "pending"
                ? "Reading this shape's schema."
                : resolvedLoading.invalidDeclared !== undefined
                  ? `Declared “${resolvedLoading.invalidDeclared}” is not a known loader.`
                  : resolvedLoading.origin === "declared"
                    ? "Declared on the shape."
                    : resolvedLoading.origin === "derived"
                      ? "Derived from the shape's schema."
                      : "The schema suggests no specific loader."
            }
          />
          {/* The partial-value fact is the routing function's own answer
              (`isPartialReadyKind`): progressive unless the kind opted out
              with `partialReady: false` or its component threw this session. */}
          <VerdictRow
            ok={partialReady}
            warn={!partialReady}
            title={partialReady ? "Fills in while streaming" : "Waits for the complete value"}
            detail={
              partialReady
                ? "Partial values render in the real component."
                : "Marked unsafe for partial values."
            }
          />
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stream verdicts
          </p>
          {!verdicts && (
            <p className="text-xs text-muted-foreground">
              Run the stream to measure this shape's live behavior.
            </p>
          )}
          {verdicts && (
            <>
              <VerdictRow
                ok={detectedOutcome === "pass"}
                pending={detectedOutcome === "pending"}
                title={
                  verdicts.detectedAtChunk !== null
                    ? `Structured region detected at chunk ${verdicts.detectedAtChunk}`
                    : detectedOutcome === "pending"
                      ? "Watching for the structured region"
                      : "Region never detected while streaming"
                }
                detail="Spotted mid-stream, it shows a loading view, not raw text."
              />
              <VerdictRow
                ok={resolvedOutcome === "pass"}
                pending={resolvedOutcome === "pending"}
                title={
                  resolvedOutcome === "pass"
                    ? "Kind identified while streaming"
                    : resolvedOutcome === "pending"
                      ? "Watching for the kind"
                      : "Kind only resolved at the end"
                }
                detail="Knowing the kind early picks its own loading view."
              />
              <VerdictRow
                ok={flashOutcome === "pass"}
                pending={flashOutcome === "pending"}
                title={
                  flashOutcome === "fail"
                    ? "Raw JSON flashed as text"
                    : flashOutcome === "pending"
                      ? "No raw-JSON flash so far"
                      : "No raw-JSON flash"
                }
                detail="Raw data text must never show while it streams."
              />
              <VerdictRow
                ok={growthOutcome === "pass"}
                pending={growthOutcome === "pending"}
                title={`Progressive snapshots: ${verdicts.growthSteps}`}
                detail="The value should fill in bit by bit, not all at the end."
              />
              <VerdictRow
                ok={completedOutcome === "pass"}
                pending={completedOutcome === "pending"}
                title={
                  completedOutcome === "pass"
                    ? `Completed as ${kind}`
                    : completedOutcome === "pending"
                      ? runState === "error"
                        ? "Stopped before the end"
                        : "Waiting for the stream to end"
                      : "Did not complete as this kind"
                }
                detail="The last block must carry this shape's finished data."
              />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
