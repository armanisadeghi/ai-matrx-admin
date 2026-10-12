"use client";

/**
 * "How many posts" — the one choice behind every account fetch. 12 · 50 · 100 · 500 · All
 * (All = the organization's `profile_posts_max` setting). The starting value is the feature knob
 * `social.profile_posts_default` (platform 50, then the organization, then the person); picking a
 * number in any dialog saves it as the person's own override of that knob, on the server, so it
 * follows them to every device. Pure helpers first; the store and hook last.
 */

import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { knobInt } from "@/lib/knobs/featureKnobs";
import { sessionKnobPrincipals, resolveSessionKnob, useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { knobRefusalSentence, setKnobOverride } from "@/lib/scoped-config/service";
import { toast } from "@/lib/toast";
import type { SocialCosts } from "./types";

export const POST_COUNT_CHOICES = ["12", "50", "100", "500", "all"] as const;
/** "all", or a whole number as text. The standard list is only the picker's menu; the saved default may be any number. */
export type PostCountChoice = string;
export const POST_COUNT_LABELS: Record<string, string> = { "12": "12", "50": "50", "100": "100", "500": "500", all: "All" };
export const POST_COUNT_KNOB = "social.profile_posts_default";
/** The knob stores All as 0 (meaning: up to the organization's `profile_posts_max`). */
export const ALL_POSTS_KNOB_VALUE = 0;
export const COMMENT_COUNT_CHOICES = [20, 100, 200] as const;
export const LOAD_MORE_STEP = 50;
/** Shown when the count cannot be worked out (the "All" limit could not be read). Nothing is fetched. */
export const COUNT_UNREADABLE_MESSAGE = "Couldn't read your organization's post limit, so nothing was fetched. Pick a number instead of All, or try again.";

/** Load more = the next LOAD_MORE_STEP NEW posts, starting where the last fetch stopped; the quote is exactly those. Pure. */
export function loadMoreRequest(): { maxPosts: number; continueFromLast: true; quoteCount: number } {
  return { maxPosts: LOAD_MORE_STEP, continueFromLast: true, quoteCount: LOAD_MORE_STEP };
}
/** The person's own row for the default count (their settings, "Personal configuration"). */
export const POST_COUNT_PERSON_HREF = "/user-settings/general/personal-config#social.profile_posts_default";
/** Why the count is what it is: a tooltip, never inline text. Pure. */
export function countReason(count: number | null, choice: PostCountChoice | null, profilePostsMax: number | null | undefined): { text: string; limited: boolean } {
  const max = profilePostsMax?.toLocaleString("en-US");
  if (count != null && profilePostsMax != null && count > profilePostsMax) {
    return { text: `Capped at ${max} by your organization`, limited: true };
  }
  if (choice === "all") return { text: max ? `All posts (organization limit ${max})` : "All posts", limited: false };
  return { text: "Your default", limited: false };
}
/** Where an org admin changes the limits; with a setting name it scrolls to that exact row (rows anchor at their full key). */
export const SOCIAL_LIMITS_HREF = (organizationId: string, setting?: string) =>
  `/organizations/${organizationId}/settings/configuration${setting ? `#social.${setting}` : ""}`;

/** The picker's choice for a knob value (0 = All), or null when the value is not a count. Pure. */
export function choiceFromKnob(value: unknown): PostCountChoice | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < 0) return null;
  return n === ALL_POSTS_KNOB_VALUE ? "all" : String(n);
}
/** The knob value a picker choice is saved as. Pure. */
export function knobFromChoice(choice: PostCountChoice): number {
  return choice === "all" ? ALL_POSTS_KNOB_VALUE : Number(choice);
}
/** The picker's menu: the standard list, plus the current value when it is not on it. Pure. */
export function choiceMenu(current: PostCountChoice | null): PostCountChoice[] {
  const base: PostCountChoice[] = [...POST_COUNT_CHOICES];
  if (current && !base.includes(current)) base.push(current);
  return base.sort((a, b) => (a === "all" ? Infinity : Number(a)) - (b === "all" ? Infinity : Number(b)));
}
/** The label for a choice. Pure. */
export function choiceLabel(choice: PostCountChoice): string {
  return POST_COUNT_LABELS[choice] ?? Number(choice).toLocaleString("en-US");
}

/** The number to ask for; null while the choice or the "All" limit is unknown. Pure. */
export function resolveCount(choice: PostCountChoice | null | undefined, profilePostsMax: number | null | undefined): number | null {
  if (!choice) return null;
  if (choice === "all") return profilePostsMax != null && profilePostsMax > 0 ? profilePostsMax : null;
  const n = Number(choice);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** USD for fetching `count` posts on `platform`, or null when the server prices nothing. Pure. */
export function postsUsd(costs: SocialCosts | null | undefined, platform: string | null | undefined, count: number | null): number | null {
  if (count == null || count <= 0) return null;
  const entry = (platform ? costs?.per_post?.[platform] : undefined) ?? null;
  if (!entry || entry.usd_per_page == null || !entry.posts_per_page) return null;
  return Math.ceil(count / entry.posts_per_page) * entry.usd_per_page;
}

/** USD for `count` comments. Pure. */
export function commentsUsd(costs: SocialCosts | null | undefined, count: number): number | null {
  const perPage = costs?.per_comment_page;
  if (perPage == null || count <= 0) return null;
  // The server prices a page of comments; 20 per page is the smallest choice.
  return Math.ceil(count / 20) * perPage;
}

/** "Showing 12 of ~N posts · Load more (≈ X points)" text parts: how many more the profile reports than are stored. Pure. */
export function morePostsAvailable(reportedTotal: number | null | undefined, stored: number): number | null {
  if (reportedTotal == null || !Number.isFinite(reportedTotal) || reportedTotal <= stored) return null;
  return reportedTotal - stored;
}

// --- the person's choice -------------------------------------------------------------------------
// The server holds the truth (the knob's person override). `pending` is only the instant echo of a
// pick that is still being saved, so the picker answers at once; it clears when the saved value
// arrives or the save fails.
const listeners = new Set<() => void>();
let pending: PostCountChoice | null = null;
function setPending(next: PostCountChoice | null) {
  pending = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Saves the pick as the person's own override of the default (server-side). Failure is shown, never swallowed. */
export async function setPostCountChoice(choice: PostCountChoice): Promise<void> {
  const { organizationId, userId } = sessionKnobPrincipals();
  if (!organizationId || !userId) {
    toast.error("Pick an organization first, so your post count can be saved.");
    return;
  }
  setPending(choice);
  try {
    const result = await setKnobOverride({
      feature: "social",
      key: "profile_posts_default",
      scopeKind: "user",
      scopeId: userId,
      organizationId,
      value: knobFromChoice(choice),
    });
    if ((result as { ok?: boolean }).ok === false) {
      setPending(null);
      toast.error(`Your post count was not saved: ${knobRefusalSentence(result as { reason?: string; detail?: string })}`);
    }
  } catch (error) {
    setPending(null);
    toast.error(`Your post count was not saved: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** The person's current choice: their pick, else the resolved default; null until it is known. */
export function usePostCount(): { choice: PostCountChoice | null; setChoice: (c: PostCountChoice) => void } {
  const echo = useSyncExternalStore(subscribe, () => pending, () => null);
  const saved = choiceFromKnob(useSessionKnob(POST_COUNT_KNOB));
  useEffect(() => {
    if (echo !== null && saved === echo) setPending(null);
  }, [echo, saved]);
  return { choice: echo ?? saved, setChoice: (c) => void setPostCountChoice(c) };
}

/** The org's `profile_posts_max`, or null while it loads / when the setting cannot be read. */
export function useProfilePostsMax(): { value: number | null; error: boolean } {
  const q = useQuery({ queryKey: ["marketing", "social", "knob", "profile_posts_max"], queryFn: () => knobInt("social", "profile_posts_max"), staleTime: 60_000, retry: false });
  return { value: q.data ?? null, error: q.isError };
}

/**
 * The count for a call made outside the control (a board tile, a lookup): the person's choice, else the
 * resolved default (platform → organization → person), with "All" resolved from the organization's
 * limit. Throws, visibly, when the count cannot be resolved. Never a built-in number.
 */
export async function rememberedMaxPosts(): Promise<number> {
  const { organizationId } = sessionKnobPrincipals();
  const choice =
    pending ??
    choiceFromKnob(organizationId ? await resolveSessionKnob(POST_COUNT_KNOB) : await knobInt("social", "profile_posts_default"));
  if (choice === null) throw new Error("The default post count is not set.");
  if (choice !== "all") return Number(choice);
  return knobInt("social", "profile_posts_max");
}

/** Same as `rememberedMaxPosts` but a failure to read the limit arrives as a plain sentence (for callers whose errors are shown as written). */
export async function rememberedMaxPostsPlain(): Promise<number> {
  try {
    return await rememberedMaxPosts();
  } catch {
    throw new Error(COUNT_UNREADABLE_MESSAGE);
  }
}
