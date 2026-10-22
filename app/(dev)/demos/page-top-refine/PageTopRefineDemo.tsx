"use client";

// /demos/page-top-refine — the page top the app shell owns, refined (ui-refine bake-off entry).
// Two real specimens over the person's real brands (the /marketing/brands/all read):
//   Brands list   /marketing/brands/all   — path row, workspace tabs, summary
//   One brand     /marketing/brands/<id>  — path row, intro band, summary, the brand's section tabs
// The crumbs are the frame's own (frameHostCrumbs over the real route table and derived trail),
// the star is the real pin store, and every door, tile and action opens the real place. Choosing a
// brand or "Brands" inside the specimen switches the specimen instead of leaving the demo.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Copy,
  ExternalLink,
  Globe2,
  Landmark,
  Plus,
  ScanSearch,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  PropertyRow,
  RegionSkeleton,
  RowGroup,
  SegmentedControl,
  Switch,
} from "@ai-matrx/design-system/controls";
import { ErrorNotice, RecordId } from "@ai-matrx/design-system";
import { cn } from "@ai-matrx/design-system/cn";
import { copyText } from "@ai-matrx/kit/clipboard";
import { openOutbound } from "@ai-matrx/kit/outbound";
import Link from "@/components/navigation/AppLink";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";
import { useDerivedTrail } from "@/features/shell/breadcrumbs/useDerivedTrail";
import { frameHostCrumbs } from "@/features/shell/frame-host/framePageHeader";
import { useFramePins } from "@/features/shell/frame-host/useFramePins";
import { menuGoToEntries } from "@/features/shell/frame-host/goToMenuEntries";
import { PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";
import { FRAME_ROUTE_HOMES } from "@/features/shell/frame/route-homes.generated";
import { FRAME_DEFAULT_PRODUCT_ID, resolveRouteHome } from "@/features/shell/frame/routeHomeLookup";
import type { FrameAction, FrameCrumb } from "@/features/shell/frame/types";
import { shellIconComponents } from "@/features/shell/shellIconMap";
import { listBrandRows, type BrandBrowseRow } from "@/features/marketing/components/brands/browse/service";
import { MARKETING_BRAND_SECTIONS } from "@/features/marketing/lib/brand-sections";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { MARKETING_WORKSPACE_ROUTES } from "@/features/marketing/components/shared/MarketingWorkspaceNav";
import { PathRow, type ActionGroup } from "./PathRow";
import { SectionTabs, type SectionTab } from "./SectionTabs";
import { IntroBand, SummaryBand, type SummaryNumber } from "./Bands";

type Specimen = "list" | "record";
type Width = "fit" | "phone";
type Read =
  | { status: "loading" }
  | { status: "failed"; error: unknown }
  | { status: "ready"; rows: BrandBrowseRow[] };

const LIST_PATH = marketingRoutes.brandsAll();
const BRAND_PATH = /^\/marketing\/brands\/([0-9a-f-]{36})$/i;
/** Below this specimen width the page top takes its phone form (the frame's own threshold class). */
const PHONE_BELOW_PX = 640;

function useBrandRows() {
  const [read, setRead] = useState<Read>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    listBrandRows("active")
      .then((rows) => live && setRead({ status: "ready", rows }))
      .catch((error: unknown) => {
        console.error("[page-top-refine] the brands read failed", error);
        if (live) setRead({ status: "failed", error });
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  return {
    read,
    retry: () => {
      setRead({ status: "loading" });
      setAttempt((n) => n + 1);
    },
  };
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** The brand's sections as tabs (coming-soon sections stay in the sidebar, not the tab row). */
function brandTabs(brand: BrandBrowseRow): (SectionTab & { href: string; line: string })[] {
  return MARKETING_BRAND_SECTIONS.filter((s) => !("status" in s && s.status === "coming-soon")).map((s) => {
    const sub = "subPath" in s && s.subPath ? `/${s.subPath}` : "";
    const href = s.slug ? marketingRoutes.brandSection(brand.id, `${s.slug}${sub}`) : marketingRoutes.brand(brand.id);
    const count =
      s.slug === "inbox" ? brand.pending_discovered : s.slug === "websites" ? brand.sites.length : s.slug === "socials" ? brand.social_count : null;
    return {
      value: s.slug || "overview",
      label: s.name,
      icon: shellIconComponents[s.iconName],
      count,
      href,
      line: s.description,
    };
  });
}

function workspaceTabs(): (SectionTab & { href: string; line: string })[] {
  return MARKETING_WORKSPACE_ROUTES.map((r) => ({
    value: r.href === marketingRoutes.brands() ? "brands" : r.href,
    label: r.name,
    icon: r.icon,
    href: r.href === marketingRoutes.brands() ? LIST_PATH : r.href,
    line: "",
  }));
}

function BrandMark({ brand }: { brand: BrandBrowseRow }) {
  const src = brand.logo_url ?? brand.favicon_url ?? brand.sites.find((s) => s.logo_url || s.favicon_url)?.favicon_url ?? null;
  if (src) {
    return <img src={src} alt="" className="size-full object-contain p-1" />;
  }
  return <span className="type-title">{brand.name.slice(0, 1).toUpperCase()}</span>;
}

export function PageTopRefineDemo() {
  const router = useRouter();
  const params = useSearchParams();
  const { read, retry } = useBrandRows();
  const rows = read.status === "ready" ? read.rows : [];

  const [specimen, setSpecimen] = useState<Specimen>(params.get("brand") ? "record" : "list");
  const [brandId, setBrandId] = useState<string | null>(params.get("brand"));
  const [tab, setTab] = useState<string>("overview");
  const [listTab, setListTab] = useState<string>("brands");
  const [showIntro, setShowIntro] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [showTabs, setShowTabs] = useState(true);
  const [widthMode, setWidthMode] = useState<Width>("fit");
  const { ref: sheetRef, width } = useWidth<HTMLDivElement>();
  const phone = width < PHONE_BELOW_PX;

  const brand = rows.find((r) => r.id === brandId) ?? (specimen === "record" ? rows[0] : undefined);
  const isRecord = specimen === "record";
  const pathname = isRecord && brand ? marketingRoutes.brand(brand.id) : LIST_PATH;

  function openBrand(id: string) {
    setBrandId(id);
    setSpecimen("record");
    setTab("overview");
  }
  // Inside the specimen, the two specimen pages switch here; every other place opens for real.
  function go(href: string) {
    const bare = href.split("?")[0];
    if (bare === LIST_PATH || bare === marketingRoutes.brands()) {
      setSpecimen("list");
      return;
    }
    const m = BRAND_PATH.exec(bare);
    if (m && rows.some((r) => r.id === m[1])) {
      openBrand(m[1]);
      return;
    }
    router.push(href);
  }

  // ── the path row's data: the frame's own crumb derivation over the specimen's address ──
  const isAdmin = useAppSelector(selectIsAdminPerson);
  // The frame's live product table (real sidebar links filled from the address). It lives in the
  // frame host's heavy chunk, so it is fetched once, on demand; until then the static table stands in.
  const [liveFill, setLiveFill] = useState<null | ((p: Record<string, string>) => typeof PRODUCTS)>(null);
  useEffect(() => {
    let live = true;
    import("@/features/shell/frame-host/FrameHostImpl")
      .then((m) => live && setLiveFill(() => m.liveProducts))
      .catch((error: unknown) => console.error("[page-top-refine] the live product table failed to load", error));
    return () => {
      live = false;
    };
  }, []);
  const home = resolveRouteHome(FRAME_ROUTE_HOMES, pathname);
  const products = liveFill ? liveFill(home.params) : PRODUCTS;
  const product =
    products.find((p) => p.id === home.productId) ?? products.find((p) => p.id === FRAME_DEFAULT_PRODUCT_ID) ?? products[0];
  const derived = useDerivedTrail({ pathname });
  const goToEntries = menuGoToEntries({ isAuthenticated: true, isAdmin });
  const declared = isRecord && brand ? [{ label: brand.name, href: pathname }] : null;
  const crumbs: FrameCrumb[] = frameHostCrumbs(product, declared, derived, go, pathname, {
    products,
    loadSearchIndex: () =>
      import("@/features/shell/frame/goToSearchIndex").then((m) => m.fullGoToIndex(products, PRODUCT_FAMILIES, goToEntries)),
  }).map((c, i, all) =>
    // The brand level's door: every other brand, switching the specimen in place.
    isRecord && brand && i === all.length - 1
      ? {
          ...c,
          door: {
            kind: "siblings",
            label: "Brands",
            options: rows.map((r) => ({
              label: r.name,
              href: marketingRoutes.brand(r.id),
              active: r.id === brand.id,
              onSelect: () => openBrand(r.id),
            })),
            allHref: LIST_PATH,
            allLabel: "All brands",
          },
        }
      : c,
  );
  const { favorite } = useFramePins(pathname, crumbs[crumbs.length - 1]?.label ?? "Brands", []);

  // ── "…": the page's own actions, then the page's link ──
  const linkGroup: ActionGroup = {
    id: "link",
    label: "This page",
    actions: [
      { id: "copy-link", label: "Copy link", icon: Copy, onSelect: () => void copyText(`${window.location.origin}${pathname}`) },
      { id: "open-new-tab", label: "Open in new tab", icon: ExternalLink, onSelect: () => openOutbound(pathname, "_blank", "noopener") },
    ],
  };
  const pageGroup: ActionGroup =
    isRecord && brand
      ? {
          id: "brand",
          actions: [
            { id: "add-site", label: "Add a website", icon: Globe2, onSelect: () => router.push(marketingRoutes.newSite(brand.id)) },
            { id: "enrich", label: "Fill in with Smart Add", icon: ScanSearch, onSelect: () => router.push(marketingRoutes.smartAddEnrich(brand.id)) },
            { id: "open", label: "Open the brand page", icon: ArrowUpRight, onSelect: () => router.push(marketingRoutes.brand(brand.id)) },
          ] satisfies FrameAction[],
        }
      : {
          id: "brands",
          actions: [
            { id: "add", label: "Add brand", icon: Plus, onSelect: () => router.push(marketingRoutes.brandsNew()) },
            { id: "open", label: "Open the live list", icon: ArrowUpRight, onSelect: () => router.push(LIST_PATH) },
          ] satisfies FrameAction[],
        };

  // ── the bands ──
  const loading = read.status === "loading";
  const tabs = isRecord && brand ? brandTabs(brand) : workspaceTabs();
  const activeTab = isRecord ? tab : listTab;
  const setActiveTab = isRecord ? setTab : setListTab;
  const current = tabs.find((t) => t.value === activeTab) ?? tabs[0];

  const numbers: SummaryNumber[] =
    isRecord && brand
      ? [
          { id: "sites", label: "Websites", value: brand.sites.length, href: marketingRoutes.brandSection(brand.id, "websites") },
          {
            id: "social",
            label: "Social accounts",
            value: brand.social_count,
            hint: `${brand.social_tracked_count} tracked`,
            href: marketingRoutes.brandSection(brand.id, "socials/accounts"),
          },
          { id: "facts", label: "Facts", value: brand.fact_count, title: "Facts confirmed about this brand.", href: marketingRoutes.brandIdentity(brand.id) },
          {
            id: "review",
            label: "To review",
            value: brand.pending_discovered,
            tone: brand.pending_discovered > 0 ? "warn" : "neutral",
            title: "Found assets and facts waiting for your yes or no.",
            href: marketingRoutes.brandSection(brand.id, "inbox"),
          },
        ]
      : [
          { id: "all", label: "Brands", value: loading ? null : rows.length, href: LIST_PATH },
          { id: "mine", label: "Made by you", value: loading ? null : rows.filter((r) => r.is_mine).length },
          { id: "public", label: "On the web", value: loading ? null : rows.filter((r) => r.is_public).length },
          {
            id: "review",
            label: "To review",
            value: loading ? null : rows.reduce((n, r) => n + r.pending_discovered, 0),
            tone: rows.some((r) => r.pending_discovered > 0) ? "warn" : "neutral",
            title: "Found assets and facts waiting for a yes or no, across every brand.",
          },
        ];

  const intro = !showIntro ? null : isRecord ? (
    brand ? (
      <IntroBand
        phone={phone}
        mark={<BrandMark brand={brand} />}
        title={brand.name}
        facts={
          <>
            <Badge tone={brand.status === "active" ? "success" : "neutral"}>{brand.status}</Badge>
            {brand.industry ? <Badge>{brand.industry}</Badge> : null}
            {brand.sites[0]?.domain ? <span className="type-meta truncate text-muted-foreground">{brand.sites[0].domain}</span> : null}
            <RecordId value={brand.id} label="Brand" token="brand" />
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={marketingRoutes.brand(brand.id)}>Open brand</Link>
            </Button>
            <Button variant="primary" icon={<Plus />} asChild>
              <Link href={marketingRoutes.newSite(brand.id)}>Add website</Link>
            </Button>
          </>
        }
      />
    ) : loading ? (
      <div className="px-6 pb-3 pt-5">
        <RegionSkeleton shape="rows" count={1} twoLine aria-label="Brand" />
      </div>
    ) : null
  ) : (
    <IntroBand
      phone={phone}
      mark={<Landmark className="size-5" aria-hidden />}
      title="Brands"
      facts={<Badge>{loading ? "Counting" : `${rows.length} brands`}</Badge>}
      actions={
        <Button variant="primary" icon={<Plus />} asChild>
          <Link href={marketingRoutes.brandsNew()}>Add brand</Link>
        </Button>
      }
    />
  );

  // ── the body under the page top ──
  let body: ReactNode;
  if (read.status === "failed") {
    body = (
      <div className={cn("py-6", phone ? "px-4" : "px-6")}>
        <ErrorNotice title="Couldn't load brands" error={read.error} operation="Read brands" onRetry={retry} actions={<Button variant="outline" onClick={retry}>Try again</Button>} />
      </div>
    );
  } else if (loading) {
    body = (
      <div className={phone ? "px-4" : "px-6"}>
        <RegionSkeleton shape="rows" count={8} twoLine aria-label="Brands" />
      </div>
    );
  } else if (rows.length === 0) {
    body = (
      <div className="py-16">
      <EmptyState
        icon={<Landmark />}
        title="No brands yet"
        action={
          <Button variant="primary" icon={<Plus />} asChild>
            <Link href={marketingRoutes.brandsNew()}>Add brand</Link>
          </Button>
        }
      />
      </div>
    );
  } else if (isRecord && brand && current.value === "overview") {
    body = (
      <div className={cn("py-4", phone ? "px-4" : "px-6")}>
        <RowGroup>
          <PropertyRow label="Name" value={brand.name} />
          <PropertyRow label="Industry" value={brand.industry} />
          <PropertyRow label="Status" value={brand.status} />
          <PropertyRow label="Websites" value={brand.sites.map((s) => s.domain).filter(Boolean).join(", ")} />
          <PropertyRow label="Updated" value={new Date(brand.updated_at).toLocaleString()} />
        </RowGroup>
      </div>
    );
  } else if (!isRecord && current.value === "brands") {
    body = (
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              data-clickable=""
              onClick={() => openBrand(r.id)}
              className={cn("flex h-12 w-full items-center gap-3 text-left hover:bg-accent", phone ? "px-4" : "px-6")}
            >
              <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
                <BrandMark brand={r} />
              </span>
              <span className="type-body min-w-0 flex-1 truncate">{r.name}</span>
              {r.industry && !phone ? <span className="type-meta truncate text-muted-foreground">{r.industry}</span> : null}
              <span className="type-meta shrink-0 text-muted-foreground">{r.sites.length} sites</span>
            </button>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="py-16">
      <EmptyState
        icon={current.icon ? <current.icon /> : <ArrowUpRight />}
        title={current.label}
        line="This section opens on its own page"
        action={
          <Button variant="outline" icon={<ArrowUpRight />} asChild>
            <Link href={current.href}>Open {current.label}</Link>
          </Button>
        }
      />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-textured">
      {/* Specimen controls (demo only). */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2">
        <SegmentedControl
          aria-label="Page"
          value={specimen}
          onValueChange={(v) => setSpecimen(v)}
          data={[
            { value: "list", label: "Brands list" },
            { value: "record", label: "One brand", disabled: rows.length === 0 },
          ]}
        />
        <Toggle label="Intro" checked={showIntro} onChange={setShowIntro} />
        <Toggle label="Summary" checked={showSummary} onChange={setShowSummary} />
        <Toggle label="Tabs" checked={showTabs} onChange={setShowTabs} />
        <SegmentedControl
          aria-label="Width"
          value={widthMode}
          onValueChange={(v) => setWidthMode(v)}
          data={[
            { value: "fit", label: "Fit" },
            { value: "phone", label: "Phone" },
          ]}
        />
      </div>

      {/* The specimen sheet: the shell's page top over a real scroll area. */}
      <div className="flex min-h-0 flex-1 justify-center p-3">
        <div
          ref={sheetRef}
          data-page-top-specimen=""
          className={cn(
            "flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-border bg-card",
            widthMode === "phone" && "max-w-[390px]",
          )}
        >
          <PathRow
            crumbs={crumbs}
            favorite={favorite}
            groups={[pageGroup, linkGroup]}
            phone={phone}
            width={width}
            headingBelow={Boolean(intro)}
            onBack={isRecord && phone ? () => setSpecimen("list") : undefined}
          />
          <div data-matrx-page-scroll="" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {intro}
            {showSummary ? <SummaryBand phone={phone} numbers={numbers} loading={loading} /> : null}
            {showTabs ? (
              <SectionTabs
                aria-label={isRecord ? "Brand sections" : "Marketing"}
                items={tabs}
                value={current.value}
                onValueChange={setActiveTab}
                sticky={!phone}
              />
            ) : null}
            {body}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="type-body flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
      {label}
    </label>
  );
}
