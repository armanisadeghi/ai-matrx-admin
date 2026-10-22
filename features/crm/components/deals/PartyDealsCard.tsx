"use client";

// features/crm/components/deals/PartyDealsCard.tsx
//
// Deals on a party record — THE DOOR LAW both directions: a deal names its
// party, so the party names its deals, each one openable, plus a one-click
// "New deal" that arrives pre-bound to this record.

import { useEffect, useRef, useState } from "react";
import { Handshake } from "lucide-react";
import { PlusTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { useSurfaceWriteHandlers } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { CRM_RECORD_SURFACE_NAME } from "@/features/surfaces/manifests/crm-record.manifest";
import { parseDealDraft } from "../../agent-context/crmRecordSurfaceWrite";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@ai-matrx/design-system";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { useCrmContext } from "../../hooks/useCrmContext";
import { useCrmCardRead } from "../../hooks/useCrmCardRead";
import { usePipelines } from "../../deals/usePipelines";
import { createDeal, fetchDealsForParty } from "../../deals/service";
import type { DealRow } from "../../deals/types";
import { formatDealAmount } from "../../deals/types";
import type { PartyListRow } from "../../types";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { SectionEmpty } from "../record/SectionEmpty";
import { dealStatusBadge } from "./columns";
import { DealCreateDialog } from "./DealCreateDialog";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

interface Props {
  party: PartyListRow;
  /** What this card shows, handed up for the page's agent scope. */
  onStateChange?: (deals: DealRow[] | null, loadError: string | null) => void;
}

export function PartyDealsCard({ party, onStateChange }: Props) {
  // Kept once per record per tab (the Board's remount law): a wake or remount reads nothing; a new
  // deal or Retry reads again in place.
  const dealsRead = useCrmCardRead<DealRow[]>(`crm.party-deals:${party.id}`, () => fetchDealsForParty(party.id));
  const deals: DealRow[] | null = dealsRead.data ?? null;
  const loadError: string | null = dealsRead.isError ? (dealsRead.error ?? "The read failed") : null;
  const [createOpen, setCreateOpen] = useState(false);
  const reread = () => void dealsRead.refresh();
  const { pipelines, stageById } = usePipelines();
  const ctx = useCrmContext();
  const reportState = useRef(onStateChange);
  useEffect(() => {
    reportState.current = onStateChange;
  });

  // The agent twin of "New deal": the same createDeal the dialog calls, on the
  // default pipeline's first OPEN stage unless the agent names another.
  useSurfaceWriteHandlers(CRM_RECORD_SURFACE_NAME, {
    create_deal: {
      // Refused before the approval card when the value is malformed.
      validate: (raw: unknown) => {
        parseDealDraft(raw);
      },
      apply: async (raw: unknown) => {
      const input = parseDealDraft(raw);
      const pipeline = input.pipelineId
        ? pipelines.find((p) => p.id === input.pipelineId)
        : pipelines[0];
      if (!pipeline) {
        throw new Error(
          input.pipelineId
            ? "create_deal.pipeline_id is not one of this organization's pipelines."
            : "This organization has no deal pipeline yet — a person creates one on the Deals page first.",
        );
      }
      const stage = pipeline.stages.find((st) => !st.outcome);
      if (!stage) throw new Error(`Pipeline ${pipeline.name} has no open stage.`);
      const deal = await createDeal({
        name: input.name,
        pipelineId: pipeline.id,
        stageId: stage.id,
        orgId: party.organization_id,
        amount: input.amount,
        currency: input.currency,
        expectedCloseDate: input.expectedCloseDate,
        description: input.description,
        primaryPartyId: party.id,
        assignedTo: ctx?.userId ?? null,
        source: "agent",
      });
      reread();
      return {
        summary: `Created deal "${deal.name}" in ${pipeline.name} · ${stage.name}.`,
        data: { id: deal.id, name: deal.name, pipeline: pipeline.name, stage: stage.name },
      };
      },
    },
  });

  // The page's agent scope hears the deals (or why there are none) whenever the answer changes.
  useEffect(() => {
    if (dealsRead.isError) reportState.current?.(null, dealsRead.error ?? "The read failed");
    else if (dealsRead.data) reportState.current?.(dealsRead.data, null);
  }, [dealsRead.data, dealsRead.isError, dealsRead.error]);

  return (
    <SectionCard dense bodyClassName="p-2"
      compactAction
      empty={!loadError && deals !== null && deals.length === 0}
      title="Deals"
      icon={Handshake}
      count={loadError ? undefined : (deals?.length ?? undefined)}
      headerExtra={
        <PlusTapButton ariaLabel="New deal" onClick={() => setCreateOpen(true)} />
      }
    >
      {loadError ? (
        <div className="flex items-center justify-between gap-2 py-1 text-xs text-muted-foreground">
          <span>Couldn&apos;t load deals — {loadError} <ErrorAlchemyMenu error={loadError} /></span>
          <Button
            variant="outline"
            onClick={() => reread()}
          >
            Retry
          </Button>
        </div>
      ) : deals === null ? (
        <Skeleton className="h-8 w-full rounded" />
      ) : deals.length === 0 ? (
        <SectionEmpty>No deals with {party.display_name} yet</SectionEmpty>
      ) : (
        <ul className="space-y-1">
          {deals.map((deal) => (
            <li
              key={deal.id}
              className="flex items-center justify-between gap-2 rounded border border-border bg-muted/20 px-2 py-1.5"
            >
              <EntityRef token="crm_deal" id={deal.id} name={deal.name}>
                <span className="min-w-0 truncate text-sm font-medium">
                  {deal.name}
                </span>
              </EntityRef>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                <span className="tabular-nums">
                  {formatDealAmount(deal.amount, deal.currency)}
                </span>
                <span>{stageById.get(deal.stage_id)?.name ?? ""}</span>
                {dealStatusBadge(deal.status)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <DealCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pipelines={pipelines}
        orgId={party.organization_id}
        userId={ctx?.userId ?? null}
        defaultParty={{
          id: party.id,
          display_name: party.display_name,
          party_kind: party.party_kind,
        }}
        onCreated={() => reread()}
      />
    </SectionCard>
  );
}
