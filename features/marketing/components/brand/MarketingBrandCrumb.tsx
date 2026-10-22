"use client";

/**
 * The brand workspace's one piece of chrome — the FULL breadcrumb concept the
 * org/scope tier already ships (`features/scopes/components/pages/ScopeBreadcrumb`):
 * EVERY level is a switcher, not just the brand.
 *
 *   Marketing › <brand> ▾ › <section> ▾ › <site> ▾ › <site view> ▾
 *
 * It injects into the shell header as a FALLBACK portal (`<PageHeader fallback>`),
 * which is the same mounting contract `ScopesRouteHeader` uses at the org tier:
 * a page that mounts its own `RouteHeader` (the brand cockpit, the asset desk,
 * the discovery inbox) wins and this row hides itself, so no route ever shows
 * two headers. Everything else — the identity rooms, locations, settings — gets
 * a real trail instead of an anonymous page.
 *
 * Every dropdown answers "what else could I be looking at right here?" without
 * leaving the room: siblings of the CURRENT level, current one checked, each
 * one landing on the SAME kind of screen for the sibling. Brand switching
 * preserves the route via `lib/brand-switch.ts`; site switching preserves the
 * branch AND the section via the route-section suffix helpers.
 *
 * On mobile the whole trail collapses to one trigger opening a bottom sheet
 * listing every level and its siblings as tappable rows — the same navigator
 * the scope system's `MobileBreadcrumbDrawer` gives the org tier.
 *
 * Links are built with `marketingRoutes` + `marketingSeg` and may carry UUIDs;
 * the brand/site layouts canonicalize them to the key address.
 */

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, Check, ChevronDown, ChevronRight, Fingerprint, Landmark, MoreHorizontal, Pencil, ScanSearch, Swords } from "lucide-react";
import { useDeclareFrameActions, useDeclareFrameCrumbs } from "@/features/shell/frame-host/framePageHeader";
import { BrandArchiveFlow } from "@/features/marketing/components/brands/BrandArchiveFlow";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import PageHeader from "@/features/shell/components/header/PageHeader";
import { resolveActiveRouteMode } from "@/features/shell/components/header/route-mode-match";
import { useMarketingBrand } from "@/features/marketing/lib/brand-context";
import { listMarketingBrandModes } from "@/features/marketing/lib/brand-sections";
import {
  brandKindCopy,
  brandKindOf,
  brandNavLabel,
  type BrandRoom,
} from "@/features/marketing/lib/brand-kind";
import { researchInitHref } from "@/features/research/utils/init-route";
import {
  listMarketingSeoModes,
  listMarketingWebsiteModes,
  marketingSeoSectionSuffix,
  marketingWebsiteSectionSuffix,
} from "@/features/marketing/lib/route-sections";
import { marketingSeg } from "@/features/marketing/lib/keys";
import {
  useAllBrandOptions,
  useBrandSites,
} from "@/features/marketing/data/hooks";
import { brandSwitchHref } from "@/features/marketing/lib/brand-switch";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { cn } from "@/lib/utils";

const CRUMB_LINK =
  "max-w-[10rem] truncate text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline sm:max-w-[14rem]";

/** One selectable sibling inside a level's dropdown / drawer section. */
interface CrumbOption {
  label: string;
  href: string;
  active?: boolean;
}

/** Normalized crumb consumed by both the desktop row and the mobile drawer. */
interface CrumbLevel {
  key: string;
  label: string;
  /** Where the crumb's TEXT navigates (the level itself). */
  href?: string;
  options?: CrumbOption[];
  /** Header shown above the options list ("Brands", "Sites", …). */
  optionsLabel?: string;
  isCurrent?: boolean;
}

/** The shared shape of a website-branch and an SEO-branch mode. */
interface SiteViewMode {
  slug: string;
  name: string;
  href: string;
  exact?: boolean;
}

function OptionsMenu({
  triggerAriaLabel,
  headerLabel,
  options,
}: {
  triggerAriaLabel: string;
  headerLabel?: string;
  options: CrumbOption[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={triggerAriaLabel}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/70 transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[13rem] max-w-[20rem]"
      >
        {headerLabel ? (
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {headerLabel}
          </DropdownMenuLabel>
        ) : null}
        <div className="max-h-[60dvh] overflow-y-auto">
          {options.map((option) => (
            <DropdownMenuItem
              key={option.href}
              asChild
              className={cn(option.active && "bg-accent/60")}
            >
              <Link href={option.href} className="flex items-center gap-2">
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    option.active ? "text-primary opacity-100" : "opacity-0",
                  )}
                  aria-hidden
                />
                <span className="truncate">{option.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopCrumb({ level }: { level: CrumbLevel }) {
  const text = level.href ? (
    <Link
      href={level.href}
      title={level.label}
      aria-current={level.isCurrent ? "page" : undefined}
      className={cn(
        CRUMB_LINK,
        level.isCurrent && "font-medium text-foreground",
      )}
    >
      {level.label}
    </Link>
  ) : (
    <span
      aria-current={level.isCurrent ? "page" : undefined}
      className={cn(
        "max-w-[10rem] truncate sm:max-w-[14rem]",
        level.isCurrent
          ? "font-medium text-foreground"
          : "text-muted-foreground",
      )}
    >
      {level.label}
    </span>
  );

  if (!level.options || level.options.length === 0) return text;
  return (
    <span className="flex min-w-0 items-center gap-0.5">
      {text}
      <OptionsMenu
        triggerAriaLabel={level.optionsLabel ?? `Switch ${level.label}`}
        headerLabel={level.optionsLabel}
        options={level.options}
      />
    </span>
  );
}

/** Bottom-sheet navigator: every level and its siblings, all tappable. */
function MobileCrumbDrawer({ levels }: { levels: CrumbLevel[] }) {
  const current = levels[levels.length - 1];
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          aria-label="Navigate"
          className="inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent/60 active:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className="max-w-[55vw] truncate">{current?.label ?? ""}</span>
          <MoreHorizontal
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-base">Navigate</DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          {levels.map((level) => {
            const rows: CrumbOption[] =
              level.options && level.options.length > 0
                ? level.options
                : level.href
                  ? [{ href: level.href, label: level.label, active: true }]
                  : [];
            if (rows.length === 0) return null;
            return (
              <div key={level.key} className="border-t border-border/60 py-1">
                <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {level.optionsLabel ?? level.label}
                </p>
                {rows.map((row) => (
                  <DrawerClose asChild key={row.href}>
                    <Link
                      href={row.href}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-base hover:bg-accent active:bg-accent",
                        row.active && "bg-accent/50",
                      )}
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          row.active ? "text-primary opacity-100" : "opacity-0",
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{row.label}</span>
                    </Link>
                  </DrawerClose>
                ))}
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function MarketingBrandCrumb() {
  const brand = useMarketingBrand();
  const router = useRouter();
  const pathname = usePathname() ?? marketingRoutes.brand(brand.seg);
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();

  const segments = pathname.split("/").filter(Boolean);
  // ["marketing", "<brandSeg>", "<sectionSeg>", "<sub>", …]
  const sectionSeg = segments[2] ?? "";
  const branch =
    sectionSeg === "websites" || sectionSeg === "seo" ? sectionSeg : null;
  // A site branch only has a SITE level once the address names one.
  const siteSeg = branch ? segments[3] : undefined;

  const brandPath = marketingRoutes.brand(brand.seg);

  // access-errors: ok — sibling-brand switcher; a failed read only shrinks the
  // dropdown, and the brand itself is already resolved by the layout.
  // EVERY readable brand, across orgs — brands can span organizations and the
  // switcher must never silently trim to one (Arman, 2026-08-30).
  const brandOptions = useAllBrandOptions();
  // Only fetched inside a site branch (an empty id disables the query).
  const brandSites = useBrandSites(siteSeg ? brand.id : "");

  // ── Section level ──────────────────────────────────────────────────────
  const brandModes = listMarketingBrandModes(brandPath);
  const sectionCandidates = brandModes.filter(
    (mode) => mode.slug === sectionSeg,
  );
  const activeMode =
    sectionCandidates.find((mode) => mode.subPath === segments[3]) ??
    sectionCandidates[0];
  const sectionOptions: CrumbOption[] = brandModes.map((mode) => ({
    label: brandNavLabel(brandKindOf(brand), mode),
    href: mode.href,
    active: mode === activeMode,
  }));

  // ── Site level ─────────────────────────────────────────────────────────
  const siteRows = brandSites.data ?? [];
  const currentSite = siteSeg
    ? siteRows.find(
        (row) => row.id === siteSeg || marketingSeg(row) === siteSeg,
      )
    : undefined;
  const sitePathFor = (seg: string) =>
    branch === "seo"
      ? marketingRoutes.seoSite(brand.seg, seg)
      : marketingRoutes.website(brand.seg, seg);
  const currentSitePath = siteSeg ? sitePathFor(siteSeg) : "";
  const sectionSuffix = !siteSeg
    ? ""
    : branch === "seo"
      ? marketingSeoSectionSuffix(pathname, currentSitePath)
      : marketingWebsiteSectionSuffix(pathname, currentSitePath);
  const siteOptions: CrumbOption[] = siteRows.map((row) => {
    const seg = marketingSeg(row);
    return {
      label: row.name ?? row.domain,
      // Same branch, same section, other site.
      href: `${sitePathFor(seg)}${sectionSuffix}`,
      active: seg === siteSeg || row.id === siteSeg,
    };
  });

  // ── Site view level (the branch's own sections) ────────────────────────
  const siteViewModes: SiteViewMode[] = !siteSeg
    ? []
    : branch === "seo"
      ? listMarketingSeoModes(currentSitePath)
      : listMarketingWebsiteModes(currentSitePath);
  const activeSiteView = siteSeg
    ? resolveActiveRouteMode(siteViewModes, pathname)
    : undefined;

  const levels: CrumbLevel[] = [
    { key: "marketing", label: "Marketing", href: marketingRoutes.home() },
    // EVERY CRUMB IS A DOOR (Arman, 2026-10-22: "[Marketing LOGO] > Brands v > Vasaro v"): the brands
    // list is a level of its own, so the brand sits under it as its URL will.
    { key: "brands", label: "Brands", href: marketingRoutes.brandsAll() },
    {
      key: "brand",
      label: brand.name,
      href: brandPath,
      optionsLabel: "Brands",
      options:
        (brandOptions.data ?? []).length > 1
          ? (brandOptions.data ?? []).map((row) => {
              const active = row.id === brand.id;
              return {
                label: row.name,
                // Same route, new brand (degraded only where the path was
                // entity-scoped) — lib/brand-switch.ts.
                href: active
                  ? brandPath
                  : brandSwitchHref(
                      marketingSeg(row),
                      pathname,
                      searchParams.toString(),
                    ),
                active,
              };
            })
          : undefined,
    },
  ];

  if (activeMode && activeMode.slug) {
    levels.push({
      key: "section",
      label: brandNavLabel(brandKindOf(brand), activeMode),
      href: activeMode.href,
      optionsLabel: "Sections",
      options: sectionOptions,
    });
  }

  if (siteSeg) {
    levels.push({
      key: "site",
      label: currentSite?.name ?? currentSite?.domain ?? "Site",
      href: currentSitePath,
      optionsLabel: "Sites",
      options: siteOptions.length > 0 ? siteOptions : undefined,
    });
    if (activeSiteView) {
      levels.push({
        key: "site-view",
        label: activeSiteView.name,
        href: activeSiteView.href,
        optionsLabel: branch === "seo" ? "SEO views" : "Website views",
        options: siteViewModes.map((mode) => ({
          label: mode.name,
          href: mode.href,
          active: mode.slug === activeSiteView.slug,
        })),
      });
    }
  }

  // ── Identity room level (Strategy, Voice, Audience…) ───────────────────
  if (sectionSeg === "identity") {
    const identityPath = marketingRoutes.brandIdentity(brand.seg);
    const assetsPath = marketingRoutes.brandAssets(brand.seg);
    const roomCopy = brandKindCopy(brand).rooms;
    const roomHrefs: Array<[BrandRoom, string]> = [
      ["media", assetsPath],
      ["strategy", `${identityPath}/strategy`],
      ["knowledge", `${identityPath}/knowledge`],
      ["offerings", `${identityPath}/offerings`],
      ["guidelines", `${identityPath}/guidelines`],
      ["messaging", `${identityPath}/messaging`],
      ["claims", `${identityPath}/claims`],
      ["voice", `${identityPath}/voice`],
      [
        "research",
        researchInitHref({ subject: brand.name, returnTo: identityPath }),
      ],
      ["competitors", marketingRoutes.brandCompetitors(brand.seg)],
      ["audience", `${identityPath}/audience`],
      ["story", `${identityPath}/story`],
    ];
    const roomOptions: CrumbOption[] = roomHrefs.map(([room, href]) => ({
      label: roomCopy[room].name,
      href,
      active:
        room === "media"
          ? pathname.startsWith(assetsPath)
          : segments[3] === room,
    }));
    const activeRoom = roomOptions.find((option) => option.active);
    if (activeRoom) {
      levels.push({
        key: "room",
        label: activeRoom.label,
        href: activeRoom.href,
        optionsLabel: "Identity",
        options: roomOptions,
      });
    }
  }

  const lastIndex = levels.length - 1;
  levels[lastIndex] = { ...levels[lastIndex], isCurrent: true };

  // THE NEW APP FRAME draws this trail in its own crumb row (each level a door, siblings checked) —
  // as a FALLBACK, so a page that declares its own header still wins, exactly as in classic. Every
  // level keeps its address; the frame adds the levels below the last one from the address.
  const inFrame = useDeclareFrameCrumbs(
    levels.map((level) => ({ label: level.label, href: level.href, options: level.options, optionsLabel: level.optionsLabel })),
    { fallback: true },
  );
  // "…" HOLDS EVERY ACTION OF THE BRAND LEVEL (Arman, 2026-10-22): the verbs the brands list offers
  // for a brand row (useBrandRowActions), as doors from the brand itself.
  const [archiving, setArchiving] = useState(false);
  useDeclareFrameActions(
    inFrame
      ? [
          { id: "brand:edit", label: "Edit brand", icon: Pencil, onSelect: () => router.push(`${brandPath}/settings`) },
          { id: "brand:enrich", label: "Enrich with Smart Add", icon: ScanSearch, onSelect: () => router.push(marketingRoutes.smartAddEnrich(brand.id)) },
          { id: "brand:competitors", label: "Discover competitors", icon: Swords, onSelect: () => router.push(marketingRoutes.brandCompetitors(brand.seg)) },
          { id: "brand:identity", label: "Brand identity", icon: Fingerprint, onSelect: () => router.push(marketingRoutes.brandIdentity(brand.seg)) },
          { id: "brand:all", label: "All brands", icon: Landmark, onSelect: () => router.push(marketingRoutes.brandsAll()) },
          { id: "brand:archive", label: "Archive brand", icon: Archive, destructive: true, onSelect: () => setArchiving(true) },
        ]
      : null,
  );
  if (inFrame) {
    return (
      <BrandArchiveFlow
        brand={archiving ? { id: brand.id, name: brand.name } : null}
        onCancel={() => setArchiving(false)}
        onDone={() => {
          setArchiving(false);
          router.push(marketingRoutes.brandsAll());
        }}
      />
    );
  }

  return (
    <PageHeader fallback>
      {isMobile ? (
        <nav
          aria-label="Breadcrumb"
          className="flex w-full min-w-0 items-center gap-1 text-sm"
        >
          <MobileCrumbDrawer levels={levels} />
        </nav>
      ) : (
        <nav
          aria-label="Breadcrumb"
          className="flex w-full min-w-0 items-center gap-1 text-sm"
        >
          {levels.map((level, index) => (
            <span
              key={level.key}
              // The root and the current level keep their whole words ("Marketing", "Socials"; the current one
              // may take at most 60% of the row); the MIDDLE levels (the brand's long name) give way first.
              className={cn(
                "flex items-center gap-1",
                index === 0 || index === levels.length - 1
                  ? "shrink-0"
                  : "min-w-0",
                index === levels.length - 1 && index > 0 && "max-w-[60%]",
              )}
            >
              {index > 0 ? (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
                  aria-hidden
                />
              ) : null}
              <DesktopCrumb level={level} />
            </span>
          ))}
        </nav>
      )}
    </PageHeader>
  );
}
