"use client";

/**
 * THE one place social screens get cost words. Arman, 2026-10-09: a provider's charge is "our
 * business, not the user's" — it is a hard cost, charged in points exactly like AI tokens
 * (billing/points_per_usd points per $1 of hard cost, rounded up per call). So:
 *
 *   - the server says what each action costs us (`GET /social/costs`, USD from the same price knob
 *     the ledger charges with); this hook turns it into points through `useCostDisplay` (the one
 *     cost formatter: points for everyone, dollars only for a system admin who flipped the switch);
 *   - like every AI action, a cost is shown — and confirmed — only when it is worth a warning
 *     (`shouldWarnAboutCost`, ~$5 and up). A trivial cost shows nothing and asks nothing;
 *   - never a vendor name, never "credits".
 *
 * Screens call `useSocialSpend(organizationId)`:
 *   `await confirmSpend("profile_page", pages, { title, confirmLabel })` -> true when trivial,
 *   otherwise the shared confirm dialog naming the points.
 */

import { createElement, Fragment, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CostDoor } from "@/components/cost/CostDoor";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { shouldWarnAboutCost } from "@/components/cost/costTier";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { getCosts } from "./server";
import { postsUsd } from "./post-count";
import type { SocialCosts, SocialSpendAction } from "./types";

export type { SocialSpendAction } from "./types";

/** USD for `count` x `action`, or null when the server prices nothing for it. Pure. */
export function actionUsd(
  costs: SocialCosts | null | undefined,
  action: SocialSpendAction,
  count = 1,
): number | null {
  const unit = costs?.operations?.[action];
  if (unit == null || !Number.isFinite(unit) || count <= 0) return null;
  return unit * count;
}

/** The words for a cost, or null when it is trivial (below the warn tier) or unknown. Pure. */
export function formatPointsCost(
  usd: number | null,
  display: { format: (usd: number) => string; toPoints: (usd: number) => number | null },
): string | null {
  if (usd == null) return null;
  const points = display.toPoints(usd);
  if (points == null || !shouldWarnAboutCost(points)) return null;
  return `≈ ${display.format(usd)}`;
}

/**
 * The words an AGENT's proposal shows on its approval card: always the points, however small
 * (a person's own click keeps the warn-tier rule above). Null only when the server prices nothing.
 */
export function formatPointsAlways(usd: number | null, toPoints: (usd: number) => number | null): string | null {
  if (usd == null) return null;
  const points = toPoints(usd);
  if (points == null) return null;
  return `≈ ${Math.max(1, Math.ceil(points)).toLocaleString("en-US")} points`;
}

/** A confirm body: the caller's sentence, then the price behind the quiet Cost door (never printed). */
function costDescription(description: string | undefined, usd: number | null): ReactNode {
  return createElement(
    Fragment,
    null,
    description ? `${description} ` : null,
    createElement(CostDoor, { usd, prefix: "about " }),
  );
}

export function useSocialSpend(organizationId: string | null | undefined) {
  const { format, toPoints } = useCostDisplay();
  const costs = useQuery({
    queryKey: ["marketing", "social", "costs", organizationId],
    queryFn: ({ signal }) => getCosts({ organizationId: organizationId ?? "", signal }),
    enabled: Boolean(organizationId),
    staleTime: 60 * 60 * 1000,
  });
  const display = {
    format: (usd: number) => format(usd),
    toPoints: (usd: number) => toPoints(usd),
  };

  /** For an agent's approval card: the points, even when small; "points (price not loaded)" when unknown. */
  function agentCostText(action: SocialSpendAction, count = 1): string | null {
    if (count <= 0) return null;
    return formatPointsAlways(actionUsd(costs.data, action, count), display.toPoints) ?? "points (price not loaded yet)";
  }

  async function confirmSpend(
    action: SocialSpendAction,
    count: number,
    dialog: { title: string; confirmLabel: string; description?: string },
  ): Promise<boolean> {
    const words = formatPointsCost(actionUsd(costs.data, action, count), display);
    if (!words) return true;
    return confirm({
      title: dialog.title,
      description: costDescription(dialog.description, actionUsd(costs.data, action, count)),
      confirmLabel: dialog.confirmLabel,
    });
  }

  /** The price of a spend as a quiet Cost door for a confirm body (null when unpriced). `always` skips the warn-tier rule. */
  function costNode(action: SocialSpendAction, count = 1, always = false): ReactNode {
    const usd = actionUsd(costs.data, action, count);
    if (usd == null) return null;
    if (!always && formatPointsCost(usd, display) == null) return null;
    return createElement(CostDoor, { usd, prefix: "about " });
  }

  /** The price of one fetch of `count` posts from EACH platform, as a Cost door (null when any is unpriced). */
  function postsNode(platforms: string[], count: number): ReactNode {
    const each = platforms.map((p) => postsUsd(costs.data, p, count));
    if (!each.length || each.some((u) => u == null)) return null;
    return createElement(CostDoor, { usd: each.reduce<number>((sum, u) => sum + (u ?? 0), 0), prefix: "about " });
  }

  /** The points one fetch of `count` posts from EACH platform uses, as one total, for a pre-commit preview; null when any is unpriced. */
  function postsTotalText(platforms: string[], count: number): string | null {
    const each = platforms.map((p) => postsUsd(costs.data, p, count));
    if (!each.length || each.some((u) => u == null)) return null;
    return formatPointsAlways(each.reduce<number>((sum, u) => sum + (u ?? 0), 0), display.toPoints);
  }

  /** Confirm a fetch of `count` posts of `platform` (a warning-tier cost only; trivial costs ask nothing). */
  async function confirmPosts(
    platform: string,
    count: number,
    dialog: { title: string; confirmLabel: string },
  ): Promise<boolean> {
    const words = formatPointsCost(postsUsd(costs.data, platform, count), display);
    if (!words) return true;
    return confirm({ title: dialog.title, description: costDescription(undefined, postsUsd(costs.data, platform, count)), confirmLabel: dialog.confirmLabel });
  }

  return { costNode, postsNode, agentCostText, confirmSpend, confirmPosts, postsTotalText };
}

// ---------------------------------------------------------------------------
// Outside render (an awaited seam such as postSpend.ts): same rule, read at the moment it runs.
// ---------------------------------------------------------------------------

let costsOnce: Promise<SocialCosts | null> | null = null;

async function costsNow(): Promise<SocialCosts | null> {
  if (!costsOnce) {
    costsOnce = (async () => {
      const { ensureOrgId } = await import("@/lib/organizations/ensureOrgId");
      const organizationId = await ensureOrgId(null);
      return getCosts({ organizationId });
    })().catch(() => {
      costsOnce = null; // unknown stays unknown; the next call asks again
      return null;
    });
  }
  return costsOnce;
}

/** `confirmSpend` for code outside render: true when trivial or unknown, else the confirm dialog. */
export async function confirmSocialSpendNow(
  action: SocialSpendAction,
  count: number,
  dialog: { title: string; confirmLabel: string; description?: string },
): Promise<boolean> {
  const { usdToPoints } = await import("@ai-matrx/kit/format");
  const { formatViewerCost: formatCost } = await import("@/components/cost/formatAdminCost");
  const { currentPointsRate } = await import("@/components/cost/pointsRate");
  const { currentCostUnit } = await import("@/components/cost/costUnit");
  const rate = currentPointsRate();
  const unit = currentCostUnit();
  const usd = actionUsd(await costsNow(), action, count);
  const words = formatPointsCost(usd, {
    format: (usd) => formatCost(usd, { unit, rate }),
    toPoints: (usd) => usdToPoints(usd, { rate }),
  });
  if (!words) return true;
  return confirm({
    title: dialog.title,
    description: costDescription(dialog.description, usd),
    confirmLabel: dialog.confirmLabel,
  });
}
