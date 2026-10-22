"use client";

// /demos/page-top-sharp — the ui-sharp entry in the page-top bake-off.
//
// The top of every page, on a REAL record: one of your brands (read through the same enriched
// read /marketing/brands/all uses). Path row (always) · tabs row · intro band · numbers band,
// each optional — the toggles above the frame turn them on and off so every combination can be
// judged. Every door, star, action, tab, number and row opens the real place it names.
//
// References, named: Vercel's dashboard (scope bar + sticky project tabs), GitHub's repository
// tabs (counts, sideways scroll on a phone), Stripe's customer page (one intro band, one row of
// numbers that open their sets).
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { stringUrlCodec, useUrlState } from "@ai-matrx/kit/url-state";
import {
  ArrowUpRight,
  Building2,
  Copy,
  ExternalLink,
  Globe2,
  Plus,
  Settings2,
  Store,
  WandSparkles,
} from "lucide-react";
import { Badge, Button, EmptyState, PropertyRow, RegionSkeleton, Switch } from "@ai-matrx/design-system/controls";
import { RecordId, SiteIcon } from "@ai-matrx/design-system";
import { cn } from "@ai-matrx/design-system/cn";
import { copyText } from "@ai-matrx/kit/clipboard";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPreferencesLoadStatus } from "@/lib/redux/preferences/userPreferenceSelectors";
import { usePinned } from "@/components/favorites/usePinned";
import { PRODUCTS, PRODUCT_FAMILIES, productById } from "@/features/shell/frame/products";
import type { FrameCrumbDoor } from "@/features/shell/frame/types";
import { resolveShellIconName, shellIconComponents } from "@/features/shell/shellIconMap";
import { MARKETING_WORKSPACE_ROUTES } from "@/features/marketing/components/shared/MarketingWorkspaceNav";
import { listBrandRows, type BrandBrowseRow } from "@/features/marketing/components/brands/browse/service";
import { useOpenCreateBrandWindow } from "@/features/overlays/definitions/createBrandWindow.overlay";
import { marketingSeg } from "@/features/marketing/lib/keys";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { PathRow, type PathAction } from "./PathRow";
import { TabsRow } from "./TabsRow";
import { IntroBand, NumbersBand, type SummaryNumber } from "./IntroBands";
import { brandTabs, isBrandTabId, type BrandTab, type BrandTabId } from "./brandTabs";

type Read =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "ready"; brands: BrandBrowseRow[] };

type Bands = { tabs: boolean; intro: boolean; numbers: boolean };

const loadSearchIndex = () =>
  import("@/features/shell/frame/goToSearchIndex").then((m) => m.fullGoToIndex(PRODUCTS, PRODUCT_FAMILIES, []));

export function PageTopSharpDemo() {
  const phone = useIsMobile();
  const [brandParam, setBrandParam] = useUrlState("brand", stringUrlCodec(""));
  const [tabParam, setTabParam] = useUrlState("tab", stringUrlCodec(""));
  const [read, setRead] = useState<Read>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [bands, setBands] = useState<Bands>({ tabs: true, intro: true, numbers: true });

  useEffect(() => {
    let live = true;
    listBrandRows("active")
      .then((brands) => {
        if (live) setRead({ status: "ready", brands });
      })
      .catch((error: unknown) => {
        console.error("[page-top-sharp] the brand list failed to load", error);
        if (live) setRead({ status: "failed", message: error instanceof Error ? error.message : "The brand list did not load." });
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  const brands = read.status === "ready" ? read.brands : [];
  const wanted = brandParam;
  const brand = brands.find((b) => b.id === wanted || marketingSeg(b) === wanted) ?? brands[0] ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-textured">
      <DemoBar bands={bands} onBands={setBands} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border">
        {read.status === "loading" ? (
          <LoadingTop phone={phone} />
        ) : read.status === "failed" ? (
          <div className="p-6">
            <EmptyState
              icon={<Building2 />}
              title="Your brands did not load"
              line={read.message}
              action={<Button variant="outline" onClick={() => {
                    setRead({ status: "loading" });
                    setAttempt((n) => n + 1);
                  }}>Try again</Button>}
            />
          </div>
        ) : brand == null ? (
          <NoBrands />
        ) : (
          <BrandPageTop
            key={brand.id}
            phone={phone}
            brand={brand}
            brands={brands}
            bands={bands}
            tabParam={tabParam || null}
            onTab={(t) => setTabParam(t)}
            onBrand={(b) => setBrandParam(marketingSeg(b))}
          />
        )}
      </div>
    </div>
  );
}

/** The judge's toggles — outside the page top, never part of it. */
function DemoBar({ bands, onBands }: { bands: Bands; onBands: (b: Bands) => void }) {
  const items: { key: keyof Bands; label: string }[] = [
    { key: "tabs", label: "Tabs" },
    { key: "intro", label: "Intro" },
    { key: "numbers", label: "Numbers" },
  ];
  return (
    <div className="flex h-9 shrink-0 items-center gap-4 overflow-x-auto px-4">
      <span className="type-meta shrink-0 text-muted-foreground">Bands</span>
      {items.map((i) => (
        <label key={i.key} className="type-secondary flex shrink-0 items-center gap-2 text-foreground">
          <Switch checked={bands[i.key]} onCheckedChange={(v) => onBands({ ...bands, [i.key]: v })} aria-label={i.label} />
          {i.label}
        </label>
      ))}
    </div>
  );
}

function LoadingTop({ phone }: { phone: boolean }) {
  return (
    <div aria-busy className="flex flex-col bg-card">
      <div className={cn("flex items-center gap-2 border-b border-border px-3", phone ? "h-12" : "h-11")}>
        <span className="h-4 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="px-4 py-4">
        <RegionSkeleton shape="rows" count={2} twoLine />
      </div>
      <div className="h-10 border-b border-border px-4">
        <span className="mt-3 block h-4 w-80 max-w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

function NoBrands() {
  const openCreate = useOpenCreateBrandWindow();
  return (
    <div className="p-6">
      <EmptyState
        icon={<Building2 />}
        title="No brands yet"
        line="Add one to see its page top here."
        action={<Button variant="primary" icon={<Plus />} onClick={() => openCreate()}>Add brand</Button>}
      />
    </div>
  );
}

function BrandPageTop({
  phone,
  brand,
  brands,
  bands,
  tabParam,
  onTab,
  onBrand,
}: {
  phone: boolean;
  brand: BrandBrowseRow;
  brands: readonly BrandBrowseRow[];
  bands: Bands;
  tabParam: string | null;
  onTab: (t: BrandTabId) => void;
  onBrand: (b: BrandBrowseRow) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const go = (href: string) => startTransition(() => router.push(href));
  const openCreate = useOpenCreateBrandWindow();
  const seg = marketingSeg(brand);
  const brandPath = marketingRoutes.brand(seg);
  const tabs = brandTabs(brandPath);
  const tab: BrandTabId = isBrandTabId(tabParam, tabs) ? tabParam : "overview";
  const current = tabs.find((t) => t.id === tab) ?? tabs[0];

  // The star IS a pin on the person's one favourites store: starring pins the brand's real page.
  const pinned = usePinned();
  const known = useAppSelector(selectPreferencesLoadStatus) === "loaded";
  const favorite = {
    starred: known && pinned.isPinned(brandPath),
    known,
    onToggle: () => {
      if (known) pinned.toggle({ id: brandPath, kind: "nav", label: brand.name, href: brandPath });
    },
  };

  const marketing = productById("marketing") ?? PRODUCTS[0];
  const productDoor: FrameCrumbDoor = {
    kind: "products",
    label: "Products",
    newTab: true,
    options: PRODUCTS.map((p) => ({ label: p.name, href: p.homeHref, icon: p.icon, active: p.id === marketing.id })),
    loadSearchIndex,
  };
  const placesDoor: FrameCrumbDoor = {
    kind: "places",
    label: marketing.name,
    options: MARKETING_WORKSPACE_ROUTES.map((r) => ({ label: r.name, href: r.href, icon: r.icon, active: r.name === "Brands" })),
    loadSearchIndex,
  };
  const brandsDoor: FrameCrumbDoor = {
    kind: "siblings",
    label: "Brands",
    options: brands.map((b) => ({ label: b.name, href: marketingRoutes.brand(marketingSeg(b)), active: b.id === brand.id, onSelect: () => onBrand(b) })),
    allHref: marketingRoutes.brandsAll(),
    allLabel: "All brands",
  };

  const absolute = () => new URL(brandPath, window.location.origin).toString();
  const actions: PathAction[] = [
    { id: "open", group: "This page", label: "Open brand page", icon: ArrowUpRight, onSelect: () => go(brandPath) },
    { id: "new-tab", group: "This page", label: "Open in new tab", icon: ExternalLink, onSelect: () => openOutbound(absolute(), "_blank", "noopener") },
    {
      id: "copy",
      group: "This page",
      label: "Copy link",
      icon: Copy,
      onSelect: () => void copyText(absolute()).then(() => toast.success("Link copied")),
    },
    { id: "site", group: "Brand", label: "Add a website", icon: Globe2, onSelect: () => go(marketingRoutes.newSite(brand.id)) },
    { id: "enrich", group: "Brand", label: "Fill in with Smart Add", icon: WandSparkles, onSelect: () => go(marketingRoutes.smartAddEnrich(brand.id)) },
    { id: "offerings", group: "Brand", label: "Products & services", icon: Store, onSelect: () => go(marketingRoutes.brandOfferings(seg)) },
    { id: "settings", group: "Brand", label: "Brand settings", icon: Settings2, onSelect: () => go(marketingRoutes.brandValueSettings(seg)) },
    { id: "add", group: "Brands", label: "Add brand", icon: Plus, onSelect: () => openCreate() },
  ];

  // Where the primary act lives: the intro band; else the tabs row's end; else the path row's end.
  const primaryAct = (
    <Button variant="primary" icon={<ArrowUpRight />} asChild>
      <a href={brandPath}>Open brand</a>
    </Button>
  );

  // The tabs row shows the primary act once the intro band has scrolled out of view.
  const scroller = useRef<HTMLDivElement>(null);
  const introEnd = useRef<HTMLDivElement>(null);
  const [introGone, setIntroGone] = useState(false);
  useEffect(() => {
    const root = scroller.current;
    const mark = introEnd.current;
    if (!root || !mark) return;
    const io = new IntersectionObserver(([e]) => setIntroGone(!e.isIntersecting), { root, threshold: 0 });
    io.observe(mark);
    return () => io.disconnect();
  }, [bands.intro, bands.numbers]);

  const primary = website(brand);
  const numbers: SummaryNumber[] = [
    { id: "sites", label: "Websites", value: brand.sites.length, href: `${brandPath}/websites` },
    {
      id: "socials",
      label: "Social accounts",
      value: brand.social_count,
      hint: brand.social_count > 0 ? `${brand.social_tracked_count} tracked` : undefined,
      href: `${brandPath}/socials/accounts`,
    },
    { id: "assets", label: "Assets", value: brand.asset_count, href: marketingRoutes.brandAssets(seg) },
    { id: "facts", label: "Facts", value: brand.fact_count, href: marketingRoutes.brandIdentity(seg) },
    {
      id: "review",
      label: "To review",
      value: brand.pending_discovered,
      tone: brand.pending_discovered > 0 ? "warn" : "neutral",
      href: marketingRoutes.brandDiscovery(seg),
      title: "Pages and accounts found for this brand that wait for your yes or no.",
    },
  ];

  const counts: Partial<Record<BrandTabId, number>> = {
    websites: brand.sites.length,
    socials: brand.social_count,
  };

  return (
    <>
      <PathRow
        phone={phone}
        product={marketing}
        productDoor={productDoor}
        levels={[{ label: "Brands", href: marketingRoutes.brandsAll(), door: placesDoor }]}
        title={brand.name}
        titleDoor={brandsDoor}
        favorite={favorite}
        actions={actions}
        onBack={() => router.back()}
        end={!bands.intro && !bands.tabs ? primaryAct : undefined}
      />
      <div ref={scroller} data-matrx-page-scroll="" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {bands.intro ? (
          <IntroBand
            phone={phone}
            site={primary}
            iconUrl={brand.favicon_url ?? brand.logo_url}
            description={brand.description}
            primary={primaryAct}
            facts={[
              ...(primary
                ? [
                    {
                      id: "site",
                      node: (
                        <OutboundLink
                          href={`https://${primary}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-foreground hover:underline"
                        >
                          {primary}
                        </OutboundLink>
                      ),
                    },
                  ]
                : []),
              ...(brand.industry ? [{ id: "industry", node: <span className="truncate">{brand.industry}</span> }] : []),
              { id: "status", node: <Badge tone={brand.status === "active" ? "success" : "neutral"}>{brand.status}</Badge> },
              ...(brand.published_to_web ? [{ id: "public", node: <Badge tone="info">Public</Badge> }] : []),
              { id: "updated", node: <span>Updated {new Date(brand.updated_at).toLocaleDateString()}</span> },
            ]}
          />
        ) : null}
        {bands.numbers ? <NumbersBand phone={phone} numbers={numbers} loading={false} /> : null}
        <div ref={introEnd} aria-hidden className="h-px" />
        {bands.tabs ? (
          <TabsRow
            phone={phone}
            label={`${brand.name} sections`}
            value={tab}
            onValueChange={onTab}
            items={tabs.map((t) => ({ value: t.id, label: t.label, count: counts[t.id] ?? null }))}
            end={bands.intro ? primaryAct : undefined}
            showEnd={introGone}
          />
        ) : null}
        <TabBody phone={phone} brand={brand} tab={bands.tabs ? current : null} tabs={tabs} />
      </div>
    </>
  );
}

function website(brand: BrandBrowseRow): string | null {
  const domain = brand.sites[0]?.domain;
  if (domain) return domain;
  if (!brand.website_url) return null;
  try {
    return new URL(brand.website_url).hostname;
  } catch {
    return brand.website_url;
  }
}

/** What sits under the page top: the chosen tab's real sections (or every section, without tabs). */
function TabBody({ phone, brand, tab, tabs }: { phone: boolean; brand: BrandBrowseRow; tab: BrandTab | null; tabs: readonly BrandTab[] }) {
  const groups = tab ? [tab] : tabs;
  return (
    <div className={cn("flex flex-col gap-6", phone ? "px-3 py-4" : "px-4 py-5")}>
      {tab?.id === "overview" || !tab ? <Profile brand={brand} /> : null}
      {tab?.id === "websites" ? <Sites brand={brand} /> : null}
      {groups.map((g) => (
        <section key={g.id} aria-label={g.label} className="flex flex-col">
          {!tab ? <h2 className="type-label pb-1 text-muted-foreground">{g.label}</h2> : null}
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
            {g.sections.map((s) => {
              const Icon = shellIconComponents[resolveShellIconName(s.iconName)];
              const soon = "status" in s && s.status === "coming-soon";
              return (
                <li key={s.href}>
                  <a href={s.href} data-clickable="" className="flex min-h-11 items-center gap-3 px-3 py-2 outline-none hover:bg-accent focus-visible:bg-accent">
                    <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="type-body truncate text-foreground">{s.name}</span>
                      {!phone ? <span className="type-meta truncate text-muted-foreground">{s.description}</span> : null}
                    </span>
                    {soon ? <Badge>Soon</Badge> : null}
                    <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Profile({ brand }: { brand: BrandBrowseRow }) {
  return (
    <section aria-label="Profile" className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-border bg-card p-3 sm:grid-cols-3">
      <PropertyRow label="Website" value={website(brand) ?? undefined} missing />
      <PropertyRow label="Industry" value={brand.industry ?? undefined} missing />
      <PropertyRow label="Kind" value={brand.kind} />
      <PropertyRow label="On the web" value={brand.published_to_web ? "Published" : "Not published"} />
      <PropertyRow label="Created" value={new Date(brand.created_at).toLocaleDateString()} />
      <PropertyRow label="Brand ID">
        <RecordId value={brand.id} label="Brand" />
      </PropertyRow>
    </section>
  );
}

function Sites({ brand }: { brand: BrandBrowseRow }) {
  if (brand.sites.length === 0) {
    return (
      <EmptyState
        icon={<Globe2 />}
        title="No websites yet"
        action={
          <Button variant="outline" icon={<Plus />} asChild>
            <a href={marketingRoutes.newSite(brand.id)}>Add a website</a>
          </Button>
        }
      />
    );
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
      {brand.sites.map((s) => (
        <li key={s.id} className="flex min-h-11 items-center gap-3 px-3 py-2">
          <SiteIcon site={s.domain} iconUrl={s.favicon_url} size={16} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="type-body truncate text-foreground">{s.name || s.domain}</span>
            <span className="type-meta truncate text-muted-foreground">{s.domain}</span>
          </span>
          {s.initialized_at ? null : <Badge tone="warning">Setting up</Badge>}
          <Button
            variant="quiet"
            icon={<ExternalLink />}
            aria-label={`Visit ${s.domain}`}
            onClick={() => openOutbound(`https://${s.domain}`, "_blank", "noopener,noreferrer")}
          />
        </li>
      ))}
    </ul>
  );
}
