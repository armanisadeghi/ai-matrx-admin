"use client";

// RecordPageHeader — THE internal-page template (page-top template 3 of 4).
//
// ONE line in the shell header, the org/scopes crumb pattern:
//
//   ‹  Forms ▾ ›  Intake form — dental ▾  [badge]     Questions · Responses · Settings     ⇪  …
//   back  parents (link + sibling menu)  record (last crumb)      modes (center)             actions
//
// Never a second line of text, never a title or sentence in the body under it.
// Named options only — no free-form slot a page could restyle. A need this
// API lacks is added HERE as a named option (common-docs/policies/one-ui-system.md).
//
// Phone: back + record name + one "…" holding modes and actions (the shell's ⋮
// sheet). Parents hide below `sm`.
//
// Built on EntityModeHeader (modes, declarative actions, phone sheet) with its
// `trail`; the four templates are documented in features/shell/FEATURE.md
// § Page-top templates. The system page specimen renders THIS component inside
// <HeaderSpecimen>, never a mock.

import { Fragment } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Badge, Button, type BadgeTone } from "@ai-matrx/design-system/controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RouteNavItem } from "@/features/shell/components/header/RouteModeNav";
import {
  EntityModeHeader,
  type EntityHeaderAction,
} from "@/features/shell/components/header/templates/EntityModeHeader";
import type { Crumb, CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";

export type { EntityHeaderAction as RecordPageAction } from "@/features/shell/components/header/templates/EntityModeHeader";
export type { Crumb as RecordPageParent } from "@/features/shell/components/header/templates/CrumbTrailHeader";

/** One item of the record's Actions menu. */
export interface RecordPageMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Items with the same group sit together; a separator falls between groups. */
  group?: string;
}

export interface RecordPageHeaderProps {
  /** Omit on a top-level page (module home, queue, inbox): no back button, just the name. Back fallback when nothing is behind this tab (opened from a link). Usually the module home. */
  backHref?: string;
  /** Levels above the record, outermost first. Each is a link; `options` gives it a sibling menu. */
  parents?: Crumb[];
  /** The record — the LAST crumb. `siblings` turns it into a switcher. */
  record: {
    name: string;
    siblings?: CrumbOption[];
  };
  /** One compact status badge beside the name. */
  status?: { label: string; tone?: BadgeTone };
  /** Sub-views of the record, centered on the line. */
  modes?: RouteNavItem[];
  /** Required when modes differ only by query string. */
  activeModeHref?: string;
  /** Switch modes client-side instead of navigating. */
  onModeSelect?: (href: string) => void;
  /** Declarative actions, lowest priority first; `primary` marks the one main action. */
  actions?: EntityHeaderAction[];
  /**
   * ONE "Actions" menu for every verb the header does not show (the Stripe record pattern: one or
   * two header verbs + one menu, danger items last). Desktop: a menu button on the line; phone:
   * its items join the ⋮ sheet.
   */
  menu?: { label?: string; items: RecordPageMenuItem[] };
}

function RecordActionsMenu({ label, items }: { label: string; items: RecordPageMenuItem[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" iconEnd={<ChevronDown />}>
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item, i) => {
          const Icon = item.icon;
          const newGroup = i > 0 && item.group !== items[i - 1]!.group;
          return (
            <Fragment key={item.id}>
              {newGroup ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem disabled={item.disabled} onClick={item.onPress}>
                <Icon className={item.destructive ? "mr-2 h-4 w-4 text-destructive" : "mr-2 h-4 w-4"} /> {item.label}
              </DropdownMenuItem>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RecordPageHeader({
  backHref,
  parents,
  record,
  status,
  modes,
  activeModeHref,
  onModeSelect,
  actions,
  menu,
}: RecordPageHeaderProps) {
  const menuItems = menu?.items ?? [];
  // Phone: the menu's items are rows of the ⋮ sheet (the desktop menu button is hidden below sm).
  const phoneMenuActions: EntityHeaderAction[] = menuItems.map((item) => ({
    label: item.label,
    icon: item.icon,
    onPress: item.onPress,
    disabled: item.disabled,
    destructive: item.destructive,
    phoneOnly: true,
  }));
  return (
    <EntityModeHeader
      backHref={backHref}
      trail={parents}
      entityLabel={record.name}
      entityOptions={record.siblings}
      entityStatus={
        status ? <Badge tone={status.tone ?? "neutral"}>{status.label}</Badge> : undefined
      }
      modes={modes}
      activeModeHref={activeModeHref}
      onModeSelect={onModeSelect}
      actions={menuItems.length ? [...(actions ?? []), ...phoneMenuActions] : actions}
      rightEnd={menuItems.length ? <RecordActionsMenu label={menu?.label ?? "Actions"} items={menuItems} /> : undefined}
    />
  );
}
