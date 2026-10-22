"use client";

import { readAllRows } from "@ai-matrx/data/db";

/**
 * Background work — what the platform has fetched for this brand and what is still to fetch, on the
 * brand home: the Smart Add setup run, every site's crawl, and every confirmed account's posts.
 * Every job is an existing primitive (workflow run, web.crawl_session, the social track door);
 * nothing here schedules work — a fetch starts only on Create or on a click here.
 *
 * Controlled: a site already crawling is never started again; an account's posts come through the
 * canonical social door (`trackAccount` / `refreshProfile`), which reuses the stored profile, dedupes
 * posts and the tracked row, meters the spend, and honors `social.profile_posts_default` / `max`.
 * Plan: common-docs smart-add-brand/BRAND-PAGES-PLAN.md (G2, G3).
 *
 * ONE `MatrxDataTable`: a row per site crawl and per account's posts, one column per sortable /
 * filterable value (status, what, source, fetched, updated, problem), the fetch in the table's own
 * Actions column. The header's Cost popover keeps the posts per fetch and the fetch-all total.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Coins, ExternalLink, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef, MatrxDataTableMobileCardControls, MatrxTableIconAction } from "@ai-matrx/design-system/data-table/types";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { formatCount, formatRelativeTime } from "@ai-matrx/kit/format";
import { supabase } from "@/utils/supabase/client";
import { authenticatedWebDb } from "@/utils/supabase/webDb";
import { useAppDispatch } from "@/lib/redux/hooks";
import { recordToast } from "@/lib/toast";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { extractErrorMessage } from "@/utils/errors";
import { lookupSystemRun } from "@/lib/workflows/system-runs";
import { runHref } from "@/features/workflow-runtime/run-doors";
import { initializeSite } from "@/features/marketing/crawler/direct-client";
import { useBrandProperties, useBrandSites } from "@/features/marketing/data/hooks";
import { countSitePages, listBrandProperties, listBrandSites } from "@/features/marketing/data/service";
import { refreshProfile, socialErrorMessage, trackAccount } from "@/features/marketing/social/server";
import { rememberedMaxPostsPlain } from "@/features/marketing/social/post-count";
import { useSocialSpend } from "@/features/marketing/social/cost";
import type { SocialPlatform } from "@/features/marketing/social/types";
import { useSessionKnob } from "@/lib/scoped-config/sessionKnob";
import { PropertyKindMark } from "@/features/marketing/components/shared/PropertyKindMark";
import { SectionCard } from "@/features/marketing/components/shared/MarketingUi";
import { NO_RAW_ROW_WINDOW } from "@/features/marketing/social/row-open";
import { platformLabel } from "@/features/marketing/social/components/PlatformMark";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { marketingSeg } from "@/features/marketing/lib/keys";
import type { MarketingBrand } from "@/features/marketing/types";
import { accountKey, loadPostHistoryNotes } from "./postHistoryOutcomes";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

const ACTIVE = new Set(["queued", "running"]);
/** The loaded table: toolbar + header, then one row each (measured: 1 row 112px, 3 rows 170px). */
const BG_TABLE_BASE_PX = 83;
const BG_ROW_PX = 29;

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
  if (error) throw error;
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
  if (tracked.error) throw tracked.error;
  const byProperty = new Map((tracked.data ?? []).filter((t) => t.property_id).map((t) => [t.property_id as string, t]));
  // ONE batched read for every account's posts (count + latest), never two reads per account.
  const profileIds = [...new Set([...byProperty.values()].map((t) => t.profile_id).filter((id): id is string => Boolean(id)))];
  const postStats = new Map<string, { posts: number; lastPostAt: string | null }>();
  if (profileIds.length) {
    const rows = await readAllRows<{ profile_id: string; created_at: string }>(
      ({ from, to }) =>
        supabase
          .schema("social")
          .from("post")
          .select("profile_id, created_at")
          .in("profile_id", profileIds)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true })
          .range(from, to)
          .returns<{ profile_id: string; created_at: string }[]>(),
      { label: "social.post brand background work" },
    );
    for (const row of rows) {
      const hit = postStats.get(row.profile_id);
      if (hit) hit.posts += 1;
      else postStats.set(row.profile_id, { posts: 1, lastPostAt: row.created_at });
    }
  }
  return properties.map((p) => {
      const t = byProperty.get(p.id) ?? null;
      const stat = t?.profile_id ? postStats.get(t.profile_id) : undefined;
      const posts = stat?.posts ?? 0;
      const lastPostAt = stat?.lastPostAt ?? null;
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
    });
}

type WorkState = "running" | "done" | "failed" | "todo";
const STATE_LABEL: Record<WorkState, string> = { running: "Working", done: "Done", failed: "Failed", todo: "To do" };

/** One table row: a site's crawl or an account's posts. */
interface WorkRow {
  id: string;
  site: SiteJob | null;
  account: AccountJob | null;
  kind: string;
  name: string;
  source: string;
  href: string | null;
  state: WorkState;
  count: number | null;
  unit: "pages" | "posts";
  updatedAt: string | null;
  problem: string;
}

function StatusIcon({ state }: { state: WorkState }) {
  if (state === "running") return <Spinner size="xs" label="Working" className="shrink-0" />;
  if (state === "done") return <CheckCircle2 className="size-3.5 shrink-0 text-success" />;
  if (state === "failed") return <AlertTriangle className="size-3.5 shrink-0 text-destructive" />;
  return <span className="size-3.5 shrink-0 rounded-full border border-dashed border-muted-foreground" />;
}

/** A phone's row: status and what, the numbers, the problem, and the table's own actions. */
function WorkCard({ row, controls }: { row: WorkRow; controls: MatrxDataTableMobileCardControls }) {
  return (
    <div className="flex flex-col gap-1.5 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">{controls.renderCell("what")}</div>
        <div className="shrink-0">{controls.actions}</div>
      </div>
      <div className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
        {controls.renderCell("state")}
        <span className="tabular-nums">{controls.renderCell("fetched")}</span>
        <span className="tabular-nums">{controls.renderCell("updated")}</span>
      </div>
      {row.problem ? <div className="min-w-0">{controls.renderCell("problem")}</div> : null}
    </div>
  );
}

export function BrandBackgroundWork({ brand, canEdit }: { brand: MarketingBrand; canEdit: boolean }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
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
  // The rows to come are the brand's sites plus its accounts: both lists are already loading for the page
  // (shared cache), so the loading box can be the height of the table that replaces it.
  // access-errors: ok — only sizes the loading box; the table's own reads report any failure.
  const knownSites = useBrandSites(brand.id);
  // access-errors: ok — only sizes the loading box; the table's own reads report any failure.
  const knownProperties = useBrandProperties(brand.id);
  const expectedRows =
    knownSites.data && knownProperties.data
      ? Math.max(1, knownSites.data.length + knownProperties.data.filter((x) => x.kind !== "website" && (x.url || x.handle)).length)
      : 2;
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
      recordToast.success({ type: "brand_property", id: account.propertyId, title: account.label }, `Posts fetched for ${account.label}`);
    } catch (error) {
      setErrors((e) => ({ ...e, [key]: socialErrorMessage(error, "The posts could not be fetched.") }));
    } finally {
      mark(key, false);
      await queryClient.invalidateQueries({ queryKey: ["marketing", "brand-work-accounts", brand.id] });
    }
  };

  const missing = (accounts.data ?? []).filter((a) => !a.trackedId);
  // Bulk, paid work: the confirm step names the points before anything runs (points law: confirm before bulk work).
  const [bulkRunning, setBulkRunning] = useState(false);
  const fetchMissing = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);
    try {
      await fetchMissingOnce();
    } finally {
      setBulkRunning(false);
    }
  };
  const fetchMissingOnce = async () => {
    const total = defaultPosts ? spend.postsNode(missing.map((a) => a.kind), defaultPosts) : null;
    const ok = await confirm({
      title: `Fetch posts for ${missing.length} accounts?`,
      description: total ?? undefined,
      confirmLabel: "Fetch all posts",
    });
    if (!ok) return;
    for (const account of missing) await fetchPosts(account);
  };

  const rows = ((): WorkRow[] => {
    const siteRows = (sites.data ?? []).map((site): WorkRow => {
      const key = `site:${site.id}`;
      const active = Boolean(busy[key] || (site.crawl && ACTIVE.has(site.crawl.status)));
      const problem = errors[key] || site.crawl?.error || (site.crawl?.status === "failed" ? "Failed" : "");
      return {
        id: key,
        site,
        account: null,
        kind: "website",
        name: site.name,
        source: "Website",
        href: marketingRoutes.website(seg, site.id, "/crawls"),
        state: active ? "running" : problem ? "failed" : site.pages > 0 ? "done" : "todo",
        count: site.pages,
        unit: "pages",
        updatedAt: site.crawl?.finishedAt ?? null,
        problem: active ? "" : problem,
      };
    });
    const accountRows = (accounts.data ?? []).map((account): WorkRow => {
      const key = `acct:${account.propertyId}`;
      const active = Boolean(busy[key]);
      // A failed server walk counts until a later fetch lands posts (MKT-057).
      const serverError = account.posts === 0 ? (historyNotes.data?.get(accountKey(account.handleOrUrl))?.error ?? null) : null;
      const problem = errors[key] || serverError || "";
      return {
        id: key,
        site: null,
        account,
        kind: account.kind,
        name: account.label,
        source: platformLabel(account.kind),
        href: account.trackedId ? `${marketingRoutes.brandSocials(seg)}/accounts` : null,
        state: active ? "running" : problem ? "failed" : account.trackedId ? "done" : "todo",
        count: account.trackedId ? account.posts : null,
        unit: "posts",
        updatedAt: account.lastPostAt,
        problem: active ? "" : problem,
      };
    });
    return [...siteRows, ...accountRows];
  })();

  const columns: MatrxColumnDef<WorkRow>[] = [
      {
        id: "state",
        label: "Status",
        header: "Status",
        width: 96,
        accessorFn: (r) => STATE_LABEL[r.state],
        filter: "select",
        filterOptions: Object.values(STATE_LABEL).map((v) => ({ value: v, label: v })),
        cell: (r) => (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <StatusIcon state={r.state} />
            <span className="text-xs">{STATE_LABEL[r.state]}</span>
          </span>
        ),
      },
      {
        id: "what",
        label: "Website or account",
        header: "What",
        width: 240,
        minWidth: 160,
        accessorFn: (r) => r.name,
        filter: "text",
        cell: (r) => {
          const body = (
            <span className="flex min-w-0 items-center gap-2">
              <PropertyKindMark kind={r.kind} size={16} />
              <span className="truncate text-sm" title={r.name}>{r.name}</span>
            </span>
          );
          return r.href ? (
            <Link href={r.href} className="block min-w-0 hover:text-primary" data-clickable="">
              {body}
            </Link>
          ) : (
            body
          );
        },
      },
      {
        id: "source",
        label: "Source",
        header: "Source",
        width: 96,
        accessorFn: (r) => r.source,
        filter: "select",
      },
      {
        id: "fetched",
        label: "Fetched",
        header: "Fetched",
        width: 120,
        align: "right",
        accessorFn: (r) => r.count,
        copyValue: (r) => (r.count === null ? "" : `${r.count} ${r.unit}`),
        filter: "number",
        cell: (r) =>
          r.count === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="whitespace-nowrap tabular-nums">
              {formatCount(r.count)} {r.unit}
            </span>
          ),
      },
      {
        id: "updated",
        label: "Updated",
        header: "Updated",
        width: 96,
        accessorFn: (r) => r.updatedAt,
        copyValue: (r) => when(r.updatedAt),
        filter: "date",
        cell: (r) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground" title={r.updatedAt ?? undefined}>
            {when(r.updatedAt) || "—"}
          </span>
        ),
      },
      {
        id: "problem",
        label: "Problem",
        header: "Problem",
        width: 280,
        minWidth: 120,
        accessorFn: (r) => r.problem,
        filter: "text",
        cell: (r) =>
          r.problem ? (
            <span className="flex min-w-0 items-center gap-1 text-xs text-destructive">
              <span className="truncate" title={r.problem}>{r.problem}</span>
              <ErrorAlchemyMenu error={r.problem} />
            </span>
          ) : null,
      },
  ];

  const rowActions = (r: WorkRow): MatrxTableIconAction[] => {
    if (!canEdit) return [];
    const active = r.state === "running";
    if (r.site) {
      const site = r.site;
      return [
        {
          id: "crawl",
          icon: RefreshCw,
          label: active ? "Crawling" : r.state === "failed" ? "Retry crawl" : site.pages > 0 ? "Crawl again" : "Crawl",
          loading: active,
          disabled: active,
          onClick: () => void crawl(site),
        },
      ];
    }
    const account = r.account;
    if (!account) return [];
    const label = active ? "Fetching" : r.state === "failed" ? "Retry fetch" : account.trackedId ? "Fetch new posts" : "Fetch posts";
    return [
      {
        id: "fetch",
        icon: RefreshCw,
        label,
        loading: active,
        disabled: active,
        onClick: () => void fetchPosts(account),
      },
    ];
  };

  // The Cost popover (an info view, so points belong here): one fetch per account, plus the fetch-all total.
  const costRows = defaultPosts ? (accounts.data ?? []).map((a) => ({ a, points: spend.postsTotalText([a.kind], defaultPosts) })) : [];
  const missingTotal = !accounts.isError && defaultPosts && missing.length > 1 ? spend.postsTotalText(missing.map((a) => a.kind), defaultPosts) : null;

  const run = setup.data;
  const runState: WorkState | null = !run ? null : run.active ? (run.status === "interrupted" ? "todo" : "running") : run.status === "completed" ? "done" : "failed";

  return (
    <SectionCard
      title="Background work"
      anchor="background-work"
      headerExtra={
        canEdit ? (
          <>
            {/* Drawn from first paint so the header never shifts; disabled until the accounts are read. */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="quiet" icon={<Coins />} disabled={!accounts.isSuccess} aria-label="What fetching posts costs">
                  Cost
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" width="md" padding="sm">
                <p className="px-1 pb-1.5 text-xs text-muted-foreground">
                  {defaultPosts ? `${defaultPosts} posts per fetch` : "Posts per fetch not set"}
                </p>
                {costRows.length ? (
                  <ul className="flex flex-col">
                    {costRows.map(({ a, points }) => (
                      <li key={a.propertyId} className="flex min-w-0 items-center gap-2 px-1 py-1 text-sm">
                        <PropertyKindMark kind={a.kind} size={16} />
                        <span className="min-w-0 flex-1 truncate">{a.label}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">{points ?? "—"}</span>
                      </li>
                    ))}
                  </ul>
                ) : defaultPosts && !accounts.isError ? (
                  <p className="px-1 py-1 text-sm text-muted-foreground">No accounts to fetch</p>
                ) : null}
                {missingTotal && !accounts.isError ? (
                  <p className="mt-1 flex items-center gap-2 border-t border-border px-1 pt-1.5 text-sm">
                    <span className="flex-1">Fetch all posts ({missing.length})</span>
                    <span className="tabular-nums">{missingTotal}</span>
                  </p>
                ) : null}
              </PopoverContent>
            </Popover>
            {!accounts.isError && missing.length > 1 ? (
              <Button variant="outline" disabled={bulkRunning} onClick={() => void fetchMissing()}>
                Fetch all posts
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col" data-testid="brand-background-work">
        {/* One fixed-height line from first paint (loading, no run, or a run), so the table never moves under the reader. */}
        <div className="flex h-9 items-center gap-2 border-b border-border px-3 text-sm" data-testid="brand-setup-line">
          {run ? (
            <>
              <StatusIcon state={runState ?? "todo"} />
              <span className="font-medium">Brand setup</span>
              <span className="text-muted-foreground">
                {run.status === "interrupted" ? "Waiting for you" : run.status === "completed" ? "Done" : run.active ? "Working" : "Stopped"}
              </span>
              <OutboundLink href={runHref(run.runId)} className="ml-auto inline-flex items-center gap-0.5 text-xs text-primary">
                Watch <ExternalLink className="size-3" />
              </OutboundLink>
            </>
          ) : (
            <>
              <span aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="font-medium">Brand setup</span>
              {setup.isError ? (
                <span className="flex min-w-0 items-center gap-1 text-xs text-destructive">
                  <span className="truncate">{extractErrorMessage(setup.error)}</span>
                  <ErrorAlchemyMenu error={extractErrorMessage(setup.error)} />
                </span>
              ) : (
                <span className={setup.isLoading ? "h-5 w-24 animate-pulse rounded bg-muted" : "text-muted-foreground"}>{setup.isLoading ? "" : "No setup run"}</span>
              )}
            </>
          )}
        </div>
        {sites.isError !== accounts.isError ? (
          <p data-error-box className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs text-destructive">
            <span className="truncate">
              {sites.isError ? "Website crawls" : "Account posts"} couldn&apos;t load: {extractErrorMessage(sites.error ?? accounts.error)}
            </span>
            <Button variant="quiet" onClick={() => void (sites.isError ? sites.refetch() : accounts.refetch())}>
              Retry
            </Button>
            <ErrorAlchemyMenu error={extractErrorMessage(sites.error ?? accounts.error)} />
          </p>
        ) : null}
        {sites.isLoading || accounts.isLoading ? (
          // A table of typical height (toolbar, header, two rows) holds the place while both reads land, so the
          // cards below do not drop when the table's own taller loading state is replaced by the rows.
          <div aria-busy="true" aria-label="Loading background work" className="p-3" style={{ height: BG_TABLE_BASE_PX + BG_ROW_PX * expectedRows }}>
            <div className="h-full w-full animate-pulse rounded bg-muted/60" />
          </div>
        ) : (
          <MatrxDataTable<WorkRow>
            tableId="marketing-brand-background-work"
            data={rows}
            columns={columns}
            getRowId={(r) => r.id}
            appearance="embedded"
            density="condensed"
            viewTabs={false}
            pageSize={0}
            {...NO_RAW_ROW_WINDOW}
            onRowOpen={(r) => {
              if (r.href) router.push(r.href);
            }}
            mobileCardsBreakpoint="md"
            mobileCards={(r, _i, controls) => <WorkCard row={r} controls={controls} />}
            isLoading={sites.isLoading || accounts.isLoading}
            isFetching={sites.isFetching || accounts.isFetching}
            read={{
              // One read failing never hides the other's rows: the failed half says so above the table.
              status: sites.isError && accounts.isError ? "error" : sites.isLoading || accounts.isLoading ? "loading" : "ready",
              error: sites.error ?? accounts.error ?? undefined,
              onRetry: () => {
                void sites.refetch();
                void accounts.refetch();
              },
            }}
            toolbar={{ searchPlaceholder: "Search work…", singleRow: true }}
            rowActions={rowActions}
            emptyState={{ title: "No websites or accounts yet" }}
          />
        )}
      </div>
    </SectionCard>
  );
}
