"use client";

/**
 * "How many posts" — the one choice behind every account fetch. 12 · 50 · 100 · 500 · All
 * (All = the organization's `profile_posts_max` setting). Remembered per person on this device.
 * Pure helpers first; the store and hook last.
 */

import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";

import { knobInt } from "@/lib/knobs/featureKnobs";
import type { SocialCosts } from "./types";

export const POST_COUNT_CHOICES = ["12", "50", "100", "500", "all"] as const;
export type PostCountChoice = (typeof POST_COUNT_CHOICES)[number];
export const POST_COUNT_LABELS: Record<PostCountChoice, string> = { "12": "12", "50": "50", "100": "100", "500": "500", all: "All" };
export const COMMENT_COUNT_CHOICES = [20, 100, 200] as const;
export const LOAD_MORE_STEP = 50;
/** Where an org admin changes the limits; with a setting name it scrolls to that exact row (rows anchor at their full key). */
export const SOCIAL_LIMITS_HREF = (organizationId: string, setting?: string) =>
  `/organizations/${organizationId}/settings/configuration${setting ? `#social.${setting}` : ""}`;

const KEY = "social.postCount.v1";
const DEFAULT_CHOICE: PostCountChoice = "12";

/** The number to ask for; null while "All" cannot be resolved (setting not loaded). Pure. */
export function resolveCount(choice: PostCountChoice, profilePostsMax: number | null | undefined): number | null {
  if (choice === "all") return profilePostsMax != null && profilePostsMax > 0 ? profilePostsMax : null;
  return Number(choice);
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

// --- store ---------------------------------------------------------------------------------------
const listeners = new Set<() => void>();
function read(): PostCountChoice {
  if (typeof window === "undefined") return DEFAULT_CHOICE;
  const raw = window.localStorage.getItem(KEY);
  return (POST_COUNT_CHOICES as readonly string[]).includes(raw ?? "") ? (raw as PostCountChoice) : DEFAULT_CHOICE;
}
export function setPostCountChoice(choice: PostCountChoice): void {
  window.localStorage.setItem(KEY, choice);
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
}

export function usePostCount(): { choice: PostCountChoice; setChoice: (c: PostCountChoice) => void } {
  const choice = useSyncExternalStore(subscribe, read, () => DEFAULT_CHOICE);
  return { choice, setChoice: setPostCountChoice };
}

/** The org's `profile_posts_max`, or null while it loads / when the setting cannot be read. */
export function useProfilePostsMax(): { value: number | null; error: boolean } {
  const q = useQuery({ queryKey: ["marketing", "social", "knob", "profile_posts_max"], queryFn: () => knobInt("social", "profile_posts_max"), staleTime: 60_000, retry: false });
  return { value: q.data ?? null, error: q.isError };
}

/**
 * The count for a call made outside the control (a board tile, a lookup): the remembered choice,
 * with "All" resolved from the setting. Throws, visibly, when "All" cannot be resolved.
 */
export async function rememberedMaxPosts(): Promise<number> {
  const choice = read();
  if (choice !== "all") return Number(choice);
  return knobInt("social", "profile_posts_max");
}
