"use client";

// features/mandates/runs/RunFacts.tsx — the facts row of a run and the live
// output block shared by both sides of the Runs tab.

import { useEffect, useRef } from "react";
import Link from "@/components/navigation/AppLink";
import { ArrowUpRight } from "lucide-react";
import { StatusToken, PropertyRow } from "@ai-matrx/design-system/controls";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { CostDoor } from "@/components/cost/CostDoor";
import { conversationHref } from "@/features/hindsight/subject-doors";
import { absoluteWhen, durationWords } from "@/features/mandates/run-history/format";
import { LiveRunDisplay } from "@ai-matrx/chat/agents/components/live-run/LiveRunDisplay";
import { selectModelNameById } from "@ai-matrx/agents/models";
import { readModelRecords } from "@ai-matrx/chat/agents/identity/model-catalog";
import { AdminUserRef } from "@/features/admin/users/components/AdminUserRef";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdminPerson, selectUserId } from "@/lib/redux/selectors/userSelectors";
import type { StoredRun } from "./service";
import type { StreamedRunState } from "./useStreamedRun";

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export function HolderRef({ run }: { run: StoredRun }) {
  const h = run.holder;
  if (!h.id) return <span className="text-muted-foreground">Not recorded</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <EntityRef token={h.type} id={h.id} name={h.name ?? (h.type === "workflow" ? "Workflow" : "Agent")} showIcon={false} />
      <span className="text-muted-foreground">{h.versionNumber != null ? `v${h.versionNumber}` : "Latest"}</span>
    </span>
  );
}

/** A person, never a bare id: "You", the person's name (platform admins), or "Someone else". */
function RanBy({ userId }: { userId: string | null }) {
  const me = useAppSelector(selectUserId);
  const admin = useAppSelector(selectIsSuperAdminPerson);
  if (!userId) return <>Not recorded</>;
  if (userId === me) return <>You</>;
  if (admin) return <AdminUserRef userId={userId} hideEmail />;
  return <>Someone else</>;
}

/** The model's name from the catalog; the id only when the catalog has no row for it. */
function modelName(id: string | null): string {
  if (!id) return "Not recorded";
  return selectModelNameById(readModelRecords(), id) || id;
}

export function RunFacts({ run, audience }: { run: StoredRun; audience: "admin" | "product" }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      <PropertyRow label="Result">
        {run.success === null ? (
          <StatusToken status="unknown" label="Not recorded" />
        ) : run.success ? (
          <StatusToken status="ok" label="Succeeded" />
        ) : (
          <StatusToken status="error" label="Failed" />
        )}
      </PropertyRow>
      <PropertyRow label="Mandate Holder">
        <HolderRef run={run} />
      </PropertyRow>
      <PropertyRow label="Model">{run.modelName ?? modelName(run.modelId)}</PropertyRow>
      <PropertyRow label="Ran by">
        <RanBy userId={run.ranBy} />
      </PropertyRow>
      <PropertyRow label="When">{run.createdAt ? absoluteWhen(run.createdAt) : "—"}</PropertyRow>
      <PropertyRow label="Usage"><CostDoor usd={run.cost} label="Usage" /></PropertyRow>
      <PropertyRow label="Time">{durationWords(run.durationMs)}</PropertyRow>
      {run.runRow?.door ? <PropertyRow label="Door">{doorWords(run.runRow.door)}</PropertyRow> : null}
      {run.runRow?.watching ? <PropertyRow label="AI Watch">On for this run</PropertyRow> : null}
      <PropertyRow label="Conversation">
        <Link
          href={conversationHref(run.conversationId, audience)}
          className="inline-flex items-center gap-0.5 text-primary hover:underline"
        >
          Open
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </PropertyRow>
      {run.runRow?.refusal ? (
        <div className="col-span-2 text-[12px] text-destructive">
          {run.runRow.refusal.sentence || run.runRow.refusal.code}
          <ErrorAlchemyMenu error={run.runRow.refusal.sentence || run.runRow.refusal.code} />
        </div>
      ) : null}
      {run.error ? <div className="col-span-2 text-[12px] text-destructive">{run.error}<ErrorAlchemyMenu error={run.error} /></div> : null}
    </div>
  );
}

/** A run row's door label as words: `chat_start` → "Chat start". */
export function doorWords(door: string): string {
  const words = door.replace(/_/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : door;
}

/** A streamed run's live output, then its cost and time beside the original's. */
export function StreamedRunBlock({
  label,
  state,
  original,
  audience,
}: {
  label: string;
  state: StreamedRunState;
  original: StoredRun | null;
  audience: "admin" | "product";
}) {
  // NEVER SILENT: the block sits under its button inside the run pane's own scroller, so a refusal
  // (the server's words) or a starting run can land below the pane's fold — bring it into view the
  // moment it appears (live defect 2026-10-20: a 409 drew under the fold and read as "nothing happened").
  const blockRef = useRef<HTMLDivElement>(null);
  const shown = state.requestId ?? state.result;
  useEffect(() => {
    if (shown) blockRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [shown]);
  if (!state.requestId && !state.result) return null;
  const stored = state.stored;
  return (
    <div ref={blockRef} className="space-y-2">
      {state.requestId ? (
        <LiveRunDisplay
          requestId={state.requestId}
          label={label}
          pending={state.running}
          failure={state.result && !state.result.ok ? state.result.error : null}
          bodyClassName="px-3 py-2 text-sm"
        />
      ) : state.result?.error ? (
        <p className="text-[12px] text-destructive">{state.result.error}<ErrorAlchemyMenu error={state.result.error} /></p>
      ) : null}
      {state.result ? (
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-0.5 text-[12px]">
          <span />
          <span className="text-muted-foreground">This run</span>
          <span className="text-muted-foreground">Original</span>
          <span className="text-muted-foreground">Usage</span>
          <span>{stored ? <CostDoor usd={stored.cost} iconOnly /> : "Reading"}</span>
          <span>{original ? <CostDoor usd={original.cost} iconOnly /> : "—"}</span>
          <span className="text-muted-foreground">Time</span>
          <span className="tabular-nums">{durationWords(stored?.durationMs ?? state.result.durationMs)}</span>
          <span className="tabular-nums">{original ? durationWords(original.durationMs) : "—"}</span>
          {state.result.conversationId ? (
            <>
              <span className="text-muted-foreground">Conversation</span>
              <Link
                href={conversationHref(state.result.conversationId, audience)}
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                Open
                <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
