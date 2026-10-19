"use client";

/**
 * The live half of `matrx-user/marketing-brand-knowledge`: mounts the room's
 * surface over the site scope it inherits (`MarketingSiteSurfaceProvider`,
 * mounted by `BrandIdentitySiteSurface`) and emits each rung's state/result.
 *
 * Mounted ONLY by the identity Knowledge route. `DiscoveryWorkspace` (also used
 * in the floating site discovery window) is untouched.
 *
 * It reads the SAME react-query entries the page renders from (the ladder's
 * status entry and the approval queue's keyword-meaning entry — the queue's own
 * kind reader, so the proposals here are exactly the rows the queue shows), so
 * the scope is the server state the person is looking at. `getScope` runs at
 * trigger time. The one write target rules a pending proposal through the
 * queue's own decision writer; the ladder's run buttons stay human.
 */

import { useRef, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SurfaceRuntimeProvider,
  useSurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { keywordMeaningKind } from "@/features/approvals/kinds/seo/keyword-meaning";
import { noLiveAction } from "@/features/approvals/ApprovalQueue";
import type { ApprovalDecisions, ApprovalItem } from "@/features/approvals/types";
import { useMarketingSite } from "@/features/marketing/components/site/MarketingSiteContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";

import { useMarketingSiteSurfaceBase } from "@/features/marketing/lib/scopes/site-surface-base";
import { createMarketingBrandKnowledgeScope } from "@/features/surfaces/manifests/marketing-brand-knowledge.manifest";
import { STEP_META } from "./DiscoveryLadder";
import { RunningStepContext } from "./knowledge-live";
import {
  DISCOVERY_STEP_ORDER,
  getDiscoveryStatus,
  type DiscoveryStepKey,
  type DiscoveryStepStatus,
} from "./data";

export const MARKETING_BRAND_KNOWLEDGE_SURFACE_NAME =
  "matrx-user/marketing-brand-knowledge" as const;

/** The two proposal kinds the ladder emits (same list as DiscoveryWorkspace's queue). */
const DISCOVERY_SUB_KINDS: readonly string[] = ["offering", "guideline_edit"];

/**
 * An item the queue offers a one-click decision on. A proposal that must be
 * read on its own (a full guidelines document) stays with the person.
 */
function whyNotDecidable(item: ApprovalItem): string | null {
  if (item.individualReview) return "It must be read and ruled in its own card on the page.";
  if (item.blocked) return item.blocked.reason;
  if (noLiveAction(item)) return "It cannot be decided right now.";
  return null;
}

function KnowledgeWriteTargets({
  items,
  decisions,
}: {
  /** Null while the queue loads. */
  items: ApprovalItem[] | null;
  decisions: ApprovalDecisions;
}) {
  /** Validate against the live queue; returns the row and the cleaned reason. Throws on bad input. */
  const check = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("discovery_proposal_decision takes { item_key, decision, reason? }.");
    }
    const patch = value as Record<string, unknown>;
    for (const key of Object.keys(patch)) {
      if (key !== "item_key" && key !== "decision" && key !== "reason") {
        throw new Error(`discovery_proposal_decision has no field "${key}".`);
      }
    }
    if (typeof patch.item_key !== "string") throw new Error("item_key must be a key from discovery_pending_proposals.");
    if (patch.decision !== "approve" && patch.decision !== "reject") {
      throw new Error('decision must be "approve" or "reject".');
    }
    if (patch.reason !== undefined && patch.reason !== null && typeof patch.reason !== "string") {
      throw new Error("reason must be a string.");
    }
    if (!items) throw new Error("The proposals have not loaded yet — try again in a moment.");
    const item = items.find((entry) => entry.key === patch.item_key);
    if (!item) throw new Error("That proposal is not waiting on this site (it may already be ruled).");
    const blocked = whyNotDecidable(item);
    if (blocked) throw new Error(`That proposal is left to the person: ${blocked}`);
    const reason = typeof patch.reason === "string" && patch.reason.trim() ? patch.reason.trim() : null;
    return { item, decision: patch.decision, reason };
  };
  useSurfaceWriteHandlers(MARKETING_BRAND_KNOWLEDGE_SURFACE_NAME, {
    discovery_proposal_decision: {
      validate: async (value: unknown) => {
        check(value);
      },
      apply: async (value: unknown) => {
        const { item, decision, reason } = check(value);
        const outcome =
          decision === "approve"
            ? await decisions.acceptItems([item], reason)
            : await decisions.rejectItems([item], reason, null);
        const failure = outcome.failures[0] ?? outcome.alreadyDecided?.[0];
        if (failure) throw new Error(failure.message);
      },
    },
  });
  return null;
}

export function KnowledgeRoomSurface({ children }: { children: ReactNode }) {
  const { siteId, getBaseValues } = useMarketingSiteSurfaceBase();
  const { site, brandId } = useMarketingSite();
  // The ladder publishes the rung it is running (component state, not a cache).
  const runningStepRef = useRef<DiscoveryStepKey | null>(null);
  // The approval queue's own reader + writer for these two proposal kinds:
  // same query key as the mounted queue, so one cache, one truth.
  const queueScope = {
    key: siteId,
    siteId,
    brandId: brandId ?? null,
    organizationId: site.organization_id ?? null,
    siteLabel: site.domain ?? site.name ?? site.id,
  };
  const proposals = keywordMeaningKind.useSource(queueScope);
  const decisions = keywordMeaningKind.useDecisions(queueScope);
  const pending = proposals.items.filter(
    (item) => item.subKind !== undefined && DISCOVERY_SUB_KINDS.includes(item.subKind),
  );
  // Same key + fetcher as DiscoveryLadder: one cache entry, one truth.
  const status = useQuery({
    queryKey: ["marketing", "seo", "discovery", siteId],
    queryFn: () => getDiscoveryStatus(siteId),
    staleTime: 15_000,
  });

  const getScope = (): SurfaceScopePayload => {
    const rows = new Map<string, DiscoveryStepStatus>();
    for (const row of status.data?.steps ?? []) rows.set(row.step, row);
    const done = (step: DiscoveryStepKey) => {
      const row = rows.get(step);
      return row?.status === "completed" && row.artifact != null;
    };
    const met = (step: DiscoveryStepKey) =>
      STEP_META[step].requires.every((need) => done(need));
    const artifact = (step: DiscoveryStepKey) =>
      done(step) ? (rows.get(step)?.artifact ?? undefined) : undefined;
    const completed = DISCOVERY_STEP_ORDER.filter(done);
    const next = DISCOVERY_STEP_ORDER.find(
      (step) => !done(step) && (rows.get(step)?.implemented ?? false) && met(step),
    );
    const loaded = status.data != null;
    const ready = !proposals.loading && !proposals.error;
    return createMarketingBrandKnowledgeScope({
      ...getBaseValues(),
      discovery_pending_proposals: ready
        ? pending.map((item) => {
            const why = whyNotDecidable(item);
            return {
              key: item.key,
              kind: item.subKind ?? null,
              headline: item.headline,
              accept_effect: item.acceptEffect,
              reject_effect: item.rejectEffect,
              proposed_by: item.proposedBy ?? null,
              proposed_at: item.proposedAt ?? null,
              agent_can_decide: why === null,
              left_to_person_because: why,
            };
          })
        : undefined,
      discovery_proposal_counts: ready
        ? {
            total: pending.length,
            offering: pending.filter((item) => item.subKind === "offering").length,
            guideline_edit: pending.filter((item) => item.subKind === "guideline_edit").length,
          }
        : undefined,
      discovery_running_step: runningStepRef.current ?? undefined,
      discovery_steps: loaded
        ? DISCOVERY_STEP_ORDER.map((step) => {
            const row = rows.get(step);
            return {
              step,
              title: STEP_META[step].title,
              implemented: row?.implemented ?? false,
              status: done(step) ? "completed" : (row?.status ?? "not_run"),
              run_id: row?.run_id ?? null,
              completed_at: row?.completed_at ?? null,
              prerequisites_met: met(step),
            };
          })
        : undefined,
      discovery_completed_steps: loaded ? completed : undefined,
      discovery_next_step: next,
      discovery_business_model: artifact("business_model"),
      discovery_ideal_customer: artifact("ideal_customer"),
      discovery_money_map: artifact("money_map"),
      discovery_offerings: artifact("offerings"),
      discovery_offering_values: artifact("offering_values"),
      discovery_proposed_setup: artifact("proposed_setup"),
      discovery_guidelines_draft: artifact("guidelines_draft"),
    });
  };

  return (
    <SurfaceRuntimeProvider
      surfaceName={MARKETING_BRAND_KNOWLEDGE_SURFACE_NAME}
      getScope={getScope}
    >
      <KnowledgeWriteTargets items={proposals.loading ? null : pending} decisions={decisions} />
      <RunningStepContext.Provider value={runningStepRef}>{children}</RunningStepContext.Provider>
    </SurfaceRuntimeProvider>
  );
}
