"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Compass, RefreshCw, SearchX } from "lucide-react";
import { PinButton } from "@/components/favorites/PinButton";
import { usePinned } from "@/components/favorites/usePinned";
import { SearchInput } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { PinnedSection } from "@/features/dashboard/components/PinnedSection";
import ShellIcon from "@/features/shell/components/ShellIcon";
import { resolveShellIconName } from "@/features/shell/shellIconMap";
import { PrimitiveTile } from "@ai-matrx/icons/domain";
import { iconColorMap } from "@/features/shell/constants/nav-data";
import { useIsMounted } from "@ai-matrx/kit/hooks";
import { cn } from "@/lib/utils";
import {
  searchUserLaunchpad,
  USER_LAUNCHPAD_DESTINATIONS,
  USER_LAUNCHPAD_GROUPS,
  type LaunchpadDestination,
  type LaunchpadGroup,
} from "../catalog";
import { useVisibilityAwarePageRefresh } from "../hooks/useVisibilityAwarePageRefresh";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { WhatsNewOffers } from "@/features/shell/shell-layout/editor/WhatsNewOffers";
import { YourLaunchpads, type ServerLaunchpadList } from "./YourLaunchpads";

const PREVIEW_DESTINATION_COUNT = 3;

/**
 * Folder heights are a 32px step. Apps are one size and live in their own
 * grid so they never sit in a hole next to a taller folder.
 */
const LAUNCHPAD_FOLDER_HEIGHT = {
  one: "h-32",
  two: "h-40",
  three: "h-48",
  more: "h-60",
} as const;

function childDestinations(group: LaunchpadGroup): LaunchpadDestination[] {
  return group.destinations.filter(
    (destination) => destination.href !== group.href,
  );
}

function folderHeightClass(childCount: number): string {
  if (childCount <= 1) return LAUNCHPAD_FOLDER_HEIGHT.one;
  if (childCount === 2) return LAUNCHPAD_FOLDER_HEIGHT.two;
  if (childCount === 3) return LAUNCHPAD_FOLDER_HEIGHT.three;
  return LAUNCHPAD_FOLDER_HEIGHT.more;
}

function folderSizeRank(childCount: number): number {
  if (childCount <= 1) return 1;
  if (childCount === 2) return 2;
  if (childCount === 3) return 3;
  return 4;
}

function partitionLaunchpadGroups(groups: readonly LaunchpadGroup[]): {
  apps: LaunchpadGroup[];
  folders: LaunchpadGroup[];
} {
  const apps: LaunchpadGroup[] = [];
  const folders: LaunchpadGroup[] = [];

  for (const group of groups) {
    if (childDestinations(group).length === 0) {
      apps.push(group);
    } else {
      folders.push(group);
    }
  }

  folders.sort(
    (left, right) =>
      folderSizeRank(childDestinations(left).length) -
      folderSizeRank(childDestinations(right).length),
  );

  return { apps, folders };
}

export default function UserLaunchpad({ serverLaunchpads }: { serverLaunchpads?: Promise<ServerLaunchpadList | null> | null } = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const { favorites: pinnedFavorites } = usePinned();
  const isMounted = useIsMounted();
  const normalizedQuery = searchQuery.trim();

  useVisibilityAwarePageRefresh();

  const staticResults = normalizedQuery
    ? searchUserLaunchpad(normalizedQuery)
    : [];
  const favoriteResults: LaunchpadDestination[] =
    normalizedQuery && isMounted
      ? pinnedFavorites
          .filter((favorite) => {
            const query = normalizedQuery.toLowerCase();
            return (
              favorite.label.toLowerCase().includes(query) ||
              favorite.href.toLowerCase().includes(query)
            );
          })
          .map((favorite) => ({
            id: favorite.id,
            label: favorite.label,
            href: favorite.href,
            iconName: resolveShellIconName(favorite.iconName ?? "Star"),
            color: favorite.color,
            groupLabel: "Pinned",
            external: favorite.href.startsWith("http"),
            kind: "destination",
          }))
      : [];
  const searchResults = [...favoriteResults, ...staticResults].filter(
    (destination, index, destinations) =>
      destinations.findIndex(
        (candidate) => candidate.href === destination.href,
      ) === index,
  );

  return (
    <div className="bg-textured text-foreground">
      <div className="mx-auto w-full max-w-[1680px] px-3 pt-[calc(var(--shell-header-h)+1rem)] sm:px-5 lg:px-7">
        <WhatsNewOffers placement="band" />
        <YourLaunchpads serverLaunchpads={serverLaunchpads ?? null} />
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-card-textured p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Compass className="h-3.5 w-3.5" aria-hidden />
              Your starting point
            </div>
            <h1 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">
              Keep this tab open. Your work opens beside it.
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Start something new, jump back to a favorite, or search every part
              of AI Matrx without losing your place.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Stays current while open</span>
            <Button
              icon={<RefreshCw />}
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
              aria-label="Refresh Launchpad"
              title="Refresh Launchpad"
            />
          </div>
        </section>

        <div className="sticky top-[var(--shell-header-h)] z-20 -mx-1 mb-5 rounded-2xl border border-glass-edge bg-glass p-2 shadow-glass backdrop-blur-glass backdrop-saturate-glass sm:p-3">
          <div className="flex items-center gap-3">
            <SearchInput
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search apps, workspaces, tools, and actions…"
              aria-label="Search AI Matrx destinations"
              className="flex-1"
              inputClassName="h-11 rounded-xl border-0 bg-background/80 shadow-none"
            />
            <div
              className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block"
              aria-live="polite"
            >
              {normalizedQuery
                ? `${searchResults.length} ${searchResults.length === 1 ? "result" : "results"}`
                : `${USER_LAUNCHPAD_DESTINATIONS.length} searchable destinations`}
            </div>
          </div>
        </div>

        {normalizedQuery ? (
          <SearchResults
            query={normalizedQuery}
            results={searchResults}
            onClear={() => setSearchQuery("")}
          />
        ) : (
          <div className="space-y-7">
            <QuickActions openInNewTab layout="grid" />
            <PinnedSection openInNewTab />
            <BrowseSection onShowAll={(label) => setSearchQuery(label)} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The area grids fill by the width the page actually has (the sidebar open or closed), never by the window: a
 * tile carries its icon, name and two buttons (pin, add to my menu), so it gets at least this much room and
 * the name is never cut to one letter (custom-experience audit #11, 1440px with the sidebar open).
 */
export const APP_TILE_GRID = "grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]";
export const FOLDER_CARD_GRID = "grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]";
export const RESULT_CARD_GRID = "grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))]";

function BrowseSection({ onShowAll }: { onShowAll: (label: string) => void }) {
  const { apps, folders } = partitionLaunchpadGroups(USER_LAUNCHPAD_GROUPS);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Browse AI Matrx
        </h2>
        <span className="shrink-0 text-xs text-muted-foreground">
          {USER_LAUNCHPAD_GROUPS.length} areas
        </span>
      </div>

      {apps.length > 0 ? (
        <div data-launchpad-area-grid="apps" className={cn("grid gap-3", APP_TILE_GRID)}>
          {apps.map((group) => (
            <LaunchpadAppTile key={group.id} group={group} />
          ))}
        </div>
      ) : null}

      {[1, 2, 3, 4].map((rank) => {
        const band = folders.filter(
          (group) => folderSizeRank(childDestinations(group).length) === rank,
        );
        if (band.length === 0) return null;
        return (
          <div
            key={rank}
            data-launchpad-area-grid="folders"
            className={cn("grid items-start gap-3", FOLDER_CARD_GRID)}
          >
            {band.map((group) => (
              <LaunchpadFolderCard
                key={group.id}
                group={group}
                onShowAll={() => onShowAll(group.label)}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}

function SearchResults({
  query,
  results,
  onClear,
}: {
  query: string;
  results: LaunchpadDestination[];
  onClear: () => void;
}) {
  if (results.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 text-center">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <SearchX className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="text-sm font-semibold">
          No destination matches “{query}”
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Try a broader name, capability, or part of the route.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={onClear}
        >
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Results for “{query}”
        </h2>
        <p className="text-xs text-muted-foreground">
          Every result opens in a new tab.
        </p>
      </div>
      <div data-launchpad-area-grid="results" className={cn("grid gap-2", RESULT_CARD_GRID)}>
        {results.map((destination) => (
          <LaunchpadDestinationCard
            key={`${destination.groupLabel}:${destination.href}`}
            destination={destination}
          />
        ))}
      </div>
    </section>
  );
}

function LaunchpadAppTile({ group }: { group: LaunchpadGroup }) {
  return (
    <article className="flex h-14 items-center gap-2 rounded-2xl border border-border bg-card px-2.5 shadow-sm">
      <LaunchpadAnchor
        href={group.href}
        external={group.external}
        className="group/link flex min-w-0 flex-1 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            iconColorMap[group.color ?? "slate"] ?? iconColorMap.slate,
          )}
        >
          <ShellIcon name={group.iconName} size={16} strokeWidth={2} />
        </span>
        {/* Two lines fit the 56px tile: a long area name ("Human Resources") wraps instead of being cut. */}
        <span title={group.label} className="line-clamp-2 min-w-0 flex-1 break-words text-sm leading-tight font-semibold text-foreground">
          {group.label}
        </span>
      </LaunchpadAnchor>
      <PinButton
        size="sm"
        notify={false}
        item={{
          id: group.href,
          kind: "nav",
          label: group.label,
          href: group.href,
          iconName: group.iconName,
          color: group.color,
        }}
      />
    </article>
  );
}

function LaunchpadFolderCard({
  group,
  onShowAll,
}: {
  group: LaunchpadGroup;
  onShowAll: () => void;
}) {
  const previewDestinations = childDestinations(group).slice(
    0,
    PREVIEW_DESTINATION_COUNT,
  );
  const remainingCount =
    childDestinations(group).length - previewDestinations.length;

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        folderHeightClass(childDestinations(group).length),
      )}
    >
      <div className="flex items-center gap-2 border-b border-border p-3">
        <LaunchpadAnchor
          href={group.href}
          external={group.external}
          className="group/link flex min-w-0 flex-1 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              iconColorMap[group.color ?? "slate"] ?? iconColorMap.slate,
            )}
          >
            <ShellIcon name={group.iconName} size={17} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <span className="truncate">{group.label}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover/link:text-primary" />
            </span>
            {group.description ? (
              <span className="mt-0.5 block truncate whitespace-nowrap text-xs text-muted-foreground">
                {group.description}
              </span>
            ) : null}
          </span>
        </LaunchpadAnchor>
        <PinButton
          size="sm"
          notify={false}
          item={{
            id: group.href,
            kind: "nav",
            label: group.label,
            href: group.href,
            iconName: group.iconName,
            color: group.color,
          }}
        />
      </div>

      <div className="min-h-0 p-1.5">
        {previewDestinations.map((destination) => (
          <LaunchpadAnchor
            key={destination.href}
            href={destination.href}
            external={destination.external}
            className="group/link flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
          >
            <ShellIcon
              name={destination.iconName}
              size={14}
              strokeWidth={1.8}
              className="shrink-0 text-muted-foreground group-hover/link:text-primary"
            />
            <span className="min-w-0 flex-1 truncate">{destination.label}</span>
            <ArrowUpRight className="h-3 w-3 shrink-0 text-muted-foreground/60 opacity-0 transition-opacity group-hover/link:opacity-100 group-focus-visible/link:opacity-100" />
          </LaunchpadAnchor>
        ))}
        {remainingCount > 0 ? (
          <Button
            type="button"
            variant="quiet"
            onClick={onShowAll}
            className="mt-0.5 w-full justify-start"
          >
            View all {group.destinations.length} destinations
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function LaunchpadDestinationCard({
  destination,
}: {
  destination: LaunchpadDestination;
}) {
  return (
    <article className="group relative flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card p-2 transition-colors hover:border-foreground/20 hover:bg-accent/40">
      <LaunchpadAnchor
        href={destination.href}
        external={destination.external}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {destination.identity ? (
          <PrimitiveTile primitive={destination.identity} size="lg" />
        ) : (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              iconColorMap[destination.color ?? "slate"] ?? iconColorMap.slate,
            )}
          >
            <ShellIcon name={destination.iconName} size={17} strokeWidth={2} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-medium text-foreground">
            <span className="truncate">{destination.label}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {destination.groupLabel}
          </span>
        </span>
      </LaunchpadAnchor>
      <PinButton
        size="sm"
        notify={false}
        item={{
          id: destination.href,
          kind: "nav",
          label: destination.label,
          href: destination.href,
          iconName: destination.iconName,
          color: destination.color,
        }}
      />
    </article>
  );
}

function LaunchpadAnchor({
  href,
  external,
  className,
  children,
}: {
  href: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (external) {
    return (
      <OutboundLink
        href={href}
        className={className}
      >
        {children}
      </OutboundLink>
    );
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      prefetch={false}
      className={className}
    >
      {children}
    </Link>
  );
}
