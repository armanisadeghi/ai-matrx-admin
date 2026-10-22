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

import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { CrumbDoor } from "@/features/shell/frame/CrumbDoor";
import { useBackHref } from "@/lib/navigation/useBackHref";
import NavLink from "@/components/navigation/NavLink";
import { ChevronRight } from "lucide-react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
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

// EVERY CRUMB IS A DOOR (Arman, 2026-10-22): the classic trail opens a level's siblings through the
// SAME searchable door the new frame draws (frame/CrumbDoor) — one component, client-side moves.
function CrumbOptions({ crumb }: { crumb: Crumb }) {
  const router = useRouter();
  if (!crumb.loadOptions && !(crumb.options && crumb.options.length > 0)) return null;
  const go = (opt: CrumbOption) => ({ ...opt, onSelect: () => router.push(opt.href) });
  const load = crumb.loadOptions;
  return (
    <CrumbDoor
      door={{
        kind: "siblings",
        label: crumb.optionsLabel ?? crumb.label,
        options: crumb.options?.map(go),
        loadOptions: !crumb.options && load ? async () => (await load()).map(go) : undefined,
        allHref: crumb.optionsAllHref,
        allLabel: crumb.optionsAllLabel,
      }}
    />
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
