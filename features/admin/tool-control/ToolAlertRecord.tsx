"use client";

import Link from "@/components/navigation/AppLink";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { CopyForAiAction } from "@/features/admin/attention/CopyForAiAction";
import { Button } from "@ai-matrx/design-system/controls";
import { ErrorNotice } from "@ai-matrx/design-system";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";
import { decideToolProposal, fetchToolHealth } from "@/features/admin/attention/tool-health-service";
import { toolHealthItems, proposalDecisionPlan, proposalUsd, TOOL_HEALTH_SOURCE_ID, type ToolHealthRow } from "@/features/admin/attention/sources/tool-health";
import { extractErrorMessage } from "@/utils/errors";
import { formatRelativeTime } from "@/utils/datetime";
import { TOOL_CONTROL_PATH, TOOL_CONTROL_QUERY_KEY } from "./paths";
import { useSurfaceRuntimeRegistration } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { ADMIN_TOOL_ALERT_SURFACE_NAME } from "@/features/surfaces/manifests/admin-tool-alert.manifest";

type Facts = Record<string, unknown>;

const text = (v: unknown): string => (v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v));

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 border-b border-border py-1.5 text-sm last:border-b-0">
      <div className="w-40 shrink-0 text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words">{value}</div>
    </div>
  );
}

/** What was found, in the row's own numbers — a price proposal, the candidate list, or the alarm's plain facts. */
function Findings({ row }: { row: ToolHealthRow }) {
  const facts = (row.facts ?? {}) as Facts;
  const proposal = (facts.proposal ?? null) as Facts | null;
  if (row.kind === "price_drift" && proposal) {
    return (
      <>
        <Field label="Price book entry" value={text(proposal.price_ref)} />
        <Field label="Price book says" value={proposalUsd(proposal.current)} />
        <Field label="Vendor publishes" value={proposalUsd(proposal.value)} />
        <Field label="Evidence" value={text(proposal.evidence)} />
        <Field label="Basis" value={text(proposal.basis)} />
      </>
    );
  }
  if (row.kind === "import_candidate" && proposal) {
    const candidates = Array.isArray(proposal.candidates) ? (proposal.candidates as unknown[]) : [];
    return (
      <>
        <Field label="Sources to review" value={text(proposal.total ?? candidates.length)} />
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {candidates.map((c, i) => (
            <li key={i} className="break-words">
              {text(c)}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return (
    <>
      <Field label="Tool" value={text(facts.tool_name)} />
      <Field label="Source" value={text(facts.provider_name ?? facts.provider)} />
      <Field label="Rule that tripped" value={text(facts.rule).replace(/_/g, " ")} />
      <Field label="Numbers" value={facts.snapshot ? text(facts.snapshot) : ""} />
    </>
  );
}

export function ToolAlertRecord({ alarmId }: { alarmId: string }) {
  const query = useQuery({
    queryKey: [...TOOL_CONTROL_QUERY_KEY, "alert", alarmId],
    queryFn: fetchToolHealth,
    refetchOnWindowFocus: true,
  });
  const key = `${TOOL_HEALTH_SOURCE_ID}:${alarmId}`;
  const row = query.data?.find((r) => r.item_key === key) ?? null;
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const plan = row ? proposalDecisionPlan(row) : null;
  const decide = async (decision: "approve" | "decline") => {
    if (!plan) return;
    const ok = await confirm({
      title: decision === "approve" ? `${plan.approveLabel}?` : `${plan.declineLabel}?`,
      description: decision === "approve" ? plan.approveConsequence : plan.declineConsequence,
      confirmLabel: decision === "approve" ? plan.approveLabel : plan.declineLabel,
      variant: decision === "approve" ? "destructive" : "default",
    });
    if (!ok) return;
    setBusy(decision);
    try {
      const result = await decideToolProposal(alarmId, decision);
      toast.success(result.note);
      await queryClient.invalidateQueries({ queryKey: ["admin-attention"] });
    } catch (err) {
      toast.error("That did not happen", { description: extractErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };
  const item = row ? toolHealthItems([row], { muteLocally: () => {}, unmuteLocally: () => {} })[0] : null;

  // Surface `matrx-admin/tool-alert`: the alert as shown, and its decision opened for the person.
  useSurfaceRuntimeRegistration({
    surfaceName: ADMIN_TOOL_ALERT_SURFACE_NAME,
    getScope: () =>
      ({
        alert_id: alarmId,
        alert_load_status: query.isLoading ? "loading" : query.error ? "failed" : !row ? "closed" : "open",
        alert_kind: row?.kind,
        alert_title: row?.title,
        alert_sentence: row?.sentence,
        alert_detail: row?.detail,
        alert_state: item?.state,
        last_seen_at: row?.last_seen_at,
        findings: row?.facts ?? undefined,
        decision_offered: plan
          ? {
              can_approve: plan.canApprove,
              approve_label: plan.approveLabel,
              approve_consequence: plan.approveConsequence,
              decline_label: plan.declineLabel,
              decline_consequence: plan.declineConsequence,
            }
          : undefined,
      }) as SurfaceScopePayload,
    getWriteHandlers: () => ({
      propose_decision: {
        validate: (value: unknown) => {
          if (!plan) refuseSurfaceWrite("This alert offers no decision.");
          if (value !== "approve" && value !== "decline") refuseSurfaceWrite('Send "approve" or "decline".');
          if (value === "approve" && !plan.canApprove) refuseSurfaceWrite("This alert can only be declined.");
        },
        apply: (value: unknown) => {
          void decide(value === "approve" ? "approve" : "decline");
          return { summary: "The confirm dialog is open; nothing changes until the person presses it." };
        },
      },
    }),
  });

  return (
    <div className="flex flex-col gap-3 p-3 pt-[var(--matrx-page-top)]" data-testid="tool-alert-record">
      <Link href={TOOL_CONTROL_PATH} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Tool control
      </Link>
      {query.isLoading ? (
        <Spinner />
      ) : query.error ? (
        <ErrorNotice title="Could not read this alert" message={extractErrorMessage(query.error)} size="inline" />
      ) : !row || !item ? (
        <div className="text-sm text-muted-foreground" data-testid="tool-alert-closed">
          This alert is closed: it no longer appears among the open Tool alerts, so it was resolved. Open Tool control to see current state.
        </div>
      ) : (
        <>
          <div>
            <div className="text-xs text-muted-foreground">
              {item.state}
              {row.last_seen_at ? ` · ${formatRelativeTime(row.last_seen_at)}` : ""}
            </div>
            <h1 className="text-lg font-semibold">{row.title}</h1>
            <p className="mt-1 text-sm">{row.sentence}</p>
            {row.detail ? <p className="mt-1 text-sm text-muted-foreground">{row.detail}</p> : null}
          </div>
          <div className="rounded-md border border-border p-3">
            <Findings row={row} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {plan?.canApprove ? (
              <Button disabled={busy !== null} onClick={() => void decide("approve")} data-testid="tool-alert-approve">
                {plan.approveLabel}
              </Button>
            ) : null}
            {plan ? (
              <Button variant="outline" disabled={busy !== null} onClick={() => void decide("decline")} data-testid="tool-alert-decline">
                {plan.declineLabel}
              </Button>
            ) : null}
            <CopyForAiAction label="Tool alert" agent={item.copy!.agent} />
            <Link href={TOOL_CONTROL_PATH} className="text-sm underline">
              Tool control
            </Link>
            <Link href={`/administration/utilities/system-errors?kind=${encodeURIComponent(text((row.facts as Facts | null)?.routine_kind) || "tool_endpoint_auto_off")}`} className="text-sm underline">
              Recorded evidence
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
