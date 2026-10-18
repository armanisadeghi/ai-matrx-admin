"use client";

/**
 * AdminUserRef — THE door for a USER anywhere in the platform admin.
 *
 * THE DOOR LAW (common-docs/policies/no-dead-ends.md): a named person opens. In the admin seat a
 * person's record is `/administration/users/<id>` (users one-roof, 2026-10-17), so:
 *   - the NAME links to that page (`userRecordHref`) — a real anchor, middle-click opens a new tab;
 *   - hovering the name shows THE peek (`AdminUserPeek` inside `PeekHoverCard`);
 *   - the chevron lists every door from THE registry (`userDoors` in record/userSurfaces.ts):
 *     the page's tabs, then the hub pages no tab replaces (usage explorer, admin level, email).
 * Never declare a door list here — `record/__tests__/one-user-door-registry.test.ts` fails on it.
 *
 * Org-seat (non-admin) surfaces never use this: they link to the org member page.
 *
 * Composes, never duplicates: when no name/email is loaded it falls back to `MatrxUuidCell`, which
 * owns short-id display + copy + tooltip.
 *
 * Two exports, the same split `EntityRef` / `EntityDoorControls` uses:
 *   `AdminUserRef`          — the NAME with its doors (the default; prefer it)
 *   `AdminUserDoorControls` — the doors WITHOUT the name, for a surface whose name cannot be an
 *      anchor (inside a `<label>` or a button that means something else); render it as a SIBLING.
 */

import AppLink from "@/components/navigation/AppLink";
import { ChevronDown } from "lucide-react";
import { PeekHoverCard } from "@ai-matrx/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MatrxUuidCell } from "@ai-matrx/design-system/data-table/uuid-cell";
import { cn } from "@/lib/utils";
import { useAdminUserLabel, usableLabel } from "@/features/admin/users/useAdminUserLabel";
import { userDoors, userRecordHref } from "../record/userSurfaces";
import { AdminUserPeek } from "./AdminUserPeek";

export interface AdminUserRefProps {
  userId: string;
  /** Display name, when the surface has it loaded. */
  name?: string | null;
  /** Email — shown as the secondary line, and used as the label when unnamed. */
  email?: string | null;
  /** Hide the secondary email line (dense tables that show email in its own column). */
  hideEmail?: boolean;
  /** Where the NAME opens, when the surface has a better door than the person's page. */
  href?: string;
  className?: string;
}

export interface AdminUserDoorControlsProps {
  userId: string;
  /** Display name/email — used only for the control labels and menu heading. */
  label?: string | null;
  className?: string;
}

/**
 * The per-user admin destinations as a standalone control cluster. Every item
 * is a real `<AppLink>`, so middle-click / cmd-click opens a new tab without
 * costing the user the surface they are standing in.
 */
export function AdminUserDoorControls({
  userId,
  label,
  className,
}: AdminUserDoorControlsProps) {
  const heading = label?.trim() || userId;
  const doors = userDoors(userId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={`Open admin surfaces for ${heading}`}
          aria-label={`Open admin surfaces for ${heading}`}
          onClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
          }}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            className,
          )}
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-52"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel className="truncate">{heading}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {doors.map(({ id, href, label: doorLabel, icon: Icon }) => (
          <DropdownMenuItem key={id} asChild>
            <AppLink href={href}>
              <Icon className="mr-2 h-4 w-4" /> {doorLabel}
            </AppLink>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminUserRef({
  userId,
  name,
  email,
  hideEmail = false,
  href,
  className,
}: AdminUserRefProps) {
  // Given only an id, look the person up (batched, cached) — an admin never reads a bare id
  // where a person is meant. A caller that passed a name or email costs nothing.
  // A placeholder name ("User", the front of the email) is never a name: the email stands in.
  const passed = usableLabel(name ?? null, email ?? null);
  const looked = useAdminUserLabel(userId, Boolean(passed));
  const shownName = passed || looked.label?.trim() || null;
  const shownEmail = email?.trim() || looked.email?.trim() || null;
  const primary = shownName || shownEmail || null;
  const secondary = !hideEmail && primary !== shownEmail ? shownEmail : null;

  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <div className="min-w-0">
        {primary ? (
          // A real anchor: middle-click / cmd-click open the person's page in a new tab without
          // costing the admin the table; stopPropagation keeps a row click handler from firing.
          // Hover shows THE peek.
          <PeekHoverCard
            label={primary}
            side="bottom"
            trigger={
              <AppLink
                href={href ?? userRecordHref(userId)}
                onClick={(event) => event.stopPropagation()}
                className="block truncate text-sm font-medium hover:text-primary hover:underline"
              >
                {primary}
              </AppLink>
            }
          >
            <AdminUserPeek userId={userId} label={primary} />
          </PeekHoverCard>
        ) : (
          <MatrxUuidCell value={userId} label="User ID" />
        )}
        {secondary ? (
          <div className="truncate type-meta text-muted-foreground">
            {secondary}
          </div>
        ) : null}
      </div>

      <AdminUserDoorControls userId={userId} label={primary ?? userId} />
    </div>
  );
}
