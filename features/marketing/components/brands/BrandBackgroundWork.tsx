"use client";

/**
 * Background work — what the platform has fetched for this brand and what is still to fetch, on the
 * brand home: the Smart Add setup run, every site's crawl, and every confirmed account's posts.
 * Every job is an existing primitive (workflow run, web.crawl_session, the social track door);
 * nothing here schedules work — a fetch starts only on Create or on a click here.
 *
 * Controlled: a site already crawling is never started again; an account's posts come through the
 * canonical social door (`trackAccount` / `refreshProfile`), which reuses the stored profile, dedupes
 * posts and the tracked row, meters the spend, and honours `social.profile_posts_default` / `max`.
 * Plan: common-docs smart-add-brand/BRAND-PAGES-PLAN.md (G2, G3).
 */

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { useAppDispatch } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { lookupSystemRun } from "@/features/education/kits/systemRuns";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { initializeSite } from "@/features/marketing/crawler/direct-client";
import { countSitePages, listBrandProperties, listBrandSites } from "@/features/marketing/data/service";
import { refreshProfile, socialErrorMessage, trackAccount } from "@/features/marketing/social/server";
import { rememberedMaxPostsPlain } from "@/features/marketing/social/post-count";
import { useSocialSpend } from "@/features/marketing/social/cost";
import type { SocialPlatform } from "@/features/marketing/social/types";
import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { PropertyKindMark } from "@/features/marketing/components/shared/PropertyKindMark";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import type { MarketingBrand } from "@/features/marketing/types";
import { accountKey, loadPostHistoryNotes } from "./postHistoryOutcomes";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

const ACTIVE = new Set(["queued", "running"]);

interface SiteJob {
  id: string;
  name: string;
  pages: number;
  crawl: { status: string; finishedAt: string | null; startedAt: string | null; error: string | null } | null;
}

interface AccountJob {
  propertyId: string;
  kind: string;
  label: string;
  handleOrUrl: string;
  trackedId: string | null;
  profileId: string | null;
  posts: number;
  lastPostAt: string | null;
}

const WHEN_ABSOLUTE_AFTER_MS = 48 * 60 * 60 * 1000;

function when(iso: string | null): string {
  return formatRelativeTime(iso, { style: "short", minUnit: "minute", absoluteAfter: WHEN_ABSOLUTE_AFTER_MS, absolute: "date", fallback: "" });
}

async function loadSites(brandId: string): Promise<SiteJob[]> {
  const sites = await listBrandSites(brandId);
  if (!sites.length) return [];
  const pages = await countSitePages(sites.map((s) => s.id));
  const db = await authenticatedWebDb(supabase);
  const { data, error } = await db
    .from("crawl_session")
    .select("site_id, status, started_at, finished_at, error, created_at")
    .in("site_id", sites.map((s) => s.id))
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return sites.map((s) => {
    const latest = (data ?? []).find((c) => c.site_id === s.id);
    return {
      id: s.id,
      name: s.domain ?? s.name,
      pages: pages[s.id] ?? 0,
      crawl: latest
        ? { status: latest.status, startedAt: latest.started_at, finishedAt: latest.finished_at, error: latest.error }
        : null,
    };
  });
}

export async function loadAccounts(brandId: string): Promise<AccountJob[]> {
  const properties = (await listBrandProperties(brandId)).filter((p) => p.kind !== "website" && (p.url || p.handle));
  if (!properties.length) return [];
  const tracked = await supabase
    .schema("social")
    .from("tracked_account")
    .select("id, profile_id, property_id")
    .eq("brand_id", brandId)
    .eq("role", "own")
    .is("deleted_at", null)
    .limit(200);
  if (tracked.error) throw new Error(tracked.error.message);
  const byProperty = new Map((tracked.data ?? []).filter((t) => t.property_id).map((t) => [t.property_id as string, t]));
  return Promise.all(
    properties.map(async (p) => {
      const t = byProperty.get(p.id) ?? null;
      let posts = 0;
      let lastPostAt: string | null = null;
      if (t?.profile_id) {
        const count = await supabase
          .schema("social")
          .from("post")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", t.profile_id)
          .is("deleted_at", null);
        posts = count.count ?? 0;
        const last = await supabase
          .schema("social")
          .from("post")
          .select("created_at")
          .eq("profile_id", t.profile_id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1);
        lastPostAt = last.data?.[0]?.created_at ?? null;
      }
      return {
        propertyId: p.id,
        kind: p.kind,
        label: p.handle ? `@${p.handle.replace(/^@/, "")}` : (p.url ?? p.kind),
        handleOrUrl: p.url ?? p.handle ?? "",
        trackedId: t?.id ?? null,
        profileId: t?.profile_id ?? null,
        posts,
        lastPostAt,
      };
    }),
  );
}

function StatusIcon({ state }: { state: "running" | "done" | "failed" | "todo" }) {
  if (state === "running") return <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />;
  if (state === "done") return <CheckCircle2 className="size-3.5 shrink-0 text-success" />;
  if (state === "failed") return <AlertTriangle className="size-3.5 shrink-0 text-destructive" />;
  return <span className="size-3.5 shrink-0 rounded-full border border-dashed border-muted-foreground" />;
}

export function BrandBackgroundWork({ brand, canEdit }: { brand: MarketingBrand; canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const seg = marketingSeg(brand);
  const spend = useSocialSpend(brand.organization_id);
  const knob = Number(useSessionKnob("social.profile_posts_default"));
  const defaultPosts = Number.isFinite(knob) && knob > 0 ? knob : null;
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setup = useQuery({
    queryKey: ["marketing", "smart-add-setup", brand.id],
    queryFn: () => lookupSystemRun(dispatch, "smart_add_brand_setup", `brand:${brand.id}`, brand.organization_id, "Setup status could not be read."),
    staleTime: 10_000,
    refetchInterval: (q) => (q.state.data?.active ? 15_000 : false),
  });
  const sites = useQuery({
    queryKey: ["marketing", "brand-work-sites", brand.id],
    queryFn: () => loadSites(brand.id),
    refetchInterval: (q) => ((q.state.data ?? []).some((s) => s.crawl && ACTIVE.has(s.crawl.status)) ? 10_000 : false),
  });
  const accounts = useQuery({ queryKey: ["marketing", "brand-work-accounts", brand.id], queryFn: () => loadAccounts(brand.id) });
  // What the server's post-history step said per account (setup + ingest runs): a refused walk shows here.
  const historyNotes = useQuery({
    queryKey: ["marketing", "brand-work-history", brand.id, (accounts.data ?? []).map((a) => a.propertyId).join(",")],
    queryFn: () =>
      loadPostHistoryNotes([
        `brand:${brand.id}`,
        `ingest:${brand.id}`,
        ...(accounts.data ?? []).map((a) => `ingest:${a.propertyId}`),
      ]),
    enabled: accounts.isSuccess,
    staleTime: 30_000,
  });

  const mark = (key: string, on: boolean) => setBusy((b) => ({ ...b, [key]: on }));

  const crawl = async (site: SiteJob) => {
    const key = `site:${site.id}`;
    mark(key, true);
    setErrors((e) => ({ ...e, [key]: "" }));
    // The crawl streams; the session row is the durable state, so refresh as soon as it exists.
    const started = initializeSite(site.id);
    setTimeout(() => void queryClient.invalidateQueries({ queryKey: ["marketing", "brand-work-sites", brand.id] }), 2500);
    try {
      await started;
    } catch (error) {
      setErrors((e) => ({ ...e, [key]: extractErrorMessage(error) }));
    } finally {
      mark(key, false);
      await queryClient.invalidateQueries({ queryKey: ["marketing", "brand-work-sites", brand.id] });
    }
  };

  const fetchPosts = async (account: AccountJob) => {
    const key = `acct:${account.propertyId}`;
    mark(key, true);
    setErrors((e) => ({ ...e, [key]: "" }));
    try {
      const maxPosts = await rememberedMaxPostsPlain();
      const opts = { organizationId: brand.organization_id };
      if (account.profileId) {
        // Only posts newer than what we hold — or, holding none, from the newest (a saved place may be stale).
        await refreshProfile(account.profileId, { maxPosts, continueFromLast: account.posts > 0 }, opts);
      } else {
        await trackAccount(
          {
            handleOrUrl: account.handleOrUrl,
            platform: account.kind as SocialPlatform,
            role: "own",
            brandId: brand.id,
            propertyId: account.propertyId,
            maxPosts,
            allowEmpty: true,
          },
          opts,
        );
      }
      toast.success(`Posts fetched for ${account.label}`);
    } catch (error) {
      setErrors((e) => ({ ...e, [key]: socialErrorMessage(error, "The posts could not be fetched.") }));
    } finally {
      mark(key, false);
      await queryClient.invalidateQueries({ queryKey: ["marketing", "brand-work-accounts", brand.id] });
    }
  };

  const missing = (accounts.data ?? []).filter((a) => !a.trackedId);
  const fetchMissing = async () => {
    for (const account of missing) await fetchPosts(account);
  };

  const run = setup.data;
  const runState = !run ? null : run.active ? (run.status === "interrupted" ? "todo" : "running") : run.status === "completed" ? "done" : "failed";

  return (
    <SectionCard
      title="Background work"
      anchor="background-work"
      headerExtra={
        canEdit && missing.length > 1 ? (
          <Button variant="outline" onClick={() => void fetchMissing()}>
            Fetch all posts
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-3 md:grid-cols-2" data-testid="brand-background-work">
        {run ? (
          <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm md:col-span-2">
            <StatusIcon state={runState ?? "todo"} />
            <span className="font-medium">Brand setup</span>
            <span className="text-muted-foreground">
              {run.status === "interrupted" ? "Waiting for you" : run.status === "completed" ? "Done" : run.active ? "Working" : "Stopped"}
            </span>
            <OutboundLink href={runHref(run.runId)} className="ml-auto inline-flex items-center gap-0.5 text-xs text-primary">
              Watch <ExternalLink className="size-3" />
            </OutboundLink>
          </div>
        ) : null}

        <section className="min-w-0">
          <h4 className="mb-1 px-1 text-xs font-medium text-muted-foreground">Website crawls</h4>
          {sites.error ? <p className="px-1 text-sm text-destructive">{extractErrorMessage(sites.error)}</p> : null}
          {sites.isLoading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
          {sites.data && !sites.data.length ? <p className="px-1 text-sm text-muted-foreground">No websites yet.</p> : null}
          <ul className="grid min-w-0 grid-cols-1">
            {(sites.data ?? []).map((site) => {
              const key = `site:${site.id}`;
              const active = Boolean(busy[key] || (site.crawl && ACTIVE.has(site.crawl.status)));
              const failed = Boolean(errors[key] || site.crawl?.status === "failed" || site.crawl?.error);
              const state = active ? "running" : failed ? "failed" : site.pages > 0 ? "done" : "todo";
              return (
                <li key={site.id} className="flex min-w-0 flex-wrap items-center gap-x-2 rounded-md px-1 py-1 hover:bg-muted/50 sm:flex-nowrap" data-testid="brand-work-site">
                  <StatusIcon state={state} />
                  <Link href={marketingRoutes.website(seg, site.id, "/crawls")} className="min-w-0 basis-[calc(100%-3.25rem)] break-all text-sm hover:text-primary sm:flex-1 sm:basis-0 sm:truncate sm:break-normal">
                    {site.name}
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatCount(site.pages)} pages
                    {site.crawl?.finishedAt ? ` · ${when(site.crawl.finishedAt)}` : ""}
                  </span>
                  {failed && !active ? (
                    <span className="order-last basis-full truncate pl-6 text-xs text-destructive sm:order-none sm:basis-auto sm:pl-0" title={errors[key] || site.crawl?.error || ""}>
                      {errors[key] || site.crawl?.error || "Failed"}
                    </span>
                  ) : null}
                  {canEdit ? (
                    <Button
                      variant="quiet"
                      icon={active ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                      disabled={active}
                      onClick={() => void crawl(site)}
                    >
                      {active ? "Crawling" : failed ? "Retry" : site.pages > 0 ? "Crawl again" : "Crawl"}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="min-w-0">
          <h4 className="mb-1 px-1 text-xs font-medium text-muted-foreground">Account posts</h4>
          {accounts.error ? <p className="px-1 text-sm text-destructive">{extractErrorMessage(accounts.error)}</p> : null}
          {accounts.isLoading ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
          {accounts.data && !accounts.data.length ? <p className="px-1 text-sm text-muted-foreground">No accounts yet.</p> : null}
          <ul className="grid min-w-0 grid-cols-1">
            {(accounts.data ?? []).map((account) => {
              const key = `acct:${account.propertyId}`;
              const active = Boolean(busy[key]);
              // A failed server walk counts until a later fetch lands posts (MKT-057).
              const serverError = account.posts === 0 ? (historyNotes.data?.get(accountKey(account.handleOrUrl))?.error ?? null) : null;
              const shownError = errors[key] || serverError || "";
              const state = active ? "running" : shownError ? "failed" : account.trackedId ? "done" : "todo";
              const points = defaultPosts ? spend.postsText(account.kind, defaultPosts) : null;
              return (
                <li key={account.propertyId} className="flex min-w-0 flex-wrap items-center gap-x-2 rounded-md px-1 py-1 hover:bg-muted/50 sm:flex-nowrap" data-testid="brand-work-account">
                  <StatusIcon state={state} />
                  <PropertyKindMark kind={account.kind} size={16} />
                  {account.trackedId ? (
                    <Link href={`${marketingRoutes.brandSocials(seg)}/accounts`} className="min-w-0 basis-[calc(100%-3.25rem)] break-all text-sm hover:text-primary sm:flex-1 sm:basis-0 sm:truncate sm:break-normal">
                      {account.label}
                    </Link>
                  ) : (
                    <span className="min-w-0 basis-[calc(100%-3.25rem)] break-all text-sm sm:flex-1 sm:basis-0 sm:truncate sm:break-normal">{account.label}</span>
                  )}
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {account.trackedId ? `${account.posts.toLocaleString()} posts` : "Not fetched"}
                    {account.lastPostAt ? ` · ${when(account.lastPostAt)}` : ""}
                  </span>
                  {shownError && !active ? (
                    <span className="order-last basis-full truncate pl-6 text-xs text-destructive sm:order-none sm:basis-auto sm:pl-0" title={shownError}>
                      {shownError}<ErrorAlchemyMenu error={shownError} />
                    </span>
                  ) : null}
                  {canEdit ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      {points && !active ? (
                        <Badge tone="neutral">{points}</Badge>
                      ) : null}
                      <Button
                        variant="quiet"
                        icon={active ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                        disabled={active}
                        onClick={() => void fetchPosts(account)}
                      >
                        {active ? "Fetching" : shownError ? "Retry" : account.trackedId ? "Fetch new" : "Fetch posts"}
                      </Button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </SectionCard>
  );
}
