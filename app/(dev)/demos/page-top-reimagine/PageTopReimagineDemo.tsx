"use client";

// The docking page top on REAL data: your brands (web.brand through the /marketing/brands/all read).
//   list level    Marketing › Brands — lanes as tabs (real counts), numbers from the rows
//   record level  Marketing › Brands › <brand ▾> — the brand's real section groups as tabs
// ?brand=<key> opens a brand, ?tab= picks the tab, ?shape= switches which bands the page has.
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Copy,
  ExternalLink,
  Landmark,
  LayoutList,
  Plus,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { Button, EmptyState, RegionSkeleton, SegmentedControl } from "@ai-matrx/design-system/controls";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { KpiTile } from "@/components/official/kpi/KpiTile";
import { usePinned } from "@/components/favorites/usePinned";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import { copyToClipboard } from "@/lib/clipboard/copy";
import { pageTrailCrumbs, type FramePageCrumb } from "@/features/shell/frame-host/framePageHeader";
import { pageFavorite } from "@/features/shell/frame-host/useFramePins";
import { PRODUCTS, PRODUCT_FAMILIES, productById } from "@/features/shell/frame/products";
import type { FrameFavorite } from "@/features/shell/frame/SheetHeader";
import { useOpenCreateBrandWindow } from "@/features/overlays/definitions/createBrandWindow.overlay";
import { forgetBrandListReads, inLane, listBrandRows, type BrandBrowseRow } from "@/features/marketing/components/brands/browse/service";
import { listMarketingBrandModeGroups } from "@/features/marketing/lib/brand-sections";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import type { ArchivedFilter } from "@/lib/entity-list/types";
import { DockingPageTop } from "./DockingPageTop";
import type { PageTopAction } from "./PageTopActionsMenu";

const DEMO_PATH = "/demos/page-top-reimagine";

function marketingProduct() {
  const product = productById("marketing");
  if (!product) throw new Error("[page-top-reimagine] the Marketing product is missing from products.ts");
  return product;
}
const MARKETING = marketingProduct();

const LANES = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "orgs", label: "My orgs" },
  { value: "shared", label: "Shared" },
  { value: "public", label: "Public" },
] as const;
type Lane = (typeof LANES)[number]["value"];

type Shape = "full" | "tabs" | "bare";
const SHAPES: readonly { value: Shape; label: string }[] = [
  { value: "full", label: "All bands" },
  { value: "tabs", label: "Tabs only" },
  { value: "bare", label: "Path row only" },
];

type Read = { status: "loading" } | { status: "failed"; message: string } | { status: "ready"; rows: BrandBrowseRow[] };

function useBrandRows(archived: ArchivedFilter) {
  // Each answer is stamped with the read it answers; a stale stamp IS the loading state.
  const [answer, setAnswer] = useState<{ key: string; read: Read } | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = `${archived}:${nonce}`;
  useEffect(() => {
    let live = true;
    listBrandRows(archived)
      .then((rows) => live && setAnswer({ key, read: { status: "ready", rows } }))
      .catch((error: unknown) => {
        console.error("[page-top-reimagine] the brand list failed to load", error);
        if (live) setAnswer({ key, read: { status: "failed", message: error instanceof Error ? error.message : String(error) } });
      });
    return () => {
      live = false;
    };
  }, [archived, key]);
  return {
    read: answer && answer.key === key ? answer.read : ({ status: "loading" } as Read),
    reload: () => {
      forgetBrandListReads();
      setNonce((n) => n + 1);
    },
  };
}

const sum = (rows: readonly BrandBrowseRow[], f: (r: BrandBrowseRow) => number) => rows.reduce((n, r) => n + f(r), 0);
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

export function PageTopReimagineDemo() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const isPhone = useIsMobile();
  const [archived, setArchived] = useState<ArchivedFilter>("active");
  const { read, reload } = useBrandRows(archived);
  const openCreate = useOpenCreateBrandWindow();
  const pinned = usePinned();
  const prefsKnown = useAppSelector(selectPreferencesLoadStatus) === "loaded";

  const brandKey = params.get("brand");
  const shape = (SHAPES.find((s) => s.value === params.get("shape"))?.value ?? "full") as Shape;
  const rows = read.status === "ready" ? read.rows : [];
  const brand = brandKey ? rows.find((r) => marketingSeg(r) === brandKey || r.id === brandKey) : undefined;

  const setParams = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null) q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    replaceAddressWithoutNavigating(s ? `${pathname}?${s}` : pathname);
  };
  const demoHref = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null) q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return s ? `${DEMO_PATH}?${s}` : DEMO_PATH;
  };
  const go = (href: string) => {
    if (href.startsWith(DEMO_PATH)) replaceAddressWithoutNavigating(href);
    else router.push(href);
  };

  const doors = {
    products: PRODUCTS,
    loadSearchIndex: () => import("@/features/shell/frame/goToSearchIndex").then((m) => m.fullGoToIndex(PRODUCTS, PRODUCT_FAMILIES)),
  };

  // ── the trail ──
  const brandsLevel: FramePageCrumb = { label: "Brands", href: demoHref({ brand: null, tab: null }), at: "/marketing/brands" };
  const trail: FramePageCrumb[] = brand
    ? [
        { label: "Marketing", href: "/marketing" },
        brandsLevel,
        {
          label: brand.name,
          options: rows.map((r) => ({ label: r.name, href: demoHref({ brand: marketingSeg(r), tab: null }), active: r.id === brand.id })),
          optionsLabel: "Brands",
          optionsAllHref: demoHref({ brand: null, tab: null }),
          optionsAllLabel: "All brands",
        },
      ]
    : [{ label: "Marketing", href: "/marketing" }, { ...brandsLevel, href: undefined }];
  const crumbs = pageTrailCrumbs(MARKETING, trail, go, doors);

  // ── the star: the real favourites store, the real address this page stands for ──
  const realAddress = brand ? marketingRoutes.brand(marketingSeg(brand)) : "/marketing/brands/all";
  const target = pageFavorite(realAddress, brand ? brand.name : "Brands");
  const favorite: FrameFavorite = {
    starred: prefsKnown && pinned.isPinned(target.id),
    known: prefsKnown,
    onToggle: () => prefsKnown && pinned.toggle(target),
  };

  const add = () => openCreate({ onWindowClose: () => reload() });
  const shareUrl = () => (typeof window === "undefined" ? "" : `${window.location.origin}${realAddress}`);

  // ── every action of the page ──
  const actions: PageTopAction[] = [
    ...(brand
      ? [
          { id: "open-brand", label: "Open brand", icon: ArrowUpRight, group: "Brand", onSelect: () => router.push(realAddress) },
          ...listMarketingBrandModeGroups(realAddress)
            .flatMap((g) => g.modes)
            .filter((m) => m.slug !== "")
            .map((m) => ({ id: `section-${m.slug}-${m.name}`, label: `Go to ${m.name}`, group: "Brand sections", onSelect: () => router.push(m.href), keywords: [m.group] })),
        ]
      : [
          { id: "add", label: "Add brand", icon: Plus, group: "Brands", onSelect: add, keywords: ["new", "create"] },
          { id: "list", label: "Open the brand list", icon: LayoutList, group: "Brands", onSelect: () => router.push("/marketing/brands/all") },
        ]),
    {
      id: "archived",
      label: archived === "archived" ? "Show active brands" : "Show archived brands",
      icon: archived === "archived" ? ArchiveRestore : Archive,
      group: "View",
      onSelect: () => setArchived(archived === "archived" ? "active" : "archived"),
    },
    { id: "refresh", label: "Refresh", icon: RefreshCw, group: "View", onSelect: reload, keywords: ["reload"] },
    { id: "copy-link", label: "Copy link", icon: Copy, group: "Share", onSelect: () => void copyToClipboard(shareUrl(), "Link copied") },
    { id: "new-tab", label: "Open in new tab", icon: ExternalLink, group: "Share", onSelect: () => openOutbound(realAddress, "_blank", "noopener,noreferrer") },
  ];

  // ── tabs ──
  const lane = (LANES.find((l) => l.value === params.get("tab"))?.value ?? "all") as Lane;
  const groups = brand ? listMarketingBrandModeGroups(realAddress) : [];
  const groupTab = brand ? (groups.find((g) => g.label === params.get("tab"))?.label ?? groups[0]?.label ?? "") : "";
  const tabs =
    shape === "bare"
      ? null
      : brand
        ? {
            label: `${brand.name} sections`,
            value: groupTab,
            items: groups.map((g) => ({ value: g.label, label: g.label, count: g.modes.length })),
            onValueChange: (v: string) => setParams({ tab: v }),
          }
        : {
            label: "Brand lanes",
            value: lane,
            items: LANES.map((l) => ({ value: l.value, label: l.label, count: read.status === "ready" ? rows.filter((r) => inLane(r, l.value)).length : null })),
            onValueChange: (v: string) => setParams({ tab: v === "all" ? null : v }),
          };

  // ── numbers ──
  const laneRows = rows.filter((r) => inLane(r, "all"));
  const loading = read.status === "loading";
  const failed = read.status === "failed";
  const value = (n: number) => (failed ? null : n.toLocaleString());
  const scopeRows = brand ? [brand] : laneRows;
  const sites = sum(scopeRows, (r) => r.sites.length);
  const socials = sum(scopeRows, (r) => r.social_count);
  const facts = sum(scopeRows, (r) => r.fact_count);
  const pending = sum(scopeRows, (r) => r.pending_discovered);
  const brandBase = brand ? realAddress : null;
  const numbers =
    shape !== "full" ? null : (
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {!brand ? (
          <KpiTile className="min-w-36 snap-start" label="Brands" value={value(laneRows.length)} loading={loading} href={demoHref({ tab: null })} title="Brands you made, your organizations' and ones shared with you." />
        ) : (
          <KpiTile className="min-w-36 snap-start" label="Assets" value={value(brand.asset_count)} loading={loading} href={`${realAddress}/identity`} />
        )}
        <KpiTile className="min-w-36 snap-start" label="Websites" value={value(sites)} loading={loading} href={brandBase ? `${brandBase}/websites` : undefined} />
        <KpiTile className="min-w-36 snap-start" label="Social accounts" value={value(socials)} loading={loading} hint={brand ? `${brand.social_tracked_count} tracked` : undefined} href={brandBase ? `${brandBase}/socials/accounts` : undefined} />
        <KpiTile
          className="min-w-36 snap-start"
          label="To review"
          value={value(pending)}
          tone={pending > 0 ? "warn" : "neutral"}
          loading={loading}
          hint={`${facts.toLocaleString()} facts known`}
          href={brandBase ? `${brandBase}/inbox` : undefined}
          title="Things found about the brand that wait for a yes or no."
        />
      </div>
    );
  const digest =
    read.status === "ready"
      ? brand
        ? `${plural(brand.sites.length, "site")} · ${plural(brand.social_count, "social")} · ${pending.toLocaleString()} to review`
        : `${plural(laneRows.length, "brand")} · ${plural(sites, "site")} · ${pending.toLocaleString()} to review`
      : undefined;

  const intro =
    shape === "full"
      ? brand
        ? {
            line: [brand.industry, brand.sites[0]?.domain, archived === "archived" ? "Archived" : null].filter(Boolean).join(" · ") || "No industry or website yet",
            primary: (
              <Button variant="primary" icon={<ArrowUpRight />} onClick={() => router.push(realAddress)}>
                Open brand
              </Button>
            ),
          }
        : {
            line: archived === "archived" ? "Archived brands" : "Every brand you can work on",
            primary: (
              <Button variant="primary" icon={<Plus />} onClick={add}>
                Add brand
              </Button>
            ),
          }
      : null;

  // ── the body ──
  let body: React.ReactNode;
  if (read.status === "loading") body = <RegionSkeleton shape="rows" count={8} twoLine aria-label="Loading your brands" />;
  else if (read.status === "failed")
    body = (
      <EmptyState
        icon={<TriangleAlert />}
        title="Your brands did not load"
        line={read.message}
        action={
          <Button variant="outline" icon={<RefreshCw />} onClick={reload}>
            Try again
          </Button>
        }
      />
    );
  else if (brandKey && !brand)
    body = (
      <EmptyState
        icon={<Landmark />}
        title="This brand is not in your list"
        line={archived === "archived" ? "It is not archived, or you cannot open it." : "It may be archived, or not shared with you."}
        action={
          <Button variant="outline" onClick={() => setParams({ brand: null, tab: null })}>
            All brands
          </Button>
        }
      />
    );
  else if (brand) {
    const group = groups.find((g) => g.label === groupTab);
    body = (
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {group?.modes.map((m) => (
          <li key={m.href}>
            <a href={m.href} data-clickable="" className="flex items-center gap-3 px-3 py-2.5 outline-none hover:bg-accent focus-visible:bg-accent">
              <span className="min-w-0 flex-1">
                <span className="type-title block truncate">{m.name}</span>
                <span className="type-secondary block truncate text-muted-foreground">{m.description}</span>
              </span>
              {"status" in m && m.status === "coming-soon" ? <span className="type-meta shrink-0 text-muted-foreground">Coming soon</span> : null}
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    );
  } else {
    const shown = rows.filter((r) => inLane(r, lane));
    body =
      shown.length === 0 ? (
        <EmptyState
          icon={<Landmark />}
          title={archived === "archived" ? "No archived brands here" : "No brands in this lane"}
          action={
            <Button variant="primary" icon={<Plus />} onClick={add}>
              Add brand
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {shown.map((r) => (
            <li key={r.id}>
              <a
                href={demoHref({ brand: marketingSeg(r), tab: null })}
                data-clickable=""
                onClick={(e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  setParams({ brand: marketingSeg(r), tab: null });
                }}
                className="flex items-center gap-3 px-3 py-2.5 outline-none hover:bg-accent focus-visible:bg-accent"
              >
                <span aria-hidden className="type-title flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {r.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="type-title block truncate">{r.name}</span>
                  <span className="type-secondary block truncate text-muted-foreground">
                    {[r.industry, r.sites.map((s) => s.domain).filter(Boolean).slice(0, 2).join(", ")].filter(Boolean).join(" · ") || "No website yet"}
                  </span>
                </span>
                <span className="type-meta hidden shrink-0 text-muted-foreground sm:block">
                  {plural(r.sites.length, "site")} · {plural(r.social_count, "social")}
                </span>
              </a>
            </li>
          ))}
        </ul>
      );
  }

  return (
    <DockingPageTop
      crumbs={crumbs}
      favorite={favorite}
      actions={actions}
      intro={intro}
      numbers={numbers}
      digest={digest}
      tabs={tabs}
      isPhone={isPhone}
      onBack={brand || brandKey ? () => setParams({ brand: null, tab: null }) : () => router.back()}
    >
      <div className="mb-3 flex items-center justify-end">
        <SegmentedControl aria-label="Page shape" value={shape} onValueChange={(v) => setParams({ shape: v === "full" ? null : v })} data={SHAPES} />
      </div>
      {body}
    </DockingPageTop>
  );
}
