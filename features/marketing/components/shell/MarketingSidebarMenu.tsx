"use client";

/**
 * Marketing's route menu, rendered INSIDE the app shell sidebar in place of the
 * global nav (registered in `features/shell/constants/route-menu-registry.ts`).
 *
 * The agency model gives the menu FOUR states, resolved structurally from the
 * URL (`lib/sidebar-site-context.ts`) and all driven by the same declarations
 * every other marketing map reads — so this menu cannot drift from the hub,
 * the landing, or the drift tests:
 *
 *   • AGENCY  — `MARKETING_PILLARS` (lib/marketing-nav.ts): roster, roll-ups,
 *     operations, tools. Small by design.
 *   • BRAND   — one brand's workspace: `MARKETING_BRAND_SECTIONS`
 *     (lib/brand-sections.ts). Coming-soon sections stay VISIBLE with a tag —
 *     the brand workspace's promised shape is part of the map (Arman,
 *     2026-08-28).
 *   • WEBSITE — one site: its inventory (`MARKETING_WEBSITE_SECTIONS`), its
 *     main SEO rooms listed directly, and its content plan and reputation
 *     (Arman, 2026-10-21: "websites have seo, google search console and
 *     things like that").
 *   • SEO     — the full SEO practice on one site (`MARKETING_SEO_SECTIONS`);
 *     its back row returns to the website.
 *
 * `RouteMenuSlot` owns switching, collapse, the mobile presentation, and the
 * reversible Main Menu control. This component only renders registry data.
 */

import { useEffect, useRef, type ReactNode } from "react";
import NavLink from "@/components/navigation/NavLink";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ListTree,
  Search,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

import { IconResolver } from "@ai-matrx/icons";
import { resolveActiveRouteMode } from "@/features/shell/components/header/route-mode-match";
import {
  ROUTE_MENU_ICON_SIZE,
  ROUTE_MENU_ICON_STROKE_WIDTH,
  ROUTE_MENU_NAV_ITEM_CLASS,
} from "@/features/shell/constants/route-menu-style";
import { MARKETING_PILLARS } from "@/features/marketing/lib/marketing-nav";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { resolveMarketingSidebarContext } from "@/features/marketing/lib/sidebar-site-context";
import {
  getMarketingSeoSection,
  listMarketingSeoModeGroups,
  listMarketingWebsiteModeGroups,
} from "@/features/marketing/lib/route-sections";

import { listMarketingBrandModeGroups } from "@/features/marketing/lib/brand-sections";
import {
  arrangeBrandNav,
  brandKindOf,
  brandNavLabel,
} from "@/features/marketing/lib/brand-kind";
import {
  MARKETING_SEO_SECTION_ICONS,
  MARKETING_WEBSITE_SECTION_ICONS,
} from "@/features/marketing/lib/site-section-icons";
import {
  useBrandBySegment,
  useSiteBySegment,
} from "@/features/marketing/data/keys-hooks";
import { useBrandSites } from "@/features/marketing/data/hooks";
import { cn } from "@/lib/utils";

/** The SEO rooms a website's own menu lists directly; the rest sit behind "All SEO". */
const WEBSITE_MENU_SEO_SLUGS = [
  "keywords",
  "rankings",
  "search-console",
  "audit",
  "backlinks",
  "ai-visibility",
] as const;

interface MarketingSidebarMenuProps {
  expanded: boolean;
}

/**
 * A group heading. Collapsed, the label would be unreadable at rail width, so
 * the grouping survives as a rule instead of vanishing — the rail keeps the
 * same rhythm as the expanded menu rather than becoming one long icon run.
 */
function GroupHeading({
  label,
  expanded,
}: {
  label: string;
  expanded: boolean;
}) {
  if (!expanded)
    return (
      <div
        role="separator"
        title={label}
        aria-label={label}
        className="mx-2 my-1 border-t border-border/70"
      />
    );
  return (
    <div className="px-1.5 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {label}
    </div>
  );
}

function BackRow({ href, label }: { href: string; label: string }) {
  return (
    <NavLink
      href={href}
      title={label}
      aria-label={label}
      className={ROUTE_MENU_NAV_ITEM_CLASS}
    >
      <span className="shell-nav-icon">
        <ChevronLeft
          size={ROUTE_MENU_ICON_SIZE}
          strokeWidth={ROUTE_MENU_ICON_STROKE_WIDTH}
        />
      </span>
      <span className="shell-nav-label truncate">{label}</span>
    </NavLink>
  );
}

function NavRow({
  href,
  label,
  title,
  icon,
  active,
  soon,
  activeRef,
}: {
  href: string;
  label: string;
  title?: string;
  icon: ReactNode;
  active: boolean;
  soon?: boolean;
  activeRef?: (el: HTMLAnchorElement | null) => void;
}) {
  return (
    <NavLink
      ref={activeRef}
      href={href}
      title={title ?? label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(ROUTE_MENU_NAV_ITEM_CLASS, active && "shell-active-pill")}
    >
      <span className="shell-nav-icon">{icon}</span>
      <span className="shell-nav-label flex min-w-0 items-center gap-1.5">
        <span className="truncate">{label}</span>
        {soon ? (
          <span className="rounded-sm bg-muted px-1 py-px text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            Soon
          </span>
        ) : null}
      </span>
    </NavLink>
  );
}

/**
 * Scroll the active row into view once the menu is actually laid out. This
 * menu is portaled in while the sidebar may still show the main nav, so on
 * first paint it can sit inside a `display: none` subtree where nothing has a
 * size to scroll to — watch the container's size and scroll exactly once.
 */
function useScrollActiveIntoView(activeHref: string | undefined) {
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    const scrollToActive = () => {
      const el = activeRef.current;
      if (!el || el.clientHeight === 0) return false;
      // Scroll the menu's OWN list, vertically only — scrollIntoView also
      // scrolls every ancestor on both axes, and with the domain panel closed
      // that dragged the whole sidebar sideways.
      const scroller = el.closest<HTMLElement>(".shell-sidebar-route-nav");
      if (!scroller) return true;
      const row = el.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      if (row.top < box.top) scroller.scrollTop -= box.top - row.top;
      else if (row.bottom > box.bottom)
        scroller.scrollTop += row.bottom - box.bottom;
      return true;
    };
    if (scrollToActive()) return;
    const container = document.querySelector<HTMLElement>(
      ".shell-sidebar-route-nav",
    );
    if (!container) return;
    const observer = new ResizeObserver(() => {
      if (scrollToActive()) observer.disconnect();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeHref]);
  return activeRef;
}

/** AGENCY state — the roster, roll-ups, operations, and tools. */
function AgencyMenu({
  pathname,
  expanded,
}: {
  pathname: string;
  expanded: boolean;
}) {
  const activeEntry = resolveActiveRouteMode(
    MARKETING_PILLARS.flatMap((pillar) =>
      pillar.entries.filter(
        (entry) => entry.status !== "coming-soon" && !entry.navHidden,
      ),
    ),
    pathname,
  );
  return (
    <>
      <NavLink
        href="/marketing"
        title="Marketing Hub"
        aria-label="Marketing Hub"
        aria-current={pathname === "/marketing" ? "page" : undefined}
        className={cn(
          ROUTE_MENU_NAV_ITEM_CLASS,
          pathname === "/marketing" && "shell-active-pill",
        )}
      >
        <span className="shell-nav-icon">
          <TrendingUp
            size={ROUTE_MENU_ICON_SIZE}
            strokeWidth={ROUTE_MENU_ICON_STROKE_WIDTH}
          />
        </span>
        <span className="shell-nav-label truncate">Marketing Hub</span>
      </NavLink>

      {MARKETING_PILLARS.map((pillar) => {
        const entries = pillar.entries.filter(
          (entry) => entry.status !== "coming-soon" && !entry.navHidden,
        );
        if (entries.length === 0) return null;
        return (
          <div key={pillar.key}>
            <GroupHeading label={pillar.label} expanded={expanded} />
            {entries.map((entry) => (
              <NavRow
                key={entry.href}
                href={entry.href}
                label={entry.label}
                title={entry.description}
                active={activeEntry?.href === entry.href}
                icon={
                  <IconResolver
                    iconName={entry.iconName}
                    size={ROUTE_MENU_ICON_SIZE}
                    style={{
                      width: ROUTE_MENU_ICON_SIZE,
                      height: ROUTE_MENU_ICON_SIZE,
                      strokeWidth: ROUTE_MENU_ICON_STROKE_WIDTH,
                    }}
                  />
                }
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

/** BRAND state — one brand's whole workspace. */
function BrandMenu({
  brandSeg,
  pathname,
  expanded,
}: {
  brandSeg: string;
  pathname: string;
  expanded: boolean;
}) {
  // access-errors: ok — navigation enrichment only; a failed read keeps every
  // row reachable and the owning workspace surfaces its own read error.
  const brand = useBrandBySegment(brandSeg);
  const brandPath = marketingRoutes.brand(brandSeg);
  const kind = brandKindOf(brand.data);
  // A person brand answers "do they have a website" from its sites; the read is
  // cheap and cached, and only a person brand waits on it.
  const sites = useBrandSites(kind === "person" ? (brand.data?.id ?? "") : "");
  const hasWebsite =
    kind !== "person" || (sites.data?.length ?? 0) > 0 || sites.isPending;
  const allGroups = listMarketingBrandModeGroups(brandPath);
  const groups = arrangeBrandNav(allGroups, kind, hasWebsite);
  // Hidden rows (a person's Locations) still resolve as active on their own address.
  const active = resolveActiveRouteMode(
    allGroups.flatMap((group) => group.modes),
    pathname,
  );
  const activeRef = useScrollActiveIntoView(active?.href);

  return (
    <>
      <BackRow href={marketingRoutes.brands()} label="All brands" />
      {groups.map((group) => (
        <div key={group.label}>
          {group.label === "Start" ? null : (
            <GroupHeading label={group.label} expanded={expanded} />
          )}
          {group.modes.map((mode) => {
            const isActive = active?.href === mode.href;
            const label =
              mode.slug === ""
                ? (brand.data?.name ?? "Overview")
                : brandNavLabel(kind, mode);
            return (
              <NavRow
                key={mode.href}
                href={mode.href}
                label={label}
                title={mode.description}
                active={isActive}
                soon={"status" in mode && mode.status === "coming-soon"}
                activeRef={
                  isActive
                    ? (el) => {
                        activeRef.current = el;
                      }
                    : undefined
                }
                icon={
                  <IconResolver
                    iconName={mode.iconName}
                    size={ROUTE_MENU_ICON_SIZE}
                    style={{
                      width: ROUTE_MENU_ICON_SIZE,
                      height: ROUTE_MENU_ICON_SIZE,
                      strokeWidth: ROUTE_MENU_ICON_STROKE_WIDTH,
                    }}
                  />
                }
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

/** WEBSITE state — one site's inventory, plus the door into its SEO practice. */
function WebsiteMenu({
  brandSeg,
  siteSeg,
  pathname,
  expanded,
}: {
  brandSeg: string;
  siteSeg: string;
  pathname: string;
  expanded: boolean;
}) {
  // access-errors: ok — navigation enrichment only (labels); rows stay reachable.
  const brand = useBrandBySegment(brandSeg);
  const site = useSiteBySegment(brand.data?.id, siteSeg);
  const basePath = marketingRoutes.brandSection(brandSeg, `websites/${siteSeg}`);
  const groups = listMarketingWebsiteModeGroups(basePath);
  const active = resolveActiveRouteMode(
    groups.flatMap((group) => group.modes),
    pathname,
  );
  const activeRef = useScrollActiveIntoView(active?.href ?? pathname);
  const siteLabel = site.data?.name ?? site.data?.domain ?? siteSeg;
  // A website HAS its SEO (Arman, 2026-10-21): the main SEO rooms sit right in
  // the website's menu; the full SEO menu is one click in ("All SEO").
  const seoPath = marketingRoutes.brandSection(brandSeg, `seo/${siteSeg}`);
  const seoRows = [
    ...WEBSITE_MENU_SEO_SLUGS.flatMap((slug) => {
      const section = getMarketingSeoSection(slug);
      const Icon = MARKETING_SEO_SECTION_ICONS[slug];
      return section
        ? [
            {
              href: `${seoPath}/${slug}`,
              label: section.name,
              title: section.description,
              Icon,
            },
          ]
        : [];
    }),
    {
      href: seoPath,
      label: "All SEO",
      title:
        "Every SEO room for this site: technical health, links, programs, setup.",
      Icon: Search,
    },
  ];
  const brandPath = marketingRoutes.brand(brandSeg);
  const siteWorkRows = [
    {
      href: `${brandPath}/content/plan/${siteSeg}`,
      label: "Content plan",
      title:
        "Every URL this site should have — pillars, clusters, briefs, keywords.",
      Icon: ListTree,
    },
    {
      href: `${brandPath}/intelligence/reputation/${siteSeg}`,
      label: "Reputation",
      title:
        "Publication opportunities and reputation decisions for this site.",
      Icon: ShieldCheck,
    },
  ];
  const siteWorkActive = siteWorkRows.some(
    (row) => pathname === row.href || pathname.startsWith(`${row.href}/`),
  );

  // The site's own pages first, its SEO and content beside them, settings last.
  const inventoryGroups = groups.filter(
    (group) => group.label !== "Configuration",
  );
  const configGroups = groups.filter(
    (group) => group.label === "Configuration",
  );
  const renderGroups = (list: typeof groups) =>
    list.map((group) => (
      <div key={group.label}>
        {group.label === "Start" ? null : (
          <GroupHeading label={group.label} expanded={expanded} />
        )}
        {group.modes.map((mode) => {
          const Icon = MARKETING_WEBSITE_SECTION_ICONS[mode.slug];
          const isActive = !siteWorkActive && active?.href === mode.href;
          return (
            <NavRow
              key={mode.href}
              href={mode.href}
              label={mode.slug === "" ? siteLabel : mode.name}
              title={mode.description}
              active={isActive}
              activeRef={
                isActive
                  ? (el) => {
                      activeRef.current = el;
                    }
                  : undefined
              }
              icon={
                <Icon
                  size={ROUTE_MENU_ICON_SIZE}
                  strokeWidth={ROUTE_MENU_ICON_STROKE_WIDTH}
                />
              }
            />
          );
        })}
      </div>
    ));

  return (
    <>
      <BackRow
        href={marketingRoutes.brandSection(brandSeg, "websites")}
        label={brand.data?.name ?? "All websites"}
      />
      {renderGroups(inventoryGroups)}
      <GroupHeading label="SEO" expanded={expanded} />
      {seoRows.map((row) => (
        <NavRow
          key={row.href}
          href={row.href}
          label={row.label}
          title={row.title}
          active={false}
          icon={
            <row.Icon
              size={ROUTE_MENU_ICON_SIZE}
              strokeWidth={ROUTE_MENU_ICON_STROKE_WIDTH}
            />
          }
        />
      ))}
      <GroupHeading label="Content & reputation" expanded={expanded} />
      {siteWorkRows.map((row) => {
        const isActive =
          pathname === row.href || pathname.startsWith(`${row.href}/`);
        return (
          <NavRow
            key={row.href}
            href={row.href}
            label={row.label}
            title={row.title}
            active={isActive}
            activeRef={
              isActive
                ? (el) => {
                    activeRef.current = el;
                  }
                : undefined
            }
            icon={
              <row.Icon
                size={ROUTE_MENU_ICON_SIZE}
                strokeWidth={ROUTE_MENU_ICON_STROKE_WIDTH}
              />
            }
          />
        );
      })}
      {renderGroups(configGroups)}
    </>
  );
}

/** SEO state — the practice on one site, plus the door back to its inventory. */
function SeoMenu({
  brandSeg,
  siteSeg,
  pathname,
  expanded,
}: {
  brandSeg: string;
  siteSeg: string;
  pathname: string;
  expanded: boolean;
}) {
  // access-errors: ok — navigation enrichment only (labels); rows stay reachable.
  const brand = useBrandBySegment(brandSeg);
  const site = useSiteBySegment(brand.data?.id, siteSeg);
  const basePath = marketingRoutes.brandSection(brandSeg, `seo/${siteSeg}`);
  const groups = listMarketingSeoModeGroups(basePath);
  const active = resolveActiveRouteMode(
    groups.flatMap((group) => group.modes),
    pathname,
  );
  const activeRef = useScrollActiveIntoView(active?.href);
  const siteLabel = site.data?.name ?? site.data?.domain ?? siteSeg;

  return (
    <>
      {/* SEO lives inside its website (Arman, 2026-10-21): back goes to the site. */}
      <BackRow
        href={marketingRoutes.brandSection(brandSeg, `websites/${siteSeg}`)}
        label={siteLabel}
      />
      <NavRow
        href={basePath}
        label="SEO overview"
        title="This site's search health at a glance."
        active={pathname === basePath}
        icon={
          <Search
            size={ROUTE_MENU_ICON_SIZE}
            strokeWidth={ROUTE_MENU_ICON_STROKE_WIDTH}
          />
        }
      />
      {groups.map((group) => (
        <div key={group.label}>
          <GroupHeading label={group.label} expanded={expanded} />
          {group.modes.map((mode) => {
            const Icon = MARKETING_SEO_SECTION_ICONS[mode.slug];
            const isActive = active?.href === mode.href;
            return (
              <NavRow
                key={mode.href}
                href={mode.href}
                label={mode.name}
                title={mode.description}
                active={isActive}
                activeRef={
                  isActive
                    ? (el) => {
                        activeRef.current = el;
                      }
                    : undefined
                }
                icon={
                  <Icon
                    size={ROUTE_MENU_ICON_SIZE}
                    strokeWidth={ROUTE_MENU_ICON_STROKE_WIDTH}
                  />
                }
              />
            );
          })}
        </div>
      ))}
    </>
  );
}

export default function MarketingSidebarMenu({
  expanded,
}: MarketingSidebarMenuProps) {
  const pathname = usePathname() ?? "/marketing";
  const context = resolveMarketingSidebarContext(pathname);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto scrollbar-thin-auto">
      {context.kind === "website" ? (
        <WebsiteMenu
          brandSeg={context.brandSeg}
          siteSeg={context.siteSeg}
          pathname={pathname}
          expanded={expanded}
          key={`w:${context.brandSeg}:${context.siteSeg}`}
        />
      ) : context.kind === "seo" ? (
        <SeoMenu
          brandSeg={context.brandSeg}
          siteSeg={context.siteSeg}
          pathname={pathname}
          expanded={expanded}
          key={`s:${context.brandSeg}:${context.siteSeg}`}
        />
      ) : context.kind === "brand" ? (
        <BrandMenu
          brandSeg={context.brandSeg}
          pathname={pathname}
          expanded={expanded}
          key={`b:${context.brandSeg}`}
        />
      ) : (
        <AgencyMenu pathname={pathname} expanded={expanded} />
      )}
    </div>
  );
}
