"use client";

// /demos/page-top-dense — the dense page top on REAL data: the signed-in person's brands
// (listBrandRows, the same read /marketing/brands/all uses). `?brand=<id>` turns the list page into
// that brand's record page; `?tab=` picks its section. Every crumb door, the star, every "…" action
// and every figure act on the real records; sections not drawn here open their real page.
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  Copy,
  ExternalLink,
  Globe2,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  PanelTop,
  Plus,
  RefreshCw,
  Share2,
  Tags,
  ScanSearch,
} from "lucide-react";
import {
  RecordId,
  SiteIcon,
  StatusDot,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  UrlValue,
} from "@ai-matrx/design-system";
import { Button, EmptyState, PropertyRow, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { copyText } from "@ai-matrx/kit/clipboard";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { useAppSelector } from "@/lib/redux/hooks";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import { usePinned } from "@/components/favorites/usePinned";
import { PRODUCTS, productById } from "@/features/shell/frame/products";
import type { FrameCrumb } from "@/features/shell/frame/types";
import { listBrandRows, type BrandBrowseRow } from "@/features/marketing/components/brands/browse/service";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useOpenCreateBrandWindow } from "@/features/overlays/definitions/createBrandWindow.overlay";
import { MARKETING_WORKSPACE_ROUTES } from "@/features/marketing/components/shared/MarketingWorkspaceNav";
import { DensePageTop, type DenseAction, type DenseFigure, type DenseTab } from "./DensePageTop";

const MARKETING = productById("marketing")!;

type Read = { state: "loading" } | { state: "failed"; message: string } | { state: "ready"; rows: BrandBrowseRow[] };

const RECORD_TABS = ["overview", "websites", "socials", "assets", "facts", "inbox"] as const;
type RecordTab = (typeof RECORD_TABS)[number];

function ago(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });
  if (s < 3600) return fmt.format(-Math.round(s / 60), "minute");
  if (s < 86400) return fmt.format(-Math.round(s / 3600), "hour");
  if (s < 86400 * 45) return fmt.format(-Math.round(s / 86400), "day");
  return fmt.format(-Math.round(s / (86400 * 30)), "month");
}

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "active") return "success";
  if (status === "paused" || status === "draft") return "warning";
  return "neutral";
}

function useBrands(): [Read, () => void] {
  const [read, setRead] = useState<Read>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    listBrandRows("active").then(
      (rows) => live && setRead({ state: "ready", rows }),
      (error: unknown) => {
        console.error("[page-top-dense] the brands read failed", error);
        if (live) setRead({ state: "failed", message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  return [read, () => {
    setRead({ state: "loading" });
    setAttempt((n) => n + 1);
  }];
}

export function PageTopDenseDemo() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [read, reload] = useBrands();
  const openCreate = useOpenCreateBrandWindow();
  const pinned = usePinned();
  const prefsKnown = useAppSelector(selectPreferencesLoadStatus) === "loaded";
  const [bands, setBands] = useState({ intro: true, figures: true, tabs: true });

  const brandId = params.get("brand");
  const tab = (RECORD_TABS as readonly string[]).includes(params.get("tab") ?? "") ? (params.get("tab") as RecordTab) : "overview";
  const rows = read.state === "ready" ? read.rows : [];
  const brand = brandId ? rows.find((r) => r.id === brandId) : undefined;

  const hrefFor = (next: { brand?: string | null; tab?: string | null }) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    return s ? `${pathname}?${s}` : pathname;
  };
  const go = (href: string) => startTransition(() => router.replace(href, { scroll: false }));
  const goOut = (href: string) => startTransition(() => router.push(href));
  const listHref = hrefFor({ brand: null, tab: null });

  // ── Crumbs: product ▾ › Brands ▾ › <brand> ▾ — every level a door.
  const loadSearchIndex = () =>
    Promise.all([import("@/features/shell/frame/goToSearchIndex"), import("@/features/shell/frame/products")]).then(([m, p]) =>
      m.fullGoToIndex(p.PRODUCTS, p.PRODUCT_FAMILIES),
    );
  const crumbs: FrameCrumb[] = [
    {
      id: "product",
      label: MARKETING.name,
      icon: MARKETING.icon,
      iconOnly: true,
      href: MARKETING.homeHref,
      door: {
        kind: "products",
        label: "Products",
        newTab: true,
        options: PRODUCTS.map((p) => ({ label: p.name, href: p.homeHref, icon: p.icon, active: p.id === MARKETING.id })),
        loadSearchIndex,
      },
    },
    {
      id: "brands",
      label: "Brands",
      href: brand ? listHref : undefined,
      onSelect: brand ? () => go(listHref) : undefined,
      door: {
        kind: "places",
        label: MARKETING.name,
        options: MARKETING.menu.flatMap((s) =>
          s.items.map((i) => ({ label: i.label, href: i.href ?? `${MARKETING.homeHref}/${i.id}`, icon: i.icon, active: i.id === "brands" })),
        ),
        loadSearchIndex,
      },
    },
    ...(brand
      ? [
          {
            id: "brand",
            label: brand.name,
            door: {
              kind: "siblings" as const,
              label: "Brands",
              options: rows.map((r) => ({
                label: r.name,
                href: hrefFor({ brand: r.id }),
                active: r.id === brand.id,
                onSelect: () => go(hrefFor({ brand: r.id })),
              })),
              allHref: listHref,
              allLabel: `All ${rows.length} brands`,
            },
          },
        ]
      : []),
  ];

  // ── Star: the platform's one favourites store, keyed by this exact address.
  const here = brand ? hrefFor({ brand: brand.id, tab: null }) : listHref;
  const favItem = { id: here, kind: "nav" as const, label: brand ? brand.name : "Brands", href: here };
  const favorite = { starred: prefsKnown && pinned.isPinned(here), known: prefsKnown, onToggle: () => pinned.toggle(favItem) };

  // ── "…": every action of the page.
  const pageUrl = () => (typeof window === "undefined" ? here : `${window.location.origin}${here}`);
  const toggle = (k: keyof typeof bands): DenseAction => ({
    id: `band-${k}`,
    group: "Demo bands",
    label: `${bands[k] ? "Hide" : "Show"} ${k === "intro" ? "intro" : k} band`,
    icon: PanelTop,
    onSelect: () => setBands((b) => ({ ...b, [k]: !b[k] })),
  });
  const common: DenseAction[] = [
    { id: "copy", group: "Page", label: "Copy link", icon: Copy, onSelect: () => void copyText(pageUrl()) },
    { id: "tab", group: "Page", label: "Open in new tab", icon: ExternalLink, onSelect: () => openOutbound(pageUrl(), "_blank", "noopener,noreferrer") },
    { id: "refresh", group: "Page", label: "Refresh data", icon: RefreshCw, onSelect: reload },
  ];
  const actions: DenseAction[] = brand
    ? [
        ...common,
        { id: "real", group: "Page", label: "Open the brand page", icon: LayoutDashboard, onSelect: () => goOut(marketingRoutes.brand(brand.id)) },
        { id: "identity", group: "Brand", label: "Edit identity", icon: Tags, onSelect: () => goOut(marketingRoutes.brandIdentity(brand.id)) },
        { id: "site", group: "Brand", label: "Add website", icon: Globe2, onSelect: () => goOut(marketingRoutes.newSite(brand.id)) },
        { id: "enrich", group: "Brand", label: "Find more with AI", icon: ScanSearch, onSelect: () => goOut(marketingRoutes.smartAddEnrich(brand.id)) },
        { id: "add", group: "Create", label: "Add brand", icon: Plus, onSelect: () => openCreate({ onWindowClose: reload }) },
        toggle("intro"),
        toggle("figures"),
        toggle("tabs"),
      ]
    : [
        ...common,
        { id: "real", group: "Page", label: "Open the real list", icon: LayoutDashboard, onSelect: () => goOut(marketingRoutes.brandsAll()) },
        { id: "add", group: "Create", label: "Add brand", icon: Plus, onSelect: () => openCreate({ onWindowClose: reload }) },
        { id: "smart", group: "Create", label: "Smart add from a link", icon: ScanSearch, onSelect: () => goOut(marketingRoutes.smartAddBrand()) },
        toggle("figures"),
        toggle("tabs"),
      ];

  const primary = brand ? (
    <Button variant="outline" icon={<Globe2 />} collapse="container" aria-label="Add website" onClick={() => goOut(marketingRoutes.newSite(brand.id))}>
      Add website
    </Button>
  ) : (
    <Button variant="primary" icon={<Plus />} collapse="container" aria-label="Add brand" onClick={() => openCreate({ onWindowClose: reload })}>
      Add brand
    </Button>
  );

  const loading = read.state === "loading";
  const sum = (f: (r: BrandBrowseRow) => number) => rows.reduce((n, r) => n + f(r), 0);
  const pick = (t: RecordTab) => () => go(hrefFor({ tab: t === "overview" ? null : t }));

  let figures: DenseFigure[];
  let tabs: DenseTab[];
  let intro: Parameters<typeof DensePageTop>[0]["intro"];
  if (brand) {
    const ready = brand.sites.filter((s) => s.initialized_at).length;
    figures = [
      { id: "sites", label: "Websites set up", value: ready, sub: `of ${brand.sites.length}`, tone: ready < brand.sites.length ? "warn" : "neutral", onSelect: pick("websites") },
      { id: "social", label: "Social tracked", value: brand.social_tracked_count, sub: `of ${brand.social_count}`, onSelect: pick("socials") },
      { id: "assets", label: "Assets", value: brand.asset_count, onSelect: pick("assets") },
      { id: "facts", label: "Facts", value: brand.fact_count, onSelect: pick("facts") },
      { id: "review", label: "To review", value: brand.pending_discovered, tone: brand.pending_discovered > 0 ? "warn" : "neutral", onSelect: pick("inbox") },
      { id: "updated", label: "Updated", value: ago(brand.updated_at) },
    ];
    tabs = [
      { value: "overview", label: "Overview", icon: LayoutDashboard },
      { value: "websites", label: "Websites", icon: Globe2, count: brand.sites.length },
      { value: "socials", label: "Socials", icon: Share2, count: brand.social_count },
      { value: "assets", label: "Assets", icon: Boxes, count: brand.asset_count },
      { value: "facts", label: "Facts", icon: Lightbulb, count: brand.fact_count },
      { value: "inbox", label: "Inbox", icon: Inbox, count: brand.pending_discovered, attention: true },
    ];
    const primarySite = brand.sites[0];
    intro = {
      mark: <SiteIcon site={primarySite?.domain ?? null} iconUrl={brand.favicon_url ?? brand.logo_url ?? primarySite?.favicon_url} size={20} />,
      lead: brand.description || undefined,
      facts: [
        <span key="s" className="flex items-center gap-1.5">
          <StatusDot tone={statusTone(brand.status)} />
          {brand.status}
        </span>,
        brand.industry ?? "No industry",
        primarySite ? <UrlValue key="u" url={`https://${primarySite.domain}`} owner={brand.name} /> : "No website",
        <RecordId key="id" value={brand.id} label="Brand" />,
      ],
    };
  } else {
    figures = [
      { id: "brands", label: "Brands", value: loading ? null : rows.length },
      { id: "active", label: "Active", value: rows.filter((r) => r.status === "active").length },
      { id: "sites", label: "Websites", value: sum((r) => r.sites.length) },
      { id: "social", label: "Social", value: sum((r) => r.social_count), sub: `${sum((r) => r.social_tracked_count)} tracked` },
      { id: "assets", label: "Assets", value: sum((r) => r.asset_count) },
      { id: "facts", label: "Facts", value: sum((r) => r.fact_count) },
      { id: "review", label: "To review", value: sum((r) => r.pending_discovered), tone: sum((r) => r.pending_discovered) > 0 ? "warn" : "neutral" },
    ];
    // Value = the section's NAME: two marketing sections share an address today (Sites → /marketing/brands).
    tabs = MARKETING_WORKSPACE_ROUTES.map((m) => ({ value: m.name, label: m.name, icon: m.icon, count: m.name === "Brands" && !loading ? rows.length : undefined }));
    intro = undefined;
  }

  const failed = read.state === "failed";
  return (
    <DensePageTop
      crumbs={crumbs}
      favorite={favorite}
      actions={actions}
      primary={primary}
      intro={bands.intro ? intro : undefined}
      figures={bands.figures && !failed ? figures : undefined}
      figuresLoading={loading}
      tabs={bands.tabs ? tabs : undefined}
      activeTab={brand ? tab : "Brands"}
      onTabChange={(v) => {
        if (brand) return pick(v as RecordTab)();
        const section = MARKETING_WORKSPACE_ROUTES.find((m) => m.name === v);
        if (section && v !== "Brands") goOut(section.href);
      }}
    >
      {failed ? (
        <div className="p-6">
          <EmptyState
            icon={<RefreshCw />}
            title="Your brands could not be read"
            line={
              <>
                {read.message} <ErrorAlchemyMenu error={read.message} />
              </>
            }
            action={<Button variant="outline" onClick={reload}>Try again</Button>}
          />
        </div>
      ) : loading ? (
        <div className="p-3">
          <RegionSkeleton shape="rows" count={8} twoLine />
        </div>
      ) : brandId && !brand ? (
        <div className="p-6">
          <EmptyState
            icon={<Tags />}
            title="That brand is not in your list"
            line="It may be archived, or not shared with you."
            action={<Button variant="outline" onClick={() => go(listHref)}>All brands</Button>}
          />
        </div>
      ) : brand ? (
        <BrandBody brand={brand} tab={tab} />
      ) : (
        <BrandTable rows={rows} onOpen={(id) => go(hrefFor({ brand: id }))} onAdd={() => openCreate({ onWindowClose: reload })} />
      )}
    </DensePageTop>
  );
}

function BrandTable({ rows, onOpen, onAdd }: { rows: BrandBrowseRow[]; onOpen: (id: string) => void; onAdd: () => void }) {
  if (rows.length === 0) {
    return (
      <div className="p-6">
        <EmptyState icon={<Tags />} title="No brands yet" line="Add one to start tracking its websites." action={<Button variant="primary" onClick={onAdd}>Add brand</Button>} />
      </div>
    );
  }
  return (
    <Table size="sm">
      <TableHeader>
        <TableRow>
          <TableHead>Brand</TableHead>
          <TableHead className="hidden md:table-cell">Industry</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Sites</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Social</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Assets</TableHead>
          <TableHead className="hidden text-right lg:table-cell">Facts</TableHead>
          <TableHead className="text-right">Review</TableHead>
          <TableHead className="hidden text-right md:table-cell">Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id} data-clickable="" className="whitespace-nowrap" tabIndex={0} onClick={() => onOpen(r.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(r.id)}>
            <TableCell>
              <span className="flex min-w-0 items-center gap-2">
                <SiteIcon site={r.sites[0]?.domain ?? null} iconUrl={r.favicon_url ?? r.sites[0]?.favicon_url} size={16} />
                <span className="truncate font-medium">{r.name}</span>
              </span>
            </TableCell>
            <TableCell className="hidden max-w-48 truncate text-muted-foreground md:table-cell" title={r.industry ?? undefined}>{r.industry ?? "—"}</TableCell>
            <TableCell>
              <span className="flex items-center gap-1.5">
                <StatusDot tone={statusTone(r.status)} />
                {r.status}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">{r.sites.length}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{r.social_count}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{r.asset_count}</TableCell>
            <TableCell className="hidden text-right tabular-nums lg:table-cell">{r.fact_count}</TableCell>
            <TableCell className={r.pending_discovered > 0 ? "text-right tabular-nums text-warning" : "text-right tabular-nums text-muted-foreground"}>
              {r.pending_discovered}
            </TableCell>
            <TableCell className="hidden text-right text-muted-foreground md:table-cell">{ago(r.updated_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const SECTION_ROUTE: Record<Exclude<RecordTab, "overview" | "websites">, { label: string; href: (id: string) => string }> = {
  socials: { label: "Open socials", href: marketingRoutes.brandSocials },
  assets: { label: "Open assets", href: (id) => marketingRoutes.brandAssets(id) },
  facts: { label: "Open identity", href: marketingRoutes.brandIdentity },
  inbox: { label: "Open inbox", href: marketingRoutes.brandDiscovery },
};

function BrandBody({ brand, tab }: { brand: BrandBrowseRow; tab: RecordTab }) {
  const router = useRouter();
  if (tab === "overview") {
    return (
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <PropertyRow label="Name" value={brand.name} />
        <PropertyRow label="Status" value={brand.status} />
        <PropertyRow label="Industry" value={brand.industry} />
        <PropertyRow label="Kind" value={brand.kind} />
        <PropertyRow label="Published to web" value={brand.published_to_web ? "Yes" : "No"} />
        <PropertyRow label="Created" value={new Date(brand.created_at).toLocaleDateString()} />
        <PropertyRow label="Updated" value={ago(brand.updated_at)} />
        <PropertyRow label="Yours" value={brand.is_mine ? "Yes" : brand.in_my_orgs ? "Your organization" : "Shared with you"} />
        <div className="sm:col-span-2 lg:col-span-4">
          <PropertyRow label="Description" value={brand.description} />
        </div>
      </div>
    );
  }
  if (tab === "websites") {
    if (brand.sites.length === 0) {
      return (
        <div className="p-6">
          <EmptyState icon={<Globe2 />} title="No websites yet" action={<Button variant="primary" onClick={() => router.push(marketingRoutes.newSite(brand.id))}>Add website</Button>} />
        </div>
      );
    }
    return (
      <Table size="sm">
        <TableHeader>
          <TableRow>
            <TableHead>Website</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="text-right">Set up</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {brand.sites.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <SiteIcon site={s.domain} iconUrl={s.favicon_url} size={16} />
                  <span className="truncate font-medium">{s.name ?? s.domain}</span>
                </span>
              </TableCell>
              <TableCell>
                <UrlValue url={`https://${s.domain}`} owner={brand.name} />
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{s.initialized_at ? ago(s.initialized_at) : "Not yet"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }
  const section = SECTION_ROUTE[tab];
  return (
    <div className="p-6">
      <EmptyState
        icon={<ExternalLink />}
        title="This section lives on its own page"
        action={<Button variant="outline" onClick={() => router.push(section.href(brand.id))}>{section.label}</Button>}
      />
    </div>
  );
}
