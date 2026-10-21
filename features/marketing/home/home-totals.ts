"use client";

/**
 * The Marketing home's headline numbers, summed across every brand the
 * person can see (Arman, 2026-10-21: "the marketing page should provide some
 * of the most important kpis, a glimse of brands and then access to all of the
 * things that are part of marketing").
 *
 * Each number is its own read so one failure shows "—" on its own tile and
 * never zeroes the others.
 */

import { useQuery } from "@tanstack/react-query";
import { readAllRows } from "@ai-matrx/data/db";

import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { marketingKeys } from "@/features/marketing/data/hooks";
import { readBrandSocialCounts } from "@/features/marketing/social/service";

const STALE_MS = 60_000;

async function countActiveBrands(signal: AbortSignal): Promise<number> {
  const response = await (
    await authenticatedWebDb(supabase)
  )
    .from("brand")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .abortSignal(signal);
  if (response.error) throw new Error(response.error.message);
  return response.count ?? 0;
}

/** Websites on brands that are not archived (matches the Brands tile). */
async function countActiveBrandSites(signal: AbortSignal): Promise<number> {
  const response = await (await authenticatedWebDb(supabase))
    .from("site")
    .select("id, brand!inner(id)", { count: "exact", head: true })
    .is("deleted_at", null)
    .is("brand.deleted_at", null)
    .abortSignal(signal);
  if (response.error) throw new Error(response.error.message);
  return response.count ?? 0;
}

async function countPendingReview(signal: AbortSignal): Promise<number> {
  const response = await (
    await authenticatedWebDb(supabase)
  )
    .from("discovered_item")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .is("deleted_at", null)
    .abortSignal(signal);
  if (response.error) throw new Error(response.error.message);
  return response.count ?? 0;
}

/** Social accounts across every active brand: every account, and how many are tracked. */
async function sumSocialAccounts(
  signal: AbortSignal,
): Promise<{ accounts: number; tracked: number }> {
  const db = await authenticatedWebDb(supabase);
  const brands = await readAllRows<{ id: string }>(
    ({ from, to }) =>
      db
        .from("brand")
        .select("id", { count: "exact" })
        .is("deleted_at", null)
        .order("id", { ascending: true })
        .range(from, to)
        .abortSignal(signal),
    { label: "web.brand ids for the Marketing home" },
  );
  const counts = await readBrandSocialCounts(
    brands.map((brand) => brand.id),
    signal,
  );
  let accounts = 0;
  let tracked = 0;
  for (const row of counts.values()) {
    accounts += row.accounts;
    tracked += row.tracked;
  }
  return { accounts, tracked };
}

const homeKey = (part: string) =>
  [...marketingKeys.root, "home", part] as const;

export function useMarketingHomeBrandCount() {
  return useQuery({
    queryKey: homeKey("brands"),
    queryFn: ({ signal }) => countActiveBrands(signal),
    staleTime: STALE_MS,
  });
}

export function useMarketingHomeSiteCount() {
  return useQuery({
    queryKey: homeKey("sites"),
    queryFn: ({ signal }) => countActiveBrandSites(signal),
    staleTime: STALE_MS,
  });
}

export function useMarketingHomePendingReview() {
  return useQuery({
    queryKey: homeKey("pending-review"),
    queryFn: ({ signal }) => countPendingReview(signal),
    staleTime: STALE_MS,
  });
}

export function useMarketingHomeSocial() {
  return useQuery({
    queryKey: homeKey("social"),
    queryFn: ({ signal }) => sumSocialAccounts(signal),
    staleTime: STALE_MS,
  });
}
