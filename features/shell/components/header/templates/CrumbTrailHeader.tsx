"use client";

// CrumbTrailHeader — the ORG/SCOPES-PATTERN header as a drop-in template.
// Generic version of the scope family's breadcrumb row (the best drill-down
// nav in the app): every level is clickable, every level can expose its
// SIBLINGS via a tiny chevron dropdown, actions stay tap targets on the right.
//
//   <CrumbTrailHeader
//     backHref="/cms"
//     trail={[
//       { label: "Content", href: "/cms" },
//       { label: site.name, href: `/cms/${site.id}`, options: siblingSites },
//       { label: "Settings" },
//     ]}
//     right={<PlusTapButton variant="transparent" … />}
//   />
//
// Mobile: the trail collapses to the LAST crumb (+ its dropdown) so the row
// never overflows. The full-fidelity scope implementation (drawer, org root,
// "view all" links) remains `features/scopes/components/pages/ScopeBreadcrumb.tsx`;
// migrate it onto this template when touched.

import { Fragment, useState } from "react";
import { useBackHref } from "@/lib/navigation/useBackHref";
import NavLink from "@/components/navigation/NavLink";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RecordId, Skeleton } from "@ai-matrx/design-system";
import { frameCrumbOf, useDeclareFrameCrumbs } from "@/features/shell/frame-host/framePageHeader";

export interface CrumbOption {
  label: string;
  href: string;
  active?: boolean;
}

export interface Crumb {
  label: string;
  /** Where clicking the crumb's text navigates. Omit on the current level. */
  href?: string;
  /** The level's own address (derived trails), even on the current level — how a header placed in a layout finds the levels below it. */
  at?: string;
  /** Sibling links shown in the crumb's chevron dropdown. */
  options?: CrumbOption[];
  /** Optional heading above the options list (e.g. "Sites"). */
  optionsLabel?: string;
  /** The level's name is still loading (a record read on the client): draws
   *  a name-sized placeholder so the header is never empty in the server HTML
   *  and the crumbs after it barely move when the name lands. */
  pending?: boolean;
  /**
   * Sibling links fetched when the dropdown first opens (derived trails: the route tree is
   * loaded on demand, never shipped with every page). Used when `options` is absent.
   */
  loadOptions?: () => Promise<CrumbOption[]>;
  /** A "see all" link at the foot of the dropdown (the Scopes pattern). */
  optionsAllHref?: string;
  optionsAllLabel?: string;
  /**
   * The record has no key and no name column to show: draw its id through the one canonical
   * id component (short id + copy) instead of a label. `label` stays the accessible name.
   */
  recordId?: { value: string; token?: string; kind?: string };
}

export interface CrumbTrailHeaderProps {
  /** Back tap-target destination. Defaults to the first crumb's href. */
  backHref?: string;
  trail: Crumb[];
  /** Right-slot tap-target actions. */
  right?: React.ReactNode;
  /** Yield to any page-specific header mounted deeper in the route tree. */
  fallback?: boolean;
}

function CrumbOptions({ crumb }: { crumb: Crumb }) {
  const [loaded, setLoaded] = useState<CrumbOption[] | null>(null);
  const [failed, setFailed] = useState(false);
  const options = crumb.options ?? loaded ?? [];
  const lazy = !crumb.options && crumb.loadOptions;
  if (!lazy && options.length === 0) return null;
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open || !lazy || loaded) return;
        crumb.loadOptions!().then(setLoaded, () => setFailed(true));
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Switch ${crumb.optionsLabel ?? crumb.label}`}
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[12rem] max-w-[20rem]"
      >
        {crumb.optionsLabel && (
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {crumb.optionsLabel}
          </DropdownMenuLabel>
        )}
        <div className="max-h-[60dvh] overflow-y-auto">
          {lazy && !loaded ? (
            <div className="px-2 py-1.5 type-meta text-muted-foreground">
              {failed ? "Could not load" : <Skeleton aria-label="Loading" className="h-4 w-28 rounded" />}
            </div>
          ) : null}
          {options.map((opt) => (
            <DropdownMenuItem
              key={opt.href}
              asChild
              className={cn(opt.active && "bg-accent/60")}
            >
              <NavLink href={opt.href} className="flex items-center gap-2">
                <Check
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
                    opt.active ? "opacity-100 text-primary" : "opacity-0",
                  )}
                />
                <span className="truncate">{opt.label}</span>
              </NavLink>
            </DropdownMenuItem>
          ))}
        </div>
        {crumb.optionsAllHref && (
          <DropdownMenuItem asChild>
            <NavLink href={crumb.optionsAllHref} className="text-muted-foreground">
              {crumb.optionsAllLabel ?? "View all"}
            </NavLink>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CrumbNode({ crumb, isLast }: { crumb: Crumb; isLast: boolean }) {
  if (crumb.pending) {
    return (
      <span className="flex min-w-0 items-center">
        <Skeleton aria-label="Loading" className="h-4 w-24 rounded" />
      </span>
    );
  }
  const text = crumb.recordId ? (
    <RecordId
      value={crumb.recordId.value}
      label={crumb.recordId.kind ?? crumb.label}
      token={crumb.recordId.token}
      look="chip"
    />
  ) : isLast ? (
    <span
      className="min-w-0 break-words text-xs leading-4 font-medium text-foreground sm:text-sm"
      title={crumb.label}
    >
      {crumb.label}
    </span>
  ) : crumb.href ? (
    <NavLink
      href={crumb.href}
      className="truncate max-w-[12rem] type-body text-muted-foreground hover:text-foreground hover:underline underline-offset-2 transition-colors"
    >
      {crumb.label}
    </NavLink>
  ) : (
    <span className="truncate max-w-[12rem] type-body text-muted-foreground">
      {crumb.label}
    </span>
  );

  return (
    <span className="flex min-w-0 items-center gap-0.5">
      {text}
      <CrumbOptions crumb={crumb} />
    </span>
  );
}

export function CrumbTrailHeader({
  backHref,
  trail,
  right,
  fallback = false,
}: CrumbTrailHeaderProps) {
  // THE NEW APP FRAME: the trail goes to the frame's crumb row; only `right` stays in the header slot.
  const inFrame = useDeclareFrameCrumbs(trail.length > 0 ? trail.map(frameCrumbOf) : null, { fallback });
  // Back returns where this tab came from; the crumb is the fallback.
  const back = useBackHref(backHref ?? trail[0]?.href ?? "/");
  if (trail.length === 0) return null;
  if (inFrame) return right != null && right !== false ? <RouteHeader fallback={fallback} right={right} /> : null;
  const last = trail[trail.length - 1];

  return (
    <RouteHeader
      fallback={fallback}
      left={
        // THE HEADER IS NOT GLASS (owner, 2026-10-03): the shell paints the
        // header band solid, so nothing moves behind it — by "glass only
        // floats" every control in it is transparent. The back button is a
        // plain transparent tap target; its box carries 3px beside the pill,
        // so the trail adds its own 3px (`ps-[3px]`) for one 6px gap (rule 3).
        <>
          <ChevronLeftTapButton variant="transparent" href={back} ariaLabel="Back" />
          {/* Desktop: full trail */}
          <nav
            aria-label="Breadcrumb"
            className="hidden sm:flex min-w-0 items-center gap-1 ps-[3px]"
          >
            {trail.map((crumb, i) => (
              <Fragment key={`${crumb.label}-${i}`}>
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <CrumbNode crumb={crumb} isLast={i === trail.length - 1} />
              </Fragment>
            ))}
          </nav>
          {/* Mobile: last crumb only */}
          <nav
            aria-label="Breadcrumb"
            className="flex sm:hidden min-w-0 items-center ps-[3px]"
          >
            <CrumbNode crumb={last} isLast />
          </nav>
        </>
      }
      right={right}
    />
  );
}
