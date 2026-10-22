"use client";

/**
 * The Data section of one AI run: one card per tool call, each with its RAW answer, every copy the
 * model was SENT, the cut trail between them, and the tool's own DISPLAY.
 */

import { useEffect, useState } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { FileText } from "lucide-react";
import { ToolCallVisualization } from "@ai-matrx/chat/tool-call-visualization/components/ToolCallVisualization";
import { cxToolCallToLifecycleEntry } from "@ai-matrx/chat/tool-call-visualization/utils/cxToolCallToLifecycleEntry";
import { toolCallRowToRecord, type CxToolCallEntry } from "@ai-matrx/chat/agents/redux/execution-system/thunks/conversation-bundle";
import { useOpenFilePreviewWindow } from "@/features/overlays/definitions/filePreviewWindow.overlay";
import type { AiWatchSnapshot } from "@/features/ai-watch/ai-watch-records";
import { fetchOriginalFileIds, fetchRunToolCalls, type ToolCallDataRow } from "./ai-watch-data-reads";
import { DataPane } from "./DataPane";
import { RawEntryView } from "./RawEntryView";
import {
  changedCopies,
  cutLine,
  rawMissingReason,
  readRawCapture,
  sentToModel,
  sizeLabel,
  webReadOriginals,
} from "./raw-data";

export function CutTrail({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="rounded border border-dashed border-border px-2 py-1" data-testid="ai-watch-cut-trail">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cuts</div>
      <ul className="mt-0.5 flex flex-col gap-0.5 font-mono text-[11px]">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function WebOriginals({ row }: { row: ToolCallDataRow }) {
  const openFile = useOpenFilePreviewWindow();
  const originals = webReadOriginals(row.tool_name, row.output);
  const key = originals.map((o) => o.processedDocumentId).join(",");
  const [files, setFiles] = useState<Map<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    let live = true;
    fetchOriginalFileIds(key.split(",")).then(
      (found) => live && setFiles(found),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, [key]);
  if (!originals.length) return null;
  return (
    <>
      {error ? <ErrorNotice title="The page originals could not be read" message={error} /> : null}
      {originals.map((o) => {
        const fileId = files?.get(o.processedDocumentId) ?? null;
        return (
          <DataPane key={o.processedDocumentId} tier="raw" title={`Page as fetched · ${o.url}`} size="stored file" open>
            {fileId ? (
              <Button variant="outline" icon={<FileText />} onClick={() => openFile({ fileId })}>
                Open the original page capture
              </Button>
            ) : (
              <div className="text-muted-foreground">{files ? "No original kept for this page" : "Looking up the original"}</div>
            )}
          </DataPane>
        );
      })}
    </>
  );
}

function ToolCallDataCard({ row, snapshots }: { row: ToolCallDataRow; snapshots: AiWatchSnapshot[] }) {
  const capture = readRawCapture(row.metadata);
  const sent = sentToModel(row.call_id, row.tool_name, snapshots);
  const changed = changedCopies(sent);
  const entry = cxToolCallToLifecycleEntry(toolCallRowToRecord(row as unknown as CxToolCallEntry));
  const facts = capture?.facts ?? {};
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border p-2" data-testid="ai-watch-tool-data">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.tool_name}</span>
        <span className="text-muted-foreground">
          call {row.iteration ?? "?"} · result {sizeLabel(typeof facts.result_chars === "number" ? facts.result_chars : row.output_chars)}
        </span>
      </div>
      <WebOriginals row={row} />
      {capture ? (
        capture.raw.map((e, i) => <RawEntryView key={i} entry={e} storedText={row.output} organizationId={row.organization_id} />)
      ) : (
        <DataPane tier="raw" title="Raw answer" size="size unknown" open>
          <div className="text-muted-foreground">{rawMissingReason(capture)}</div>
        </DataPane>
      )}
      {capture?.droppedItems ? (
        <div className="text-muted-foreground">{capture.droppedItems} more raw answers were not kept (over the per-step count)</div>
      ) : null}
      <CutTrail lines={(capture?.cuts ?? []).map(cutLine)} />
      {sent.length === 0 ? (
        <DataPane tier="sent" title="What the model received" size="size unknown" open>
          <div className="text-muted-foreground">
            {snapshots.length ? "No later request carried this result" : "No recorded request for this run yet"}
          </div>
        </DataPane>
      ) : (
        sent.map((copy, i) => (
          <DataPane
            key={`${copy.snapshotId}-${i}`}
            tier="sent"
            title={`Iteration ${copy.iteration ?? "?"}${changed.includes(copy.iteration ?? 0) ? " · differs from the first copy" : ""}`}
            size={sizeLabel(copy.chars)}
            note={copy.matchedBy === "tool name" ? "Matched by tool name (this provider sends no call id)" : null}
            value={copy.content}
          />
        ))
      )}
      <DataPane tier="display" title="The tool's display" size={sizeLabel(row.output_chars)}>
        <ToolCallVisualization entries={[entry]} isPersisted />
      </DataPane>
    </div>
  );
}

export function RunDataSection({
  serverId,
  snapshots,
  refreshKey,
}: {
  serverId: string | null;
  snapshots: AiWatchSnapshot[];
  /** Changes when the run's record changes (its tool calls are re-read). */
  refreshKey: string;
}) {
  const [rows, setRows] = useState<ToolCallDataRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!serverId) return;
    let live = true;
    fetchRunToolCalls(serverId).then(
      (found) => {
        if (!live) return;
        setRows(found);
        setError(null);
      },
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, [serverId, refreshKey]);
  if (!serverId) return null;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Data · tool calls ({rows?.length ?? 0})
      </h3>
      {error ? <ErrorNotice title="The run's tool calls could not be read" message={error} /> : null}
      {rows && rows.length === 0 ? <div className="text-muted-foreground">No tool calls on this run</div> : null}
      {(rows ?? []).map((row) => (
        <ToolCallDataCard key={row.id} row={row} snapshots={snapshots} />
      ))}
    </section>
  );
}
