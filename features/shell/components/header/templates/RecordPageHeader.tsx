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
  type EntityModeHeaderProps,
} from "@/features/shell/components/header/templates/EntityModeHeader";
import type { Crumb, CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { useDerivedTrail } from "@/features/shell/breadcrumbs/useDerivedTrail";

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
  /** Why a disabled item can't run now (≤30 chars), shown beside it in the menu. */
  hint?: string;
  /** Items with the same group sit together; a separator falls between groups. */
  group?: string;
}

export interface RecordPageHeaderProps {
  /** Omit on a top-level page (module home, queue, inbox): no back button, just the name. Back fallback when nothing is behind this tab (opened from a link). Usually the module home. */
  backHref?: string;
  /**
   * @deprecated Do not pass. The levels above the record are DERIVED from the address, the menu and
   * the route tree (feature-pages rule 7; `pnpm check:derived-breadcrumbs`). Existing hand-typed
   * trails sit in that guard's shrink-only baseline.
   */
  parents?: Crumb[];
  /** The record — the LAST crumb. `siblings` turns it into a switcher. */
  record: {
    /** Omit to use the derived last crumb (the address's key, the declared name, else the short id). */
    name?: string;
    siblings?: CrumbOption[];
    /** Type token + id of the record: "Add to my menu" then adds the record itself (current-record). */
    token?: string;
    id?: string;
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
  /** Where the person is on a short path, centered on the line (a page with no modes). */
  steps?: EntityModeHeaderProps["steps"];
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
                {item.disabled && item.hint ? <span className="ml-auto pl-4 type-meta">{item.hint}</span> : null}
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
  steps,
}: RecordPageHeaderProps) {
  const menuItems = menu?.items ?? [];
  // THE DERIVED TRAIL: every level above the record comes from the address + menu; a page supplies
  // only its record. The last derived crumb is the record itself (named by `record.name` when given).
  const derived = useDerivedTrail({ recordName: record.name });
  const trail = parents ?? derived.slice(0, -1);
  const recordName = record.name ?? derived[derived.length - 1]?.label ?? "";
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
      trail={trail}
      entityLabel={recordName}
      entityRecord={record.token && record.id ? { token: record.token, id: record.id } : undefined}
      entityOptions={record.siblings}
      entityStatus={
        status ? <Badge tone={status.tone ?? "neutral"}>{status.label}</Badge> : undefined
      }
      modes={modes}
      activeModeHref={activeModeHref}
      onModeSelect={onModeSelect}
      steps={steps}
      actions={menuItems.length ? [...(actions ?? []), ...phoneMenuActions] : actions}
      rightEnd={menuItems.length ? <RecordActionsMenu label={menu?.label ?? "Actions"} items={menuItems} /> : undefined}
    />
  );
}
