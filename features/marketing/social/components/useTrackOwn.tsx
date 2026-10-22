"use client";

/**
 * Track the brand's own properties as role Own: one account, or every untracked one.
 * ONE flow for the Accounts tab and the KPI empty state (an empty account asks before it is
 * tracked anyway; a cost worth a warning is named first, in points — cost.ts).
 */

import { useState } from "react";

import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { toast } from "@/lib/toast";

import { useInvalidateSocial } from "../hooks";
import { accountName, refreshSummary } from "../mappers";
import { useSocialSpend } from "../cost";
import { refreshProfile, socialErrorCode, socialErrorMessage, trackAccount } from "../server";
import { fetchOutcomeText } from "./FetchLines";
import { platformLabel } from "./PlatformMark";
import { isSocialPlatform, type AccountRow } from "../types";
import { COUNT_UNREADABLE_MESSAGE, rememberedMaxPosts } from "../post-count";

export { trackableOwn } from "../own-accounts";

export function useTrackOwn(organizationId: string, brandId: string) {
  const invalidate = useInvalidateSocial();
  const [busyRow, setBusyRow] = useState<string | null>(null);
  /** The server's live step line for the row being tracked ("Fetching posts · 2 of 3"). */
  const [progress, setProgress] = useState<string | null>(null);
  const { costNode, confirmSpend, confirmPosts, postsNode } = useSocialSpend(organizationId);

  /** Track one own property as role Own; an empty account asks before tracking it anyway. */
  async function trackOwnRow(row: AccountRow, allowEmpty = false): Promise<"ok" | "failed"> {
    if (!row.profileUrl && !row.handle) return "failed";
    let maxPosts: number;
    try {
      maxPosts = await rememberedMaxPosts();
    } catch {
      toast.error(`${accountName(row)}: ${COUNT_UNREADABLE_MESSAGE}`);
      return "failed";
    }
    try {
      await trackAccount(
        {
          handleOrUrl: row.profileUrl ?? row.handle,
          platform: isSocialPlatform(row.platform) ? row.platform : undefined,
          role: "own",
          brandId,
          propertyId: row.propertyId ?? undefined,
          maxPosts,
          allowEmpty,
        },
        {
          organizationId,
          onProgress: (p) => setProgress(p.step && p.total ? `${p.message} · ${p.step} of ${p.total}` : p.message),
        },
      );
      return "ok";
    } catch (err) {
      if (!allowEmpty && socialErrorCode(err) === "social_profile_empty") {
        const again = await confirm({
          title: `Track ${accountName(row)} anyway?`,
          description: socialErrorMessage(err, "This account has no posts."),
          confirmLabel: "Track anyway",
        });
        if (again) return trackOwnRow(row, true);
        return "failed";
      }
      toast.error(`${accountName(row)}: ${socialErrorMessage(err, "Couldn't track it")}`);
      return "failed";
    }
  }

  async function trackOwn(row: AccountRow) {
    // The row shows "Tracking…" the instant it is clicked, before the cost check and its confirmation.
    setBusyRow(row.rowId);
    setProgress("Starting…");
    try {
      const ok = await confirmSpend("track", 1, { title: `Track ${platformLabel(row.platform)} ${accountName(row)} as Own?`, confirmLabel: "Track" });
      if (!ok) return;
      if ((await trackOwnRow(row)) === "ok") {
        await invalidate();
        toast.success(`Tracking ${accountName(row)}`);
      }
    } finally {
      setBusyRow(null);
      setProgress(null);
    }
  }

  async function trackAllOwn(list: AccountRow[]) {
    const ok = await confirm({
      title: `Track ${list.length} own account${list.length === 1 ? "" : "s"}?`,
      description: (
        <>
          {list.map((r) => accountName(r) === "YouTube channel" ? "YouTube channel" : `${platformLabel(r.platform)} ${accountName(r)}`).join(", ")}{" "}
          {costNode("track", list.length, true)}
        </>
      ),
      confirmLabel: "Track all",
    });
    if (!ok) return;
    setBusyRow("bulk");
    let done = 0;
    try {
      for (const row of list) {
        if ((await trackOwnRow(row)) === "ok") done += 1;
      }
    } finally {
      await invalidate();
      setBusyRow(null);
      setProgress(null);
    }
    toast.success(`Tracked ${done} of ${list.length}`);
  }

  /** Fetch a tracked account's newest posts (the cost is named first when it is worth a warning). */
  async function refreshOwn(row: AccountRow) {
    if (!row.profileId) return;
    let maxPosts: number;
    try {
      maxPosts = await rememberedMaxPosts();
    } catch {
      toast.error(`${accountName(row)}: ${COUNT_UNREADABLE_MESSAGE}`);
      return;
    }
    const ok = await confirmPosts(row.platform, maxPosts, { title: `Fetch new posts for ${accountName(row)}?`, confirmLabel: "Fetch" });
    if (!ok) return;
    setBusyRow(row.rowId);
    setProgress("Fetching posts…");
    try {
      const result = await refreshProfile(row.profileId, { maxPosts, continueFromLast: row.postsTracked > 0 }, { organizationId });
      await invalidate();
      toast.success(fetchOutcomeText(refreshSummary(result), result));
    } catch (err) {
      toast.error(`${accountName(row)}: ${socialErrorMessage(err, "The posts could not be fetched.")}`);
    } finally {
      setBusyRow(null);
      setProgress(null);
    }
  }

  /** Fetch new posts for every tracked account in `list`: one confirm naming the total, then one account at a time. */
  async function refreshAllOwn(list: AccountRow[]) {
    const rows = list.filter((r) => r.profileId);
    if (!rows.length) return;
    let maxPosts: number;
    try {
      maxPosts = await rememberedMaxPosts();
    } catch {
      toast.error(COUNT_UNREADABLE_MESSAGE);
      return;
    }
    const total = postsNode(rows.map((r) => r.platform), maxPosts);
    const ok = await confirm({
      title: `Fetch new posts for ${rows.length} account${rows.length === 1 ? "" : "s"}?`,
      description: (
        <>
          {`Up to ${maxPosts} posts each`} {total}
        </>
      ),
      confirmLabel: "Refresh all",
    });
    if (!ok) return;
    setBusyRow("bulk-refresh");
    let done = 0;
    try {
      for (const row of rows) {
        setProgress(`Fetching ${accountName(row)} · ${done + 1} of ${rows.length}`);
        try {
          await refreshProfile(row.profileId as string, { maxPosts, continueFromLast: row.postsTracked > 0 }, { organizationId });
          done += 1;
        } catch (err) {
          toast.error(`${accountName(row)}: ${socialErrorMessage(err, "The posts could not be fetched.")}`);
        }
      }
    } finally {
      await invalidate();
      setBusyRow(null);
      setProgress(null);
    }
    toast.success(`Refreshed ${done} of ${rows.length}`);
  }

  return { busyRow, setBusyRow, progress, trackOwn, trackOwnRow, trackAllOwn, refreshOwn, refreshAllOwn, confirmSpend };
}
