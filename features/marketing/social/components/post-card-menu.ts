/**
 * A post card's rows in the page's ONE right-click menu (the designed menu's feature section, "Post").
 *
 * The card marks its root `data-record-menu="social-post:<id>"` and registers these rows only when a
 * person right-clicks it or presses its `⋯` (never at mount), so a grid of cards adds no effect, no
 * listener and no fetch per card. The rows are the card's old `⋯` items, same order, same handlers
 * (`postActionRunners` = the functions the post window's buttons and the agent's tools run).
 */

import type { QueryClient } from "@tanstack/react-query";
import { Bookmark, Copy, ExternalLink, FileText, Sparkles, UserRound } from "lucide-react";
import { registerRecordMenu, type ContextMenuExtraItem, type RecordMenuRows } from "@ai-matrx/context-menu/engine";
import { usdToPoints } from "@ai-matrx/kit/format";

import { currentPointsRate } from "@/components/cost/pointsRate";
import { toast } from "@/lib/toast";

import { actionUsd, formatPointsAlways } from "../cost";
import { socialKeys } from "../hooks";
import type { PostCardModel, SocialCosts } from "../types";
import { postActionRunners } from "./usePostActions";
import { isCapturedPostId } from "../gated/capturedPosts";

export const postMenuKey = (postId: string) => `social-post:${postId}`;

export interface PostCardMenuInput {
  post: PostCardModel;
  /** Present inside a brand: Open account and the brand actions. */
  brand: { seg: string; organizationId: string } | null;
  /** The account page; null when the post has no account route. */
  accountHref: string | null;
  canEdit: boolean;
  copyText: (text: string) => Promise<boolean>;
  onSave?: ((post: PostCardModel) => void) | undefined;
  extraActions?: ReadonlyArray<{ id: string; label: string; onSelect: (post: PostCardModel) => void }> | undefined;
  queryClient: QueryClient;
}

/** The points a transcript click uses, read from the costs the page already holds (no fetch at open). */
function transcriptPoints(client: QueryClient, organizationId: string): string | null {
  const costs = client.getQueryData<SocialCosts>(["marketing", "social", "costs", organizationId]);
  if (!costs) return null;
  const rate = currentPointsRate();
  return formatPointsAlways(actionUsd(costs, "transcript", 1), (usd) => usdToPoints(usd, { rate }));
}

export function postCardMenuRows(input: PostCardMenuInput): RecordMenuRows {
  const { post, brand, accountHref, canEdit, copyText, onSave, extraActions, queryClient } = input;
  const items: ContextMenuExtraItem[] = [
    { kind: "link", id: "open-original", label: "Open original", icon: ExternalLink, href: post.url, target: "_blank" },
    {
      kind: "item",
      id: "copy-link",
      label: "Copy link",
      icon: Copy,
      onSelect: () =>
        void copyText(post.url).then((copied) => (copied ? toast.success("Link copied") : toast.error("Couldn't copy the link"))),
    },
    ...(extraActions ?? []).map((a) => ({ kind: "item" as const, id: `x-${a.id}`, label: a.label, onSelect: () => a.onSelect(post) })),
  ];
  // A post only this organization's browser captured is not in the shared cache, so the server's post
  // actions (swipe, transcript, breakdown) have nothing to act on; its account link still opens.
  if (brand && isCapturedPostId(post.postId)) {
    if (accountHref) items.push({ kind: "link", id: "open-account", label: "Open account", icon: UserRound, href: accountHref });
  } else if (brand) {
    const runners = postActionRunners(
      { postId: post.postId, organizationId: brand.organizationId, hasTranscript: false },
      { invalidate: () => queryClient.invalidateQueries({ queryKey: socialKeys.all }) },
    );
    const run = (fn: () => Promise<string>) => () =>
      void fn().then(
        (message) => toast.success(message),
        (err: unknown) => toast.error(err instanceof Error ? err.message : "That didn't work"),
      );
    if (accountHref) items.push({ kind: "link", id: "open-account", label: "Open account", icon: UserRound, href: accountHref });
    if (canEdit) {
      if (!onSave) items.push({ kind: "item", id: "save-swipe", label: "Save to swipe file", icon: Bookmark, onSelect: run(runners.saveToSwipe) });
      const points = transcriptPoints(queryClient, brand.organizationId);
      items.push({ kind: "item", id: "transcript", label: "Get transcript", icon: FileText, ...(points ? { hint: points } : {}), onSelect: run(runners.transcript) });
      items.push({ kind: "item", id: "breakdown", label: "Run breakdown", icon: Sparkles, hint: "AI points", onSelect: run(runners.breakdown) });
    }
  }
  if (onSave && canEdit) items.push({ kind: "item", id: "save-swipe", label: "Save to swipe file", icon: Bookmark, onSelect: () => onSave(post) });
  return {
    heading: { label: "Post", text: post.hookLine || post.handle || "Post" },
    extraSections: [{ id: "social-post", label: "Post", primary: true, anchor: "after-clipboard", items }],
  };
}

/** Register the card's rows for the menu that is about to open (right-click capture or `⋯`). */
export function registerPostCardMenu(input: PostCardMenuInput): void {
  const rows = postCardMenuRows(input);
  registerRecordMenu(postMenuKey(input.post.postId), () => rows);
}
