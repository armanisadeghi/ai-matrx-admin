"use client";

/**
 * KindComponentFixBadge — the in-render ownership affordance for DB kind
 * components. When the person viewing a rendered kind instance is the
 * component's creator (kind_component.created_by) or a super admin, a small
 * floating badge appears at the block's top-right corner. One click opens the
 * kind-creator agent in the shared floating run window (agentRunWindow),
 * pre-seeded with the kind slug and the exact instance content the user was
 * looking at — the agent fetches the component row itself via its kind_* tools.
 *
 * Renders nothing for everyone else, for compiled/bundled resolutions, and
 * when the creator agent is unconfigured (the click still screams in that
 * case rather than silently no-opping — same posture as KindAgentButton).
 *
 * Mounted by the DbKindComponent SHELL (not the lazy Impl) so it stays in the
 * always-client, Redux-provided layer and adds nothing to the Babel chunk.
 * It re-derives the kind from the envelope and re-resolves the registry row —
 * both synchronous, both already in the main bundle.
 */

import React from "react";
import { PencilRuler } from "lucide-react";

import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsSuperAdmin,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";
import { useOpenAgentRunWindow } from "@/features/overlays/openers/agentRunWindow";
import { KIND_CREATOR_MANDATE_KEY } from "../../studio/constants";
import { resolveMandate } from "@ai-matrx/chat/mandates/service";
import { composeKindComponentFixIntent } from "../../studio/kind-agent-intents";
import { buildKindAuthoringOffer } from "@/features/content-ir/studio/kind-authoring-offer";
import { readEnvelope } from "@ai-matrx/rich-content/kinds/redux/render-block-envelope";
import { resolveComponent } from "../../registry/component-registry";
import type { ComponentLayerScope } from "@ai-matrx/content-ir-react";

function readKindSlug(
  content: string,
  metadata: Record<string, unknown> | undefined,
): string | null {
  const envelope = readEnvelope(metadata);
  if (envelope?.root.kind) return envelope.root.kind;
  try {
    const parsed = JSON.parse(content) as unknown;
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      typeof (parsed as Record<string, unknown>).__kind === "string"
    ) {
      return (parsed as Record<string, unknown>).__kind as string;
    }
  } catch {
    // No kind derivable — the Impl screams about this case; the badge just hides.
  }
  return null;
}

export interface KindComponentFixBadgeProps {
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Does this viewer get the badge for this instance?
 *
 * Exported because the DbKindComponent shell must RESERVE the badge's corner
 * in-flow. The badge is absolutely positioned at the padding box's top-right
 * and sits at the popover layer, so any corner it is not given outright it
 * TAKES: measured on `agent_mandate_specification`, a 24px badge over an 8px
 * gutter covered 16px of the component's own header — landing on a live stat
 * and winning every click in that square. Reserving the band is the only fix
 * that holds for arbitrary DB-authored components, since the shell cannot know
 * what any of them draw in their top-right.
 *
 * Both call sites read this one predicate so the reserved gutter can never
 * disagree with whether the badge actually renders.
 */
export function useCanFixKindComponent(
  content: string,
  metadata?: Record<string, unknown>,
): { canFix: boolean; kind: string | null; layer: FixBadgeLayer | null } {
  const userId = useAppSelector(selectUserId);
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

  const kind = readKindSlug(content, metadata);
  if (!kind || !userId) return { canFix: false, kind, layer: null };

  const resolution = resolveComponent(kind, "web", "output");
  if (!resolution || resolution.resolvedBy !== "db") {
    return { canFix: false, kind, layer: null };
  }

  return decideFixBadge({
    kind,
    userId,
    isSuperAdminInLane: isSuperAdmin,
    createdBy: resolution.createdBy,
    layer: resolution.layer ?? null,
  });
}

/** Which layered row the badge edits — the viewer's own view, never the shared one. */
export interface FixBadgeLayer {
  scope: ComponentLayerScope;
  rowId: string;
}

/**
 * THE BADGE'S RIGHTS, pure (shape-layers slice 4 review finding). On a LAYERED
 * winner the badge edits THAT layer — never the shared kind component — and
 * only for its audience: a user row is the viewer's own (the resolver drops
 * anyone else's), an organization row for its author. Admin power never
 * applies to a layer: a super admin on a user page edits only their own.
 */
export function decideFixBadge(input: {
  kind: string;
  userId: string;
  isSuperAdminInLane: boolean;
  createdBy: string | null;
  layer: { scope: ComponentLayerScope; rowId: string } | null;
}): { canFix: boolean; kind: string; layer: FixBadgeLayer | null } {
  if (input.layer) {
    const own = input.layer.scope === "user" || input.createdBy === input.userId;
    return {
      canFix: own,
      kind: input.kind,
      layer: own ? { scope: input.layer.scope, rowId: input.layer.rowId } : null,
    };
  }
  return {
    canFix: input.isSuperAdminInLane || input.createdBy === input.userId,
    kind: input.kind,
    layer: null,
  };
}

export const KindComponentFixBadge: React.FC<KindComponentFixBadgeProps> = ({
  content,
  metadata,
}) => {
  const openRun = useOpenAgentRunWindow();
  const { canFix, kind, layer } = useCanFixKindComponent(content, metadata);
  if (!canFix || !kind) return null;

  const launch = () => {
    // Resolve the `content_ir.kind_creator` mandate at click time — same loud
    // posture as KindAgentButton; never a silent no-op.
    void (async () => {
      const resolved = await resolveMandate(KIND_CREATOR_MANDATE_KEY);
      if (layer) {
        // MY view: the builder edits this layered row (target mine/organization
        // + its component_id), never the shared kind component.
        const [{ ensureOrgId }, layerFixit] = await Promise.all([
          import("@/lib/organizations/ensureOrgId"),
          import("../fixit/layer-fixit"),
        ]);
        const activeOrg = await ensureOrgId(null);
        const audience = await layerFixit.readLayerAudience(layer.rowId);
        const seed = layerFixit.composeLayerSeed({
          kind,
          target: audience.target,
          organizationId: audience.organizationId ?? activeOrg,
          registered: true,
          layerRowId: layer.rowId,
          instance: content,
        });
        openRun({
          initialAgentId: resolved.agentId,
          initialDraftText: seed.draftText,
          initialVariableValues: {
            ...buildKindAuthoringOffer({ kindSlug: kind, authoringPart: "component" }),
            ...seed.variables,
          },
        });
        return;
      }
      const seed = composeKindComponentFixIntent({
        kind,
        instanceContent: content,
      });
      openRun({
        initialAgentId: resolved.agentId,
        initialDraftText: seed.draftText,
        initialVariableValues: {
          // `content_ir.kind_authoring` mapped-only offers (agent door; the
          // live Holder declares none of these names).
          ...buildKindAuthoringOffer({ kindSlug: kind, authoringPart: "component" }),
          ...seed.variables,
        },
      });
    })().catch((error: unknown) => {
      console.error(
        `[KindComponentFixBadge] mandate "${KIND_CREATOR_MANDATE_KEY}" failed to resolve:`,
        error,
      );
      toast.error("The Shape creator agent is unavailable", {
        description: error instanceof Error ? error.message : String(error),
      });
    });
  };

  return (
    <button
      type="button"
      onClick={launch}
      title={
        layer
          ? layer.scope === "user"
            ? `My view of ${kind} — edit it`
            : `My organization's view of ${kind} — edit it`
          : `You can edit this component (${kind}) — open the fix agent`
      }
      aria-label={layer ? "Edit my view" : "Fix this component"}
      className="absolute right-0 top-0 z-[var(--z-popover)] flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary text-primary-foreground shadow-md opacity-70 transition-opacity hover:opacity-100 focus-visible:opacity-100"
    >
      <PencilRuler className="h-3.5 w-3.5" />
    </button>
  );
};
