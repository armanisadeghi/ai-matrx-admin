"use client";

import type React from "react";

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

import { type LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@ai-matrx/design-system/controls";
import type { RouteNavItem } from "@/features/shell/components/header/RouteModeNav";
import {
  EntityModeHeader,
  type EntityHeaderAction,
  type EntityModeHeaderProps,
} from "@/features/shell/components/header/templates/EntityModeHeader";
import type { Crumb, CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import { useDerivedTrail } from "@/features/shell/breadcrumbs/useDerivedTrail";
import { useDeclareFrameActions, useInFrame } from "@/features/shell/frame-host/framePageHeader";
import { RouteModeNav } from "@/features/shell/components/header/RouteModeNav";
import { DesktopAction } from "@/features/shell/components/header/templates/EntityModeHeader";
import { RecordActionsMenu, type RecordMenuAction } from "@/components/official/RecordActionsMenu";
import { HostedRecordBar, useHostChromeFor } from "@/features/shell/host-chrome/RecordHostChrome";

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
  /**
   * A LEVEL, not a record: a list, queue or place with no id of its own (`/crm/deals`). Its crumb's
   * door is the derived trail's route siblings (the other places at its level). Pass `level` OR
   * `record`, never both.
   */
  level?: {
    /** Omit to use the derived last crumb's label. */
    name?: string;
  };
  /** The record — the LAST crumb. `siblings` turns it into a switcher. Omit when the page is a `level`. */
  record?: {
    /** Omit to use the derived last crumb (the address's key, the declared name, else the short id). */
    name?: string;
    siblings?: CrumbOption[];
    /** Type token + id of the record: "Add to my menu" then adds the record itself (current-record). */
    token?: string;
    id?: string;
  };
  /** One compact status badge beside the name. */
  status?: { label: string; tone?: BadgeTone };
  /**
   * A LIVE status beside the name, after the badge — a control that reports on the record and opens
   * its own detail (the `IntelligenceIndicator`: the AI jobs that work on this record). Drawn on the
   * classic line, in the frame header and in a host bar alike; never an action (those go in `actions`).
   */
  indicator?: React.ReactNode;
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

/** A page-header menu item as the one record menu takes it. */
const menuAction = (item: RecordPageMenuItem): RecordMenuAction => ({
  id: item.id,
  label: item.label,
  icon: item.icon,
  onPress: item.onPress,
  destructive: item.destructive,
  disabled: item.disabled,
  hint: item.hint,
  group: item.group,
});

/**
 * The record's header inside a HOST (a board tile, a window — `RecordHostChrome`): the host's bar names
 * the record and offers Open, so this is ONE compact row of what only the record has — its status, its
 * modes, its actions and its Actions menu. No back, no crumbs, nothing in the shell header (the record
 * is not the page).
 */
function HostedRecordPageHeader({
  record = {},
  status,
  indicator,
  modes,
  activeModeHref,
  onModeSelect,
  actions,
  menu,
}: RecordPageHeaderProps) {
  const menuItems = menu?.items ?? [];
  const visible = (actions ?? []).filter((a) => !a.phoneOnly);
  return (
    <HostedRecordBar
      record={record.token && record.id ? { token: record.token, id: record.id } : null}
      name={record.name ? <span className="truncate text-sm font-medium text-foreground">{record.name}</span> : undefined}
      actions={
        visible.length || menuItems.length ? (
          <>
            {visible.map((a) => (
              <DesktopAction key={a.label} action={a} />
            ))}
            {/* The one record overflow for a host bar (shared with the meeting and sandbox bars). */}
            <RecordActionsMenu label={menu?.label ?? "Actions"} actions={menuItems.map(menuAction)} />
          </>
        ) : undefined
      }
    >
      {status ? <Badge tone={status.tone ?? "neutral"}>{status.label}</Badge> : null}
      {indicator}
      {modes?.length ? <RouteModeNav items={modes} activeHref={activeModeHref} onNavigate={onModeSelect} maxVariant="menu" /> : null}
    </HostedRecordBar>
  );
}

export function RecordPageHeader(props: RecordPageHeaderProps) {
  // In a host (board tile, window) the record is not the page: one compact in-body row instead.
  const ref = props.record?.token && props.record.id ? { token: props.record.token, id: props.record.id } : null;
  const host = useHostChromeFor(ref);
  return host ? <HostedRecordPageHeader {...props} /> : <PageRecordHeader {...props} />;
}

function PageRecordHeader({
  backHref,
  parents,
  level,
  record: declaredRecord,
  status,
  indicator,
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
  const record: NonNullable<RecordPageHeaderProps["record"]> = declaredRecord ?? { name: level?.name };
  const derived = useDerivedTrail({ recordName: record.name });
  const trail = parents ?? derived.slice(0, -1);
  const own = derived[derived.length - 1];
  const recordName = record.name ?? own?.label ?? "";
  // A level's door is the siblings the derived trail already has for its last crumb (the menu's
  // rows at its level, else the route tree loaded when the door first opens).
  const isLevel = Boolean(level) && !declaredRecord;
  const levelOptions = isLevel ? own?.options : undefined;
  const levelLoadOptions = isLevel ? own?.loadOptions : undefined;
  // THE NEW APP FRAME: the Actions menu's items are the frame's "…" items (desktop and phone), so
  // the line carries no second menu. Classic: no frame, nothing declared.
  const inFrame = useInFrame();
  useDeclareFrameActions(
    inFrame && menuItems.length
      ? menuItems.map((item) => ({
          id: `record-menu:${item.id}`,
          label: item.label,
          icon: item.icon,
          onSelect: item.onPress,
          destructive: item.destructive,
          disabled: item.disabled,
        }))
      : null,
  );
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
      entityOptions={record.siblings ?? levelOptions}
      entityLoadOptions={levelLoadOptions}
      entityStatus={
        status || indicator ? (
          <>
            {status ? <Badge tone={status.tone ?? "neutral"}>{status.label}</Badge> : null}
            {indicator}
          </>
        ) : undefined
      }
      modes={modes}
      activeModeHref={activeModeHref}
      onModeSelect={onModeSelect}
      steps={steps}
      actions={menuItems.length && !inFrame ? [...(actions ?? []), ...phoneMenuActions] : actions}
      rightEnd={menuItems.length && !inFrame ? <RecordActionsMenu label={menu?.label ?? "Actions"} triggerLabel={menu?.label ?? "Actions"} actions={menuItems.map(menuAction)} /> : undefined}
    />
  );
}
