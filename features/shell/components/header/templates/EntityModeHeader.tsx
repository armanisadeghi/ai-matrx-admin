"use client";

// EntityModeHeader — the AGENTS-PATTERN header as a drop-in template.
//
// Desktop (sm+):  back | entity-name sibling dropdown | RouteModeNav pill | actions
// Mobile  (<sm):  back | entity-name dropdown | ONE "…" tap target → bottom
//                 drawer holding the modes AND the actions. Never cram the
//                 phone header — few things up top, everything else in the sheet.
//
// Actions are DECLARATIVE so the same list renders as transparent tap targets on
// desktop and drawer rows on mobile. `primary` renders solid primary,
// `destructive` renders solid bg-destructive (per /demos/button-demo).
// Tap targets carry their own 44px geometry — never wrap them in gap/padding.
//
// Reference consumer: /schedules/[id] (features/scheduling/components/detail/
// ScheduleDetail.tsx). The hand-rolled original: /agents/[id]/build.

import { useBackHref } from "@/lib/navigation/useBackHref";
import { useState } from "react";
import { useDeclareCurrentRecord } from "@/features/shell/current-record/currentRecord";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { usePhonePageActions } from "@/features/shell/components/header/phone-page-actions";
import NavLink from "@/components/navigation/NavLink";
import {
  Check,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { CrumbNode, type Crumb } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import {
  RouteModeNav,
  type RouteNavItem,
} from "@/features/shell/components/header/RouteModeNav";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import {
  TapTargetButtonDestructive,
  TapTargetButtonSolid,
  TapTargetButtonTransparent,
} from "@ai-matrx/design-system/tap-target";
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetHeader,
} from "@ai-matrx/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { StageSteps, type StageStep } from "@ai-matrx/design-system/controls";
import { resolveActiveRouteMode } from "@/features/shell/components/header/route-mode-match";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { frameCrumbOf, useDeclareFrameActions, useDeclareFrameCrumbs } from "@/features/shell/frame-host/framePageHeader";
import { useOwnAddress } from "@/features/shell/breadcrumbs/useOwnAddress";
import type { FrameAction } from "@/features/shell/frame/types";

const EXTERNAL_HREF_RE = /^(https?:|mailto:|tel:)/;

export interface EntityOption {
  label: string;
  href: string;
  active?: boolean;
}

export interface EntityHeaderAction {
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
  href?: string;
  /** Solid primary pill — the ONE main action of the page. */
  primary?: boolean;
  /** Solid destructive pill (delete/remove). */
  destructive?: boolean;
  /** Solid warning (amber) pill — an action needed to unblock a feature. */
  warning?: boolean;
  disabled?: boolean;
  /**
   * Open `href` in a new tab. The icon (e.g. an up-right arrow) must match the
   * behavior — a "leaves this page" glyph on a same-tab link is a lie.
   */
  newTab?: boolean;
  /**
   * Show the NAME beside the icon on desktop (transparent, not solid). For a page
   * whose icon-only actions would otherwise read as unlabeled glyphs.
   */
  showLabel?: boolean;
  /**
   * Keep this action visible in the PHONE header row too (e.g. Save while
   * there are unsaved changes), not only in the ⋮ sheet. Use for at most one
   * action; the name gives up room to it.
   */
  pinnedOnPhone?: boolean;
  /**
   * Only in the PHONE ⋮ sheet — for an action whose desktop form is a control
   * passed through `right` (e.g. the copy-reference button), so the phone does
   * not lose it and the desktop does not show it twice.
   */
  phoneOnly?: boolean;
  /**
   * In a HOST's one-row bar (a Board tile — `HostedRecordBar`): `bar` = a labelled button on the row,
   * anything else = the bar's "…" menu. Chosen by the action list, never by matching the label text.
   */
  placement?: "bar" | "menu";
  /** In a host bar's labelled button: `danger` draws it as the danger button (Stop, End…). */
  barTone?: "danger";
}

export interface EntityModeHeaderProps {
  /** Omit on a top-level page (no parent): no back button, the name stands first. Back fallback (the family's list page): Back returns where this tab came from, and uses this only when nothing is behind it (opened from a link). */
  backHref?: string;
  /** Current entity's name — small, in the top row, never an h1. */
  entityLabel: string;
  /**
   * The record this page shows, by type token and id. With it, "Add to my menu" adds the record itself
   * (the current-record primitive, features/shell/current-record); without it, the page and its name.
   */
  entityRecord?: { token: string; id: string };
  /**
   * The levels ABOVE the entity, in the org/scopes crumb pattern (each a link,
   * each with its own sibling menu). The entity name is the last crumb, on the
   * same line — never a second line of text above or below it. Hidden on a
   * phone: there the row is back + name.
   */
  trail?: Crumb[];
  /** Compact status beside the identity, visible at every breakpoint. */
  entityStatus?: React.ReactNode;
  /** Sibling entities for the name dropdown. Omit for a plain label. */
  entityOptions?: EntityOption[];
  /** Sub-view nav (View | Edit | …). Center pill on desktop; drawer rows on mobile. */
  modes?: RouteNavItem[];
  /**
   * Explicit active mode href. Required when modes differ only by query string
   * (`?view=grid`) — pathname matching alone cannot tell those apart.
   */
  activeModeHref?: string;
  /**
   * Switch modes without `router.push` — for modes that are client-side views
   * of one page (a shallow `?mode=` URL update, no server round-trip).
   */
  onModeSelect?: (href: string) => void;
  /**
   * PHONE: switch modes in one tap from the header row — one small button for
   * the mode you are NOT in (View ⇄ Edit) — instead of a trip into the sheet.
   */
  modeSwitchOnPhone?: boolean;
  /** Declarative actions — transparent tap targets on desktop, drawer rows on mobile. */
  actions?: EntityHeaderAction[];
  /**
   * Where the person is on a short path (StageSteps), centered on the line when there are no modes.
   * `labels: "current"` names only the current step (narrow headers).
   */
  steps?: { steps: readonly StageStep[]; current: number; labels?: "all" | "current" | "auto"; ariaLabel: string };
  /** Desktop-only extra controls (e.g. a Switch). Hidden below sm. */
  right?: React.ReactNode;
  /** Desktop-only control at the far right, AFTER the declarative actions (a record's Actions menu). Hidden below sm. */
  rightEnd?: React.ReactNode;
}

/** One declarative action as the header draws it on desktop (also the host-chrome bar's action). */
export function DesktopAction({ action }: { action: EntityHeaderAction }) {
  const Icon = action.icon;
  const shared = {
    icon: <Icon className="h-4 w-4" />,
    onClick: action.onPress,
    href: action.href,
    disabled: action.disabled,
    target: action.newTab ? ("_blank" as const) : undefined,
    rel: action.newTab ? "noopener noreferrer" : undefined,
  };
  // Primary + destructive show their NAME inline (like the demo's Send /
  // Delete pills); plain actions stay icon-only with a tooltip
  // (tap targets tooltip automatically from ariaLabel when no label).
  if (action.destructive) {
    return <TapTargetButtonDestructive {...shared} label={action.label} />;
  }
  if (action.warning) {
    return (
      <TapTargetButtonSolid
        {...shared}
        label={action.label}
        bgColor="bg-warning"
        iconColor="text-warning-foreground"
        hoverBgColor="hover:bg-warning/90"
      />
    );
  }
  if (action.primary) {
    return <TapTargetButtonSolid {...shared} label={action.label} />;
  }
  if (action.showLabel) {
    return (
      <TapTargetButtonTransparent {...shared} ariaLabel={action.label} label={action.label} />
    );
  }
  return <TapTargetButtonTransparent {...shared} ariaLabel={action.label} />;
}

/**
 * The mode + action rows — ONE list, drawn by this header's own sheet and, on a
 * phone, directly inside the shell's ⋮ sheet ("This page"), so a record's
 * options are one step, never a sheet that opens a second sheet (page-pass
 * shared defects, 2026-09-27).
 */
function EntitySheetRows({
  modes,
  actions,
  activeHref,
  onModeSelect,
  onDone,
}: {
  modes?: EntityModeHeaderProps["modes"];
  actions?: EntityHeaderAction[];
  activeHref?: string;
  onModeSelect?: (href: string) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const activeMode = activeHref ? { href: activeHref } : undefined;
  const setSheetOpen = (_open: false) => onDone();
  // Full-width rows, stacked — inside the shell's sheet these must read as a
  // list of one-tap items, never squeezed side by side ("Vie w").
  return (
    <div className="flex w-full min-w-0 flex-col" data-entity-sheet-rows>
            {modes?.map((m) => {
        const Icon = m.icon;
        const isActive = m.href === activeMode?.href;
        return (
          <button
            key={m.href}
            onClick={() => {
              setSheetOpen(false);
              if (onModeSelect) onModeSelect(m.href);
              else router.push(m.href);
            }}
            className="flex items-center w-full px-5 min-h-[52px] active:bg-glass-active transition-colors border-b border-glass-edge"
          >
            {Icon && (
              <Icon
                className={cn(
                  "w-4 h-4 mr-3 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
            )}
            <span
              className={cn(
                "text-[15px] flex-1 text-left",
                isActive && "font-medium",
              )}
            >
              {m.name}
            </span>
            {isActive && (
              <Check className="w-4 h-4 text-primary shrink-0" />
            )}
          </button>
        );
      })}
      {actions?.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.label}
            disabled={a.disabled}
            onClick={() => {
              setSheetOpen(false);
              if (a.href) {
                if (a.newTab || EXTERNAL_HREF_RE.test(a.href)) {
                  openOutbound(a.href, "_blank", "noopener");
                } else {
                  router.push(a.href);
                }
              } else {
                a.onPress?.();
              }
            }}
            className={cn(
              "flex items-center w-full px-5 min-h-[52px] active:bg-glass-active transition-colors border-b border-glass-edge last:border-0",
              a.destructive
                ? "text-destructive"
                : a.warning
                  ? "text-warning"
                  : "text-foreground",
              a.disabled && "opacity-50",
            )}
          >
            <Icon className="w-4 h-4 mr-3 shrink-0" />
            <span className="text-[15px] flex-1 text-left">
              {a.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// The rows ARE the phone sheet's menu: RouteHeader must never keep them in the
// header row as the page's primary (`isMenuAction`, route-header-layout.tsx).
EntitySheetRows.routeHeaderMenu = true as const;

export function EntityModeHeader({
  backHref,
  entityLabel,
  entityRecord,
  trail,
  entityStatus,
  entityOptions,
  modes,
  activeModeHref,
  onModeSelect,
  modeSwitchOnPhone,
  actions,
  right,
  rightEnd,
  steps,
}: EntityModeHeaderProps) {
  // THE CURRENT RECORD: every record page declares what it shows, once, here (custom-experience §5.4).
  useDeclareCurrentRecord({ label: entityLabel, token: entityRecord?.token ?? null, id: entityRecord?.id ?? null });
  // THE NEW APP FRAME: the trail and the name go to the frame's crumb row (one title, the page's
  // real levels); this header keeps only the status, the modes and the actions. Classic: no frame.
  // EVERY CRUMB IS A REAL DOOR: in a layout (Smart Add) the page shown is deeper than this header's
  // level, so the name is a link back to it — never text that goes nowhere (useOwnAddress).
  const own = useOwnAddress();
  const inFrame = useDeclareFrameCrumbs([
    ...(trail ?? []).map(frameCrumbOf),
    { label: entityLabel, href: own.href, options: entityOptions },
  ]);
  const [sheetOpen, setSheetOpen] = useState(false);
  // On a phone the shell's ⋮ hosts this header's options directly.
  const isPhone = useIsMobile();
  const { host: phoneSheetHost } = usePhonePageActions();
  const inShellSheet = isPhone && phoneSheetHost != null;
  // Back returns where this tab came from (filters included); `backHref` is
  // the fallback for a page opened straight from a link.
  const resolvedBackHref = useBackHref(backHref ?? "/");
  const router = useRouter();
  const pathname = usePathname();
  const activeMode = activeModeHref
    ? modes?.find((mode) => mode.href === activeModeHref)
    : resolveActiveRouteMode(modes ?? [], pathname);
  const hasSheet = Boolean(
    (modes && modes.length) || (actions && actions.length),
  );
  // THE NEW APP FRAME ON A PHONE: the frame's "…" is the page's one menu, so the other modes and the
  // actions go there (with the frame's Copy link / Open in new tab) and this header draws no "…" of
  // its own — never two "…" in one row. Desktop keeps them on the line as before.
  const runAction = (a: EntityHeaderAction) => {
    if (!a.href) return a.onPress?.();
    if (a.newTab || EXTERNAL_HREF_RE.test(a.href)) openOutbound(a.href, "_blank", "noopener");
    else router.push(a.href);
  };
  const frameTakesMenu = inFrame && isPhone && hasSheet;
  const frameMenu: FrameAction[] | null = frameTakesMenu
    ? [
        ...(modes ?? [])
          .filter((m) => m.href !== activeMode?.href)
          .map((m) => ({
            id: `mode:${m.href}`,
            label: m.name,
            icon: m.icon,
            onSelect: () => (onModeSelect ? onModeSelect(m.href) : router.push(m.href)),
          })),
        ...(actions ?? [])
          .filter((a) => !a.pinnedOnPhone)
          .map((a) => ({
            id: `action:${a.label}`,
            label: a.label,
            icon: a.icon,
            destructive: a.destructive,
            disabled: a.disabled,
            onSelect: () => runAction(a),
          })),
      ]
    : null;
  useDeclareFrameActions(frameMenu);

  const label = (
    <span className="flex min-w-0 items-center gap-1.5">
      {/* A floor under the name: on a phone the shell's right-side icons
          squeezed it to nothing ("Fa…", then blank beside its status). The
          cap is on the NAME only, so a status beside it never steals its room. */}
      <span className="min-w-12 max-w-[55vw] truncate text-sm font-medium text-foreground sm:max-w-[min(360px,32vw)]">
        {entityLabel}
      </span>
      {entityStatus}
    </span>
  );

  return (
    <>
      <RouteHeader
        left={
          <>
            {/* THE HEADER IS NOT GLASS (owner, 2026-10-03): the shell paints
                the band solid, so every control in it is transparent. The name
                beside the back button carries its own inset (rule 3). */}
            {inFrame ? (
              entityStatus ? <span className="flex min-w-0 items-center ps-[3px]">{entityStatus}</span> : null
            ) : (
            <>
            {backHref ? (
              <ChevronLeftTapButton variant="transparent" href={resolvedBackHref} ariaLabel="Back" />
            ) : null}
            {trail && trail.length > 0 ? (
              <nav
                aria-label="Breadcrumb"
                data-entity-trail
                className="hidden sm:flex min-w-0 shrink items-center gap-1 ps-[3px]"
              >
                {trail.map((crumb, i) => (
                  // The root crumb keeps its whole word; the middle crumbs (a long name) give way first.
                  <span key={`${crumb.label}-${i}`} className={cn("flex items-center gap-1", i === 0 ? "shrink-0" : "min-w-0")}>
                    <CrumbNode crumb={crumb} isLast={false} />
                    <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </span>
                ))}
              </nav>
            ) : null}
            {entityOptions && entityOptions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Switch"
                    className="flex shrink-0 items-center gap-0.5 rounded-full ms-[3px] px-1.5 py-0.5 hover:bg-[var(--matrx-glass-bg-active)] transition-colors"
                  >
                    {label}
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="max-h-[60dvh] overflow-y-auto">
                    {entityOptions.map((opt) => (
                      <DropdownMenuItem
                        key={opt.href}
                        asChild
                        className={cn(opt.active && "bg-accent/60")}
                      >
                        <NavLink
                          href={opt.href}
                          className="flex items-center gap-2"
                        >
                          <Check
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              opt.active
                                ? "opacity-100 text-primary"
                                : "opacity-0",
                            )}
                          />
                          <span className="truncate">{opt.label}</span>
                        </NavLink>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : own.isCurrent ? (
              <span className="flex min-w-0 items-center ps-[3px]">{label}</span>
            ) : (
              <NavLink
                href={own.href}
                data-entity-own-link=""
                className="flex min-w-0 items-center rounded-md ms-[3px] px-1 hover:bg-[var(--matrx-glass-bg-active)] transition-colors"
              >
                {label}
              </NavLink>
            )}
            </>
            )}
            {isPhone &&
              modeSwitchOnPhone &&
              modes
                ?.filter((m) => m.href !== activeMode?.href)
                .slice(0, 1)
                .map((m) => {
                  const Icon = m.icon ?? MoreHorizontal;
                  return (
                    <span key={`mode-${m.href}`} className="shrink-0">
                      <TapTargetButtonTransparent
                        icon={<Icon className="h-4 w-4" />}
                        ariaLabel={m.name}
                        onClick={() =>
                          onModeSelect ? onModeSelect(m.href) : router.push(m.href)
                        }
                      />
                    </span>
                  );
                })}
            {isPhone &&
              actions
                ?.filter((a) => a.pinnedOnPhone)
                .map((a) => {
                  // The phone row is narrow: pinned actions are ICONS with
                  // their name as the accessible label/tooltip, so the title
                  // keeps room and nothing slides under the shell's icons.
                  const Icon = a.icon;
                  const shared = {
                    icon: <Icon className="h-4 w-4" />,
                    onClick: a.onPress,
                    disabled: a.disabled,
                    ariaLabel: a.label,
                  };
                  return (
                    <span key={`pinned-${a.label}`} className="shrink-0">
                      {a.primary ? (
                        <TapTargetButtonSolid {...shared} />
                      ) : (
                        <TapTargetButtonTransparent {...shared} />
                      )}
                    </span>
                  );
                })}
          </>
        }
        center={
          modes && modes.length > 0 ? (
            <div className="hidden sm:flex w-full min-w-0 justify-center">
              <RouteModeNav
                items={modes}
                activeHref={activeModeHref}
                onNavigate={onModeSelect}
              />
            </div>
          ) : steps ? (
            <div className="flex w-full min-w-0 justify-center" data-testid="entity-header-steps">
              <StageSteps aria-label={steps.ariaLabel} steps={steps.steps} current={steps.current} labels={steps.labels ?? "all"} />
            </div>
          ) : undefined
        }
        right={
          inShellSheet ? (
            hasSheet ? (
              <EntitySheetRows
                modes={modes}
                actions={actions}
                activeHref={activeMode?.href}
                onModeSelect={onModeSelect}
                onDone={() => {}}
              />
            ) : undefined
          ) : (
          <>
            {/* Desktop: extras + declarative actions as tap targets */}
            <div className="hidden sm:flex items-center">
              {/* `right` extras sit beside tap targets: one that is not itself
                  a tap control adds its own 3px half-gap (styles/shell.css,
                  [data-header-extra]). */}
              {right != null && right !== false ? (
                <span data-header-extra className="flex min-w-0 items-center">
                  {right}
                </span>
              ) : null}
              {actions
                ?.filter((a) => !a.phoneOnly)
                .map((a) => (
                  <DesktopAction key={a.label} action={a} />
                ))}
              {rightEnd != null && rightEnd !== false ? (
                <span data-header-extra className="flex min-w-0 items-center">
                  {rightEnd}
                </span>
              ) : null}
            </div>
            {/* Mobile: one trigger, everything in the drawer (in the frame: the frame's "…") */}
            {hasSheet && !frameTakesMenu && (
              <div className="sm:hidden">
                <TapTargetButtonTransparent
                  icon={<MoreHorizontal className="h-4 w-4" />}
                  ariaLabel="More"
                  onClick={() => setSheetOpen(true)}
                />
              </div>
            )}
          </>
          )
        }
      />
      {hasSheet && !inShellSheet && !frameTakesMenu && (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Options"
        >
          <BottomSheetHeader
            title={entityLabel}
            trailing={
              <button
                onClick={() => setSheetOpen(false)}
                className="text-primary active:opacity-70 min-h-[44px] px-1 text-[15px]"
              >
                Done
              </button>
            }
          />
          <BottomSheetBody>
            <EntitySheetRows
              modes={modes}
              actions={actions}
              activeHref={activeMode?.href}
              onModeSelect={onModeSelect}
              onDone={() => setSheetOpen(false)}
            />
          </BottomSheetBody>
        </BottomSheet>
      )}
    </>
  );
}
