"use client";

/**
 * EntityDoorControls — the DOORS, without the name.
 *
 * `EntityRef` is the default: it renders a record's name AS the door. But some
 * surfaces genuinely cannot make the name an anchor:
 *
 *   - the name is an inline EDITOR (`AssociationEntitySelect` — click to rename)
 *   - the name sits inside a `<button>` whose click means something else
 *     (a picker row, where clicking = attach). An `<a>` inside a `<button>` is
 *     invalid DOM and a hydration error, and a stray click that navigated away
 *     would cost the user the picker they are standing in.
 *
 * Those surfaces render this cluster as a SIBLING of the name. It is the same
 * implementation `EntityRef` uses (EntityRef composes it), so a registry edit
 * lights up both and neither can drift.
 *
 * Same-tab "Open" is OPT-IN (`showOpen`) precisely because the callers above are
 * mid-task surfaces: peek + new tab answer "which one is that?" without
 * destroying what the user is doing. Pass `showOpen` when the surface is a plain
 * list the user can safely leave.
 *
 * Standalone controls are visible by default. Hover reveal is opt-in through
 * `revealOnHover`; when enabled, controls fade in on hover of EITHER the named `group/entity-ref`
 * (what `EntityRef` puts on its own wrapper) OR a plain Tailwind `group`, which
 * is what almost every row in this codebase already carries for its other
 * hover-revealed affordances.
 *
 * Accepting both is deliberate and load-bearing. The named group alone made a
 * silent, invisible failure the DEFAULT for standalone callers: forget the
 * class and the doors render at `opacity-0`, so the surface looks finished, the
 * markup is right, type-check and lint are green — and the user simply cannot
 * see the door. That is the exact dead end this module exists to remove, and it
 * shipped twice (the two debug-window sidebars, 2026-08-09) before Bugbot
 * caught it. A primitive whose correct use depends on remembering an invisible
 * convention will be misused; make the common case work instead.
 *
 * `alwaysShowActions` remains as a compatibility override that pins them visible
 * (a window title bar, a touch-first list). **Reach for it in any popover or
 * transient panel too**: `opacity-0` does not disable hit-testing, so on touch
 * the hover form is the worst case — invisible controls that are still
 * tappable. The row reserves their width either way (this cluster is
 * `shrink-0`), so pinning them costs no layout.
 *
 * Link doors carry `data-tap-target` so a host's `matrx-touch-targets` scope
 * can raise these intentionally compact desktop controls to the 44px
 * coarse-pointer floor without treating prose links as controls.
 *
 * The peek opens through `openResourcePeek` and renders in the app's ONE host
 * (`ResourcePeekRoot`, app/Providers.tsx), outside this component's tree — so a
 * popover that closes because the person clicked into the peek no longer
 * unmounts the peek with it (the "door that deletes itself" trap, 2026-08-09).
 * The popover still closes; a container that should stay open must ignore
 * events whose target is inside a dialog:
 *
 *     if (target?.closest?.('[role="dialog"], [role="alertdialog"]')) return;
 *
 * Adding a door for a new entity type is a registry edit, never a change here:
 *   route → `hrefFor` in `features/scopes/registry/entityRegistry.ts`
 *   peek  → `features/organizations/peek/registry.ts` + `kinds-list.ts`
 */

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink, Lightbulb } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { openResourcePeek } from "@/features/organizations/peek/resourcePeekStore";
import { cn } from "@/lib/utils";
import { resolveEntityDoors } from "./doors";
import { displayId } from "@ai-matrx/design-system";

export const ENTITY_DOOR_CONTROL_CLASS =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground " +
  "transition-colors hover:bg-accent hover:text-foreground";

export interface EntityDoorControlsProps {
  /** Canonical entity token (`agent`, `note`, `task`, …). */
  token: string;
  /** The record's id. */
  id: string;
  /** Display name — used only for the control labels/tooltips. */
  name?: string | null;
  /**
   * Override the registry route. Honored exactly: `null` means "this record
   * has no door" and must not fall through to the registry; omit to defer.
   */
  href?: string | null;
  /** Hide the peek control even when one is registered. */
  disablePeek?: boolean;
  /** Hide the new-tab control. */
  disableNewTab?: boolean;
  /** Also render a same-tab Open control (off by default — see the header). */
  showOpen?: boolean;
  /** Controls stay visible instead of appearing on hover/focus. */
  alwaysShowActions?: boolean;
  /** Opt into hover/focus reveal. Standalone controls are visible by default. */
  revealOnHover?: boolean;
  /** Surface-specific extra doors (open in window, jump to versions, …). */
  extraActions?: React.ReactNode;
  /**
   * `md` = THE control (`Button` variant="quiet", 28px, 16px glyph) — use it in
   * any bar of 28px controls (card hover bars, attach-menu rows) so the bar
   * never mixes sizes. `sm` = the compact inline 20px door beside text.
   */
  size?: "sm" | "md";
  className?: string;
}

export function EntityDoorControls({
  token,
  id,
  name,
  href,
  disablePeek = false,
  disableNewTab = false,
  showOpen = false,
  alwaysShowActions = false,
  revealOnHover = false,
  extraActions,
  size = "sm",
  className,
}: EntityDoorControlsProps) {
  const glyph = "h-3 w-3";

  const doors = resolveEntityDoors(token, id, href);
  const resolvedHref = doors.href;
  const canPeek = !disablePeek && doors.canPeek;
  const label = name?.trim() || `${displayId(id)}…`;

  // Nothing to offer → render no chrome at all. A control that goes nowhere is
  // the dead end this whole module exists to kill.
  if (!canPeek && !resolvedHref && !extraActions) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const openPeek = (anchor: Element) =>
    openResourcePeek({
      kind: doors.peekKind,
      id,
      // Forward the CALLER's `href`, not our resolved one. When a caller
      // overrode it — because the token alone cannot say which surface
      // this record opens on — the dialog would otherwise send "Open"
      // somewhere our new-tab link does not go. Passing `resolvedHref`
      // here instead would set the override on EVERY peek, including the
      // ones where nobody overrode anything, and would then suppress the
      // hardcoded href a token-less bespoke peek supplies for itself.
      // `undefined` (no caller opinion) is the correct default.
      href,
      anchor,
      trigger: "click",
      fallbackHref: resolvedHref,
    });

  return (
    <>
      <span
        className={cn(
          // THE control carries its own 3px half-gap, so a `md` cluster adds none.
          "inline-flex shrink-0 items-center",
          size !== "md" && "gap-0.5",
          revealOnHover &&
            !alwaysShowActions &&
            "opacity-0 transition-opacity group-hover/entity-ref:opacity-100 group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100",
          className,
        )}
      >
        {size === "md" ? (
          <>
            {canPeek && (
              <Button
                variant="quiet"
                icon={<Lightbulb />}
                title={`Quick look at ${label}`}
                aria-label={`Quick look at ${label}`}
                onClick={(e) => {
                  stop(e);
                  openPeek(e.currentTarget);
                }}
              />
            )}
            {resolvedHref && showOpen && (
              <Button variant="quiet" icon={<ArrowUpRight />} asChild>
                <Link
                  href={resolvedHref}
                  data-tap-target
                  onClick={stop}
                  title={`Open ${label}`}
                  aria-label={`Open ${label}`}
                />
              </Button>
            )}
            {resolvedHref && !disableNewTab && (
              <Button variant="quiet" icon={<ExternalLink />} asChild>
                <Link
                  href={resolvedHref}
                  data-tap-target
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={stop}
                  title={`Open ${label} in a new tab`}
                  aria-label={`Open ${label} in a new tab`}
                />
              </Button>
            )}
          </>
        ) : (
          <>
            {canPeek && (
              <button
                type="button"
                title={`Quick look at ${label}`}
                aria-label={`Quick look at ${label}`}
                onClick={(e) => {
                  stop(e);
                  openPeek(e.currentTarget);
                }}
                className={ENTITY_DOOR_CONTROL_CLASS}
              >
                <Lightbulb className={glyph} />
              </button>
            )}
            {resolvedHref && showOpen && (
              <Link
                href={resolvedHref}
                data-tap-target
                onClick={stop}
                title={`Open ${label}`}
                aria-label={`Open ${label}`}
                className={ENTITY_DOOR_CONTROL_CLASS}
              >
                <ArrowUpRight className={glyph} />
              </Link>
            )}
            {resolvedHref && !disableNewTab && (
              <Link
                href={resolvedHref}
                data-tap-target
                target="_blank"
                rel="noopener noreferrer"
                onClick={stop}
                title={`Open ${label} in a new tab`}
                aria-label={`Open ${label} in a new tab`}
                className={ENTITY_DOOR_CONTROL_CLASS}
              >
                <ExternalLink className={glyph} />
              </Link>
            )}
          </>
        )}
        {extraActions}
      </span>

    </>
  );
}
