// THE ONE REGISTRY of a person's admin surfaces (users one-roof, 2026-10-17; plan attack F8):
// the tabs of /administration/users/<id> and the actions on that person. The record page reads it;
// the roster's Manage menu, the name chip's door menu and the right-click section move onto it in
// lane C — never a fourth hand-copied list.
//
// TABS. Every tab is registered here with its deep link (/administration/users/<id> for Overview,
// /administration/users/<id>/<tab> for the rest). A tab whose body is not built yet carries
// `built: false`: it is hidden everywhere (the tab row, the route — an unbuilt /<tab> address shows
// Overview's "not a tab" state, never an empty tab). Lane B2 flips `built` in the same commit that
// adds the body to `UserRecordPage`'s TAB_BODIES. Never ship an empty tab.
//
// ACTIONS. Header verbs (`placement: "header"`) are the page's one or two main moves; everything
// else is the one Actions menu, in `group` order, `danger` last. ONE dispatch runs them all:
// `useUserActions().run(id, person)` (record/useUserActions.tsx) owns every handler and dialog; the
// page, its tabs and the roster's Manage menu call it and never switch on an action id themselves
// (guard: __tests__/one-user-door-registry.test.ts).

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Gauge,
  Gem,
  Gift,
  GraduationCap,
  History,
  Activity,
  FolderOpen,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  MailCheck,
  MailPlus,
  MessageSquare,
  ShieldCheck,
  SlidersHorizontal,
  StickyNote,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  WalletCards,
} from "lucide-react";
import { usagePersonHref } from "@/features/admin/usage-drill/usageLinks";
import { orgAdminHref, orgAdminMemberHref } from "@/features/organizations/admin/routes";

export const USERS_HUB_PATH = "/administration/users";

// ── SCOPE: whose seat is looking ────────────────────────────────────────────────────────────────
//
// The same page serves two seats (Arman 2026-10-18): platform admins at /administration/users/<id>,
// and an organization's owners and admins at /organizations/<slug>/admin/users/<id>, who see only
// that organization's slice — the tabs marked for it below, read through the org-gated
// iam.org_admin_member_* / public.org_admin_* RPCs, with the org seat's own actions.

export type UserRecordScope =
  | { kind: "platform" }
  | { kind: "organization"; orgId: string; orgSlug: string; orgName: string };

export const PLATFORM_SCOPE: UserRecordScope = { kind: "platform" };

/** Where this seat's people live: the platform hub, or the organization's admin page. */
export function scopeHubPath(scope: UserRecordScope): string {
  return scope.kind === "platform" ? USERS_HUB_PATH : orgAdminHref(scope.orgSlug);
}

function recordBase(userId: string, scope: UserRecordScope): string {
  return scope.kind === "platform"
    ? `${USERS_HUB_PATH}/${encodeURIComponent(userId)}`
    : orgAdminMemberHref(scope.orgSlug, encodeURIComponent(userId));
}

export type UserTabId =
  | "overview"
  | "activity"
  | "organizations"
  | "billing"
  | "preferences"
  | "acquisition"
  | "support"
  | "content"
  | "notes"
  | "security"
  | "history";

export interface UserTab {
  id: UserTabId;
  label: string;
  icon: LucideIcon;
  /** False until the tab's body exists; unbuilt tabs are hidden (see the header). */
  built: boolean;
  /** Shown to an organization's admins too (that organization's slice only). */
  inOrganization?: boolean;
  /** The organization seat's label, where its slice is a different thing. */
  organizationLabel?: string;
}

export const USER_TABS: readonly UserTab[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, built: true, inOrganization: true },
  { id: "activity", label: "Activity", icon: Activity, built: true, inOrganization: true },
  { id: "billing", label: "Billing & usage", icon: WalletCards, built: true },
  { id: "organizations", label: "Organizations", icon: Building2, built: true },
  { id: "content", label: "Content", icon: FolderOpen, built: true, inOrganization: true },
  { id: "support", label: "Support sessions", icon: LifeBuoy, built: true, inOrganization: true, organizationLabel: "Feedback" },
  { id: "notes", label: "Notes", icon: StickyNote, built: true, inOrganization: true },
  { id: "security", label: "Security", icon: ShieldCheck, built: true },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal, built: true },
  { id: "acquisition", label: "Acquisition", icon: UserPlus, built: true },
  { id: "history", label: "Admin history", icon: History, built: true, inOrganization: true },
];

const TAB_IDS = new Set<string>(USER_TABS.map((t) => t.id));

export function isUserTabId(value: string | null | undefined): value is UserTabId {
  return value != null && TAB_IDS.has(value);
}

function inScope(t: UserTab, scope: UserRecordScope): boolean {
  return t.built && (scope.kind === "platform" || t.inOrganization === true);
}

/** The tabs this seat sees, in order — only built ones, labeled for the seat. */
export function visibleUserTabs(scope: UserRecordScope = PLATFORM_SCOPE): UserTab[] {
  return USER_TABS.filter((t) => inScope(t, scope)).map((t) =>
    scope.kind === "organization" && t.organizationLabel ? { ...t, label: t.organizationLabel } : t,
  );
}

/** True when `tab` names a registered tab whose body exists for this seat. */
export function isVisibleUserTab(tab: string | null | undefined, scope: UserRecordScope = PLATFORM_SCOPE): tab is UserTabId {
  return isUserTabId(tab) && USER_TABS.some((t) => t.id === tab && inScope(t, scope));
}

/** THE address of one person's record for this seat (Overview when no tab). */
export function userRecordHref(userId: string, tab: UserTabId = "overview", scope: UserRecordScope = PLATFORM_SCOPE): string {
  const base = recordBase(userId, scope);
  return tab === "overview" ? base : `${base}/${tab}`;
}

export type UserActionId =
  | "support_session"
  | "message"
  | "email"
  | "magic_link"
  | "verify_email"
  | "password_reset"
  | "change_plan"
  | "free_months"
  | "tutorial"
  | "mcp_access"
  | "top_tier"
  | "onboarded"
  | "sign_out_everywhere"
  | "close"
  | "reopen";

export type UserActionGroup = "contact" | "plan" | "access" | "danger";

export interface UserActionDef {
  id: UserActionId;
  label: string;
  icon: LucideIcon;
  /** `header`: a visible header verb; `menu`: inside the one Actions menu. */
  placement: "header" | "menu";
  group: UserActionGroup;
  danger?: boolean;
  /**
   * False when the action's server door is not live yet: it is left out everywhere (never a dead
   * button).
   */
  live: boolean;
}

export const USER_ACTIONS: readonly UserActionDef[] = [
  { id: "support_session", label: "Start support session", icon: LifeBuoy, placement: "header", group: "contact", live: true },
  { id: "message", label: "Message", icon: MessageSquare, placement: "header", group: "contact", live: true },
  { id: "email", label: "Email user", icon: Mail, placement: "menu", group: "contact", live: true },
  { id: "magic_link", label: "Send magic link", icon: MailPlus, placement: "menu", group: "contact", live: true },
  { id: "password_reset", label: "Send password reset", icon: KeyRound, placement: "menu", group: "contact", live: true },
  { id: "change_plan", label: "Change plan…", icon: WalletCards, placement: "menu", group: "plan", live: true },
  { id: "free_months", label: "Give free months…", icon: Gift, placement: "menu", group: "plan", live: true },
  { id: "tutorial", label: "Send a tutorial…", icon: GraduationCap, placement: "menu", group: "plan", live: true },
  { id: "mcp_access", label: "Full MCP access", icon: KeyRound, placement: "menu", group: "access", live: true },
  { id: "top_tier", label: "Top-tier models", icon: Gem, placement: "menu", group: "access", live: true },
  { id: "verify_email", label: "Mark email verified", icon: MailCheck, placement: "menu", group: "access", live: true },
  { id: "onboarded", label: "Onboarding", icon: UserCog, placement: "menu", group: "access", live: true },
  { id: "sign_out_everywhere", label: "Sign out everywhere…", icon: LogOut, placement: "menu", group: "danger", danger: true, live: true },
  { id: "close", label: "Close account…", icon: UserX, placement: "menu", group: "danger", danger: true, live: true },
  { id: "reopen", label: "Reopen account", icon: UserCheck, placement: "menu", group: "danger", live: true },
];

const GROUP_ORDER: readonly UserActionGroup[] = ["contact", "plan", "access", "danger"];

/** Live actions for one placement, in menu order (danger last). */
export function userActions(placement: UserActionDef["placement"]): UserActionDef[] {
  return USER_ACTIONS.filter((a) => a.live && a.placement === placement).sort(
    (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
  );
}

/**
 * A door that RUNS one of the page's actions (lane L, 2026-10-18): the person's page opened with
 * `?do=<action>` runs that action once it has loaded — the same dialog its header opens — then drops
 * the parameter. For a surface that cannot hold the dialog itself (a hover peek unmounts when a
 * dialog takes focus). The page refuses an action that is not live or not allowed for this person.
 */
export const USER_ACTION_PARAM = "do";

export function userActionHref(userId: string, action: UserActionId): string {
  return `${userRecordHref(userId)}?${USER_ACTION_PARAM}=${encodeURIComponent(action)}`;
}

export function isUserActionId(value: string | null): value is UserActionId {
  return USER_ACTIONS.some((a) => a.id === value && a.live);
}

export function userActionDef(id: UserActionId): UserActionDef {
  const def = USER_ACTIONS.find((a) => a.id === id);
  if (!def) throw new Error(`userSurfaces: no action "${id}"`);
  return def;
}

// ── DOORS: every place a person's name can take an admin ────────────────────────────────────────
//
// THE one door list (lane C, 2026-10-17). The name chip's menu (AdminUserRef), the right-click
// section (admin-user-menu-section) and the roster's Manage menu all render THIS. The tabs come
// first (each one is a deep link into the person's page); a hub page appears only where no tab
// replaces it: the usage explorer on this person, the admins page, the email composer.
// A guard (`__tests__/one-user-door-registry.test.ts`) fails if any of those three files declares
// its own door list again.

export type UserDoorId = UserTabId | "usage" | "admin_level" | "email";

export interface UserDoor {
  id: UserDoorId;
  label: string;
  icon: LucideIcon;
  href: string;
  /** The same move exists as a registered action: a menu that renders actions leaves the door out. */
  action?: UserActionId;
}

/** The email composer, addressed to one person. */
export function userEmailHref(userId: string): string {
  return `${USERS_HUB_PATH}/email?userId=${encodeURIComponent(userId)}`;
}

/** Every door for one person, in menu order: the page's tabs, then the hub pages no tab replaces. */
export function userDoors(userId: string, options: { withoutActions?: boolean } = {}): UserDoor[] {
  const tabs: UserDoor[] = visibleUserTabs().map((tab) => ({
    id: tab.id,
    label: tab.id === "overview" ? "Open page" : tab.label,
    icon: tab.icon,
    href: userRecordHref(userId, tab.id),
  }));
  const hubs: UserDoor[] = [
    { id: "usage", label: "Usage explorer", icon: Gauge, href: usagePersonHref(userId) },
    {
      id: "admin_level",
      label: "Admin level",
      icon: ShieldCheck,
      href: `${USERS_HUB_PATH}/admins?user=${encodeURIComponent(userId)}`,
    },
    { id: "email", label: "Email user", icon: Mail, href: userEmailHref(userId), action: "email" },
  ];
  const all = [...tabs, ...hubs];
  return options.withoutActions ? all.filter((door) => !door.action) : all;
}

// ── ACTION STATE: the label and the "can't right now" rule for one person ───────────────────────
//
// THE rules for every menu that lists USER_ACTIONS for a person (the record page's header and
// Actions menu, the roster's Manage menu, the peek's action doors). A blocked action stays in the
// menu, disabled, with its reason (`userActionBlocked`) beside it — never a silent gray item.

export interface UserActionState {
  id: string;
  email: string | null;
  is_anonymous: boolean;
  banned: boolean;
  erased: boolean;
  admin_level: string | null;
  mcp_full_access: boolean;
  top_tier_models: boolean;
  onboarding_completed: boolean;
  /** The email address is verified (auth.users.email_confirmed_at is set). */
  email_confirmed: boolean;
}

export interface UserActionContext {
  /** The signed-in admin (their own account is never closed or signed out from here). */
  myId: string | null | undefined;
}

/** The label an action shows for this person right now, or null to leave it out. */
export function userActionLabel(id: UserActionId, subject: UserActionState): string | null {
  switch (id) {
    case "mcp_access":
      return subject.admin_level
        ? userActionDef(id).label
        : subject.mcp_full_access
          ? "Revoke full MCP access"
          : "Grant full MCP access";
    case "top_tier":
      return subject.top_tier_models ? "Turn off top-tier models" : "Allow top-tier models";
    case "onboarded":
      return subject.onboarding_completed ? "Mark as new" : "Mark as onboarded";
    case "verify_email":
      return subject.email_confirmed ? null : userActionDef(id).label;
    case "close":
      return subject.banned ? null : "Close account…";
    case "reopen":
      return subject.banned ? "Reopen account" : null;
    default:
      return userActionDef(id).label;
  }
}

const NO_ACCOUNT = "Guest — no account";

/** Why the action cannot run for this person now (shown beside it, disabled), or null when it can. */
export function userActionBlocked(
  id: UserActionId,
  subject: UserActionState,
  context: UserActionContext,
): string | null {
  const own = subject.id === context.myId;
  switch (id) {
    case "support_session":
    case "magic_link":
    case "password_reset":
    case "email":
    case "verify_email":
      return subject.is_anonymous ? NO_ACCOUNT : subject.email ? null : "No email address";
    case "message":
    case "change_plan":
    case "free_months":
    case "tutorial":
    case "top_tier":
      return subject.is_anonymous ? NO_ACCOUNT : null;
    case "mcp_access":
      return subject.admin_level ? "Inherited from admin" : null;
    case "close":
      return own && !subject.banned ? "Your own account" : null;
    case "reopen":
      return subject.erased ? "Erased — cannot reopen" : null;
    case "sign_out_everywhere":
      return own ? "Your own account" : null;
    default:
      return null;
  }
}

/** True when the action cannot run for this person now (shown, disabled). */
export function userActionDisabled(id: UserActionId, subject: UserActionState, context: UserActionContext): boolean {
  return userActionBlocked(id, subject, context) !== null;
}

/** Every live action in menu order — header verbs first, then the Actions menu (danger last). */
export function allUserActions(): UserActionDef[] {
  return [...userActions("header"), ...userActions("menu")];
}
