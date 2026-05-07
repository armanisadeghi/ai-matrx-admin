"use client";

/**
 * useProcessingRunner — drives the full ProcessingProgressDialog.
 *
 * Two flavors:
 *
 *   1. runStages(processedDocumentId, stage)
 *      Wraps runStageStream and translates the per-stage events into
 *      the ProcessingFrame shape the dialog renders.
 *
 *   2. runFullPipelineForCldFile(cldFileId)
 *      Wraps the legacy ingestFileStream (POST /rag/ingest/stream) for
 *      the "I just uploaded a file, kick the pipeline" flow.
 *
 * Both expose the same dialog props so the UI consumes one shape.
 */

import { useCallback, useRef, useState } from "react";
import { runStageStream, type StageName } from "../api/stages";
import {
  ingestFileStream,
  type IngestStreamEvent,
} from "@/features/files/api/rag-ingest";
import type {
  ProcessingFrame,
  ProcessingResultSummary,
  ProcessingStageId,
} from "../components/ProcessingProgressDialog";

export interface UseProcessingRunnerState {
  open: boolean;
  title: string;
  subtitle: string | null;
  frame: ProcessingFrame | null;
  result: ProcessingResultSummary | null;
  error: string | null;
}

export interface UseProcessingRunner extends UseProcessingRunnerState {
  /** Start (or restart) a single stage. */
  runStage: (
    processedDocumentId: string,
    stage: StageName,
    title: string,
    subtitle?: string,
  ) => Promise<void>;

  /** Start the legacy /rag/ingest/stream pipeline against a cld_file id.
   *  Used right after an upload to kick the full extract → … → embed pipe. */
  runForCldFile: (
    cldFileId: string,
    title: string,
    subtitle?: string,
  ) => Promise<void>;

  cancel: () => void;
  close: () => void;
}

const INITIAL: UseProcessingRunnerState = {
  open: false,
  title: "",
  subtitle: null,
  frame: null,
  result: null,
  error: null,
};

export function useProcessingRunner(): UseProcessingRunner {
  const [state, setState] = useState<UseProcessingRunnerState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const close = useCallback(() => {
    cancel();
    setState(INITIAL);
  }, [cancel]);

  const runStage = useCallback(
    async (
      processedDocumentId: string,
      stage: StageName,
      title: string,
      subtitle?: string,
    ) => {
      cancel();
      const ac = new AbortController();
      abortRef.current = ac;
      setState({
        open: true,
        title,
        subtitle: subtitle ?? null,
        frame: {
          activeStage: stageNameToProcessingStageId(stage),
          message: "Starting…",
          fraction: null,
          current: 0,
          total: 0,
          lastUpdate: Date.now(),
        },
        result: null,
        error: null,
      });

      const accumulated: ProcessingResultSummary = { byStage: {} };

      try {
        for await (const ev of runStageStream(processedDocumentId, stage, {
          signal: ac.signal,
        })) {
          if (ac.signal.aborted) break;
          switch (ev.event) {
            case "stage.progress": {
              const stageId = stageNameToProcessingStageId(
                ev.data.stage,
              );
              const frac =
                ev.data.total > 0
                  ? Math.min(1, ev.data.current / ev.data.total)
                  : null;
              setState((s) => ({
                ...s,
                frame: {
                  activeStage: stageId,
                  message: ev.data.message,
                  fraction: frac,
                  current: ev.data.current,
                  total: ev.data.total,
                  lastUpdate: Date.now(),
                },
              }));
              break;
            }
            case "stage.result": {
              const id = stageNameToProcessingStageId(
                ev.data.stage as StageName,
              );
              accumulated.byStage[id] = summarizeStageResult(ev.data);
              break;
            }
            case "stage.error": {
              setState((s) => ({
                ...s,
                error: ev.data.message,
              }));
              break;
            }
            case "stage.end":
              break;
          }
        }
        if (!ac.signal.aborted) {
          setState((s) => ({
            ...s,
            result: accumulated,
            error: s.error,
          }));
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    },
    [cancel],
  );

  const runForCldFile = useCallback(
    async (cldFileId: string, title: string, subtitle?: string) => {
      cancel();
      const ac = new AbortController();
      abortRef.current = ac;
      setState({
        open: true,
        title,
        subtitle: subtitle ?? "Full pipeline",
        frame: {
          activeStage: "extract",
          message: "Starting…",
          fraction: null,
          current: 0,
          total: 0,
          lastUpdate: Date.now(),
        },
        result: null,
        error: null,
      });

      try {
        for await (const ev of ingestFileStream(cldFileId, {
          force: false,
          signal: ac.signal,
        })) {
          if (ac.signal.aborted) break;
          if (ev.event === "rag.ingest.progress") {
            const id = legacyStageToProcessingStageId(ev.data.stage);
            const frac =
              ev.data.total > 0
                ? Math.min(1, ev.data.current / ev.data.total)
                : null;
            setState((s) => ({
              ...s,
              frame: {
                activeStage: id,
                message: ev.data.message ?? ev.data.stage,
                fraction: frac,
                current: ev.data.current,
                total: ev.data.total,
                lastUpdate: Date.now(),
              },
            }));
          } else if (ev.event === "rag.ingest.complete") {
            const r = ev.data;
            setState((s) => ({
              ...s,
              result: {
                headline: `Indexed ${r.chunks_written.toLocaleString()} chunks (${r.embeddings_written.toLocaleString()} embeddings) via ${r.embedding_model}.`,
                byStage: {
                  embed: `${r.embeddings_written.toLocaleString()} embeddings written`,
                  chunk: `${r.chunks_written.toLocaleString()} chunks written`,
                },
              },
              error: r.error ?? null,
            }));
            return;
          } else if (ev.event === "rag.ingest.error") {
            setState((s) => ({ ...s, error: ev.data.message }));
            return;
          }
        }
      } catch (err) {
        if (!ac.signal.aborted) {
          setState((s) => ({
            ...s,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    },
    [cancel],
  );

  return { ...state, runStage, runForCldFile, cancel, close };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stageNameToProcessingStageId(s: StageName): ProcessingStageId {
  if (s === "extract" || s === "clean" || s === "chunk" || s === "embed") {
    return s;
  }
  // run_all — start at extract; updates from later stages will swap us.
  return "extract";
}

function legacyStageToProcessingStageId(
  s: string,
): ProcessingStageId | null {
  switch (s) {
    case "fetch":
    case "extract":
      return "extract";
    case "cleanup":
      return "clean";
    case "chunk":
      return "chunk";
    case "embed":
    case "upsert":
    case "complete":
      return "embed";
    default:
      return null;
  }
}

function summarizeStageResult(d: Record<string, unknown>): string {
  const stage = d.stage as string;
  const n = (k: string) =>
    typeof d[k] === "number" ? (d[k] as number).toLocaleString() : "0";
  switch (stage) {
    case "extract":
      return `${n("pages_count")} pages extracted (${n("ocr_pages")} via OCR)`;
    case "clean":
      return `${n("pages_cleaned")} pages cleaned (${n("cleaned_chars")} chars)`;
    case "chunk":
      return `${n("chunks_written")} chunks (${n("parents")} parents, ${n("children")} children)`;
    case "embed":
      return `${n("chunks_embedded")} new vectors (${n("chunks_already_embedded")} already done)`;
    default:
      return "Done";
  }
}
