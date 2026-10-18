"use client";

/**
 * AI calls tab — every AI run this page published (an `ai_run` ref), each opening in the Watch AI
 * window (`useWatchAiRun`). A workflow run is not an AI call: Smart Add's identify and setup runs
 * make none, so they are never counted here.
 * Provision tab — every provision snapshot captured for this page's runs and records (read from
 * `mandate.provision_snapshot`), shown with the canonical Provision body (`ProvisionWindowBody`).
 */

import { useState } from "react";
import { extractErrorMessage } from "@/utils/errors";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useAppDispatch } from "@/lib/redux/hooks";
import { captureProvision } from "@/features/provision-window/data";
import { Eye, PanelTopOpen } from "lucide-react";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { Button, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useWatchAiRun } from "@/features/overlays/definitions/aiWatchWindow.overlay";
import { useOpenProvisionWindow } from "@/features/overlays/definitions/provisionWindow.overlay";
import { ProvisionWindowBody } from "@/features/provision-window/ProvisionWindowBody";
import type { BuilderEntry, BuilderRef } from "../types";
import { RecordId } from "@ai-matrx/design-system";

type AiRef = Extract<BuilderRef, { type: "ai_run" }>;

export function BuilderAiTab({ aiRuns }: { aiRuns: { entry: BuilderEntry; ref: AiRef }[] }) {
  const watch = useWatchAiRun();
  if (!aiRuns.length) {
    return <p className="p-3 text-xs text-muted-foreground">No AI call on this page</p>;
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3">
      <ul className="rounded-md border border-border">
        {aiRuns.map(({ entry, ref }) => (
          <li key={entry.key} className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-b-0">
            <span className="truncate text-xs font-medium">{entry.label}</span>
            <span className="text-[11px] text-muted-foreground">{formatRelativeTime(entry.at)}</span>
            <Button
              variant="quiet"
              className="ml-auto"
              icon={<Eye className="h-3.5 w-3.5" />}
              onClick={() =>
                watch({
                  requestId: ref.requestId ?? null,
                  userRequestId: ref.userRequestId ?? null,
                  workflowRunId: ref.workflowRunId ?? null,
                  conversationId: ref.conversationId ?? null,
                  label: entry.label,
                })
              }
            >
              Watch
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BuilderSnapshotRef {
  id: string;
  label: string;
  at: number;
}

export interface BuilderCapturePoint {
  pointKey: string;
  /** Plain name of the inputs ("voice"); falls back to the point key. */
  label: string | null;
}

export interface BuilderCaptureSubject {
  id: string;
  organizationId: string;
  label: string;
}

/**
 * Capture now — one button per provision point the page names (a `mandate` ref with `provisionKey`),
 * for the record the page published (a `record` ref with `organizationId`). Builds the exact values the
 * step would receive, saves the snapshot and opens it in the Provision window.
 */
function CaptureBar({
  points,
  subject,
  onCaptured,
}: {
  points: BuilderCapturePoint[];
  subject: BuilderCaptureSubject;
  onCaptured: (snapshotId: string) => void;
}) {
  const dispatch = useAppDispatch();
  const openProvision = useOpenProvisionWindow();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const capture = async (p: BuilderCapturePoint) => {
    setBusy(p.pointKey);
    setError(null);
    try {
      const snap = await captureProvision(dispatch, p.pointKey, subject.id, subject.organizationId, "manual");
      onCaptured(snap.id);
      openProvision(snap.id, `${p.label ?? p.pointKey}: ${subject.label}`);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2" data-testid="builder-capture-bar">
      {points.map((p) => (
        <Button key={p.pointKey} variant="outline" disabled={busy !== null} onClick={() => capture(p)} title={p.pointKey}>
          {busy === p.pointKey ? "Capturing" : `Capture ${p.label ?? p.pointKey}`}
        </Button>
      ))}
      {error ? (
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate text-xs text-destructive" title={error}>{error}</span>
          <ErrorAlchemyMenu error={error} />
        </span>
      ) : null}
    </div>
  );
}

export function BuilderProvisionTab({
  snapshots,
  focusId,
  capturePoints = [],
  subject = null,
  onCaptured,
}: {
  /** Every snapshot for this page's runs and records, from the database. */
  snapshots: BuilderSnapshotRef[];
  focusId: string | null;
  capturePoints?: BuilderCapturePoint[];
  subject?: BuilderCaptureSubject | null;
  onCaptured?: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const openProvision = useOpenProvisionWindow();
  const ordered = [...snapshots].sort((a, b) => b.at - a.at);
  const wanted = picked ?? focusId;
  const current = ordered.find((s) => s.id === wanted) ?? ordered[0] ?? null;
  const bar =
    subject && capturePoints.length ? (
      <CaptureBar
        points={capturePoints}
        subject={subject}
        onCaptured={(id) => {
          setPicked(id);
          onCaptured?.();
        }}
      />
    ) : null;
  if (!current) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {bar}
        <p className="p-3 text-xs text-muted-foreground">No provision snapshot for this page yet</p>
      </div>
    );
  }
  const options: SelectOption<string>[] = ordered.map((s) => ({
    value: s.id,
    label: `${s.label} · ${new Date(s.at).toLocaleTimeString()}`,
  }));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {bar}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <Select aria-label="Snapshot" value={current.id} onValueChange={setPicked} options={options} />
        <RecordId value={current.id} label="Snapshot" show="full" />
        <Button
          variant="quiet"
          className="ml-auto"
          icon={<PanelTopOpen className="h-3.5 w-3.5" />}
          onClick={() => openProvision(current.id, current.label)}
        >
          Open window
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ProvisionWindowBody key={current.id} snapshotId={current.id} />
      </div>
    </div>
  );
}
