"use client";

// THE ONE PAGE for one person in platform admin (/administration/users/<id>[/<tab>]; users one-roof,
// Arman 2026-10-17). The record-page pattern every admin record follows (SpendAlarmRecordPage,
// HeldRunView): RecordPageHeader (back + crumbs + name + status + the header verbs + ONE Actions
// menu), a Copy-for-AI of the whole record, and the tab bodies the registry (userSurfaces.ts) says
// are built. Data: admin.user_overview, one call.

import { useRecordLoad } from "./useRecordLoad";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { ErrorNotice } from "@ai-matrx/design-system";
import type { RecordPageAction, RecordPageMenuItem } from "@/features/shell/components/header/templates/RecordPageHeader";
import { recordToast } from "@/lib/toast";
import { OrgMemberRecord } from "@/features/organizations/admin/components/OrgMemberRecord";
import { personStatus } from "../lib/accountStatus";
import { personChanged, useUserActions, type UserActions, type UserActionSubject } from "./useUserActions";
import { actionSubjectOf, fetchUserOverview, personTitle, type UserOverview } from "./userOverview";
import { UserOverviewTab } from "./UserOverviewTab";
import { UserOrganizationsTab } from "./UserOrganizationsTab";
import { UserBillingTab } from "./UserBillingTab";
import { UserPreferencesTab } from "./UserPreferencesTab";
import { UserAcquisitionTab } from "./UserAcquisitionTab";
import { UserSecurityTab } from "./UserSecurityTab";
import { UserRecordSurface } from "./UserRecordSurface";
import { SCOPED_TAB_BODIES } from "./scopedTabBodies";
import { UserRecordFrame, activeTabOf, tabFromPath } from "./UserRecordFrame";
import {
  PLATFORM_SCOPE,
  USERS_HUB_PATH,
  USER_ACTION_PARAM,
  isUserActionId,
  userActions,
  userRecordHref,
  type UserActionId,
  type UserRecordScope,
  type UserTabId,
} from "./userSurfaces";

/** What every tab gets, from either seat (the platform page or an organization's member page). */
export interface ScopedTabBodyProps {
  userId: string;
  /** Whose seat is looking: an organization's tabs read only that organization's slice. */
  scope: UserRecordScope;
  /** What the page calls this person. */
  personName: string;
  /** The page's version: every tab loader keys on it, so a change anywhere refreshes the open tab. */
  version: number;
  /** Something about this person changed: every held copy drops it and the page + tab re-read. */
  reload: () => void;
  /** What this tab shows, for Copy for AI (the page copies the record + the open tab's data). */
  shareForAi: (data: unknown) => void;
  /** Platform seat only: THE dispatch (useUserActions) and its subject. */
  actions?: UserActions;
  subject?: UserActionSubject;
}


/** A platform-only tab: the scoped props plus the person's admin overview and the dispatch. */
export interface UserTabBodyProps extends ScopedTabBodyProps {
  overview: UserOverview;
  /** THE dispatch (useUserActions) — tabs run registered actions through it, never their own copy. */
  actions: UserActions;
  /** The person as the actions' subject. */
  subject: UserActionSubject;
}

// The body of every BUILT tab (userSurfaces.ts `built: true`). Overview renders inline below because
// it needs the page's reopen action. Each body mounts only while its tab is open, so it reads its
// own data then — nothing is fetched for a closed tab.
const TAB_BODIES: Partial<Record<UserTabId, ComponentType<UserTabBodyProps> | ComponentType<ScopedTabBodyProps>>> = {
  ...SCOPED_TAB_BODIES,
  organizations: UserOrganizationsTab,
  billing: UserBillingTab,
  preferences: UserPreferencesTab,
  acquisition: UserAcquisitionTab,
  security: UserSecurityTab,
};

/**
 * THE page for one person. `scope` says whose seat: platform admins (default), or one
 * organization's owners and admins, who get the same frame and tabs over that organization's slice
 * with the org seat's actions (OrgMemberRecord).
 */
export function UserRecordPage({ userId, tab, scope = PLATFORM_SCOPE }: { userId: string; tab?: string; scope?: UserRecordScope }) {
  return scope.kind === "organization" ? (
    <OrgMemberRecord userId={userId} tab={tab} scope={scope} />
  ) : (
    <PlatformUserRecord userId={userId} tab={tab} />
  );
}

function PlatformUserRecord({ userId, tab: tabProp }: { userId: string; tab?: string }) {
  const router = useRouter();
  // Rendered by the [id] layout, so it stays mounted across tabs and reads the tab from the address.
  const pathname = usePathname();
  const tab = tabProp ?? tabFromPath(pathname, userId, PLATFORM_SCOPE);
  const validId = isUuidShape(userId);
  const [version, setVersion] = useState(0);
  const { data: overview, loading, error: loadError } = useRecordLoad(fetchUserOverview, userId, version, validId);
  // access-errors: ok — admin.user_overview is SECURITY DEFINER over auth.users (no RLS), so null means no such account.
  const error: string | null = loadError
    ? loadError instanceof Error
      ? loadError.message
      : String(loadError)
    : !loading && validId && !overview
      ? "No account with this id"
      : null;

  const reload = () => {
    personChanged(userId);
    setVersion((v) => v + 1);
  };
  // Every action already ran personChanged; the page and its open tab re-read.
  const actions = useUserActions({ onChanged: () => setVersion((v) => v + 1) });

  // A tab that is not registered, or not built yet, is never an empty page: it opens Overview.
  const activeTab: UserTabId = activeTabOf(tab, PLATFORM_SCOPE);

  const title = overview ? personTitle(overview) : null;

  const subject = overview ? actionSubjectOf(overview) : null;
  const label = title ?? "this person";

  const run = (id: UserActionId) => {
    if (subject) actions.run(id, subject);
  };

  // `?do=<action>` (userActionHref — the peek's action doors): run it once the person has loaded,
  // exactly as the header would, then drop the parameter so a reload does not run it again. The
  // run is deferred to a microtask — it opens dialogs (state) and moves the address, neither of
  // which belongs in the effect's own body.
  const searchParams = useSearchParams();
  const requestedAction = searchParams.get(USER_ACTION_PARAM);
  const handledAction = useRef<string | null>(null);
  useEffect(() => {
    // Once the parameter is gone the next `?do=` (even the same action) runs again (F7).
    if (!requestedAction) {
      handledAction.current = null;
      return;
    }
    if (!subject || handledAction.current === requestedAction) return;
    handledAction.current = requestedAction;
    const id = isUserActionId(requestedAction) ? requestedAction : null;
    void Promise.resolve().then(() => {
      if (id) actions.run(id, subject);
      else recordToast.warning({ type: "user", id: userId, title: label }, `${label}: that action isn't available`);
      router.replace(userRecordHref(userId, activeTab));
    });
  });

  // Label and "can't now, because…" come from the registry through the one dispatch, so the page,
  // the peek and the Accounts "Manage" menu never disagree.
  const headerActions: RecordPageAction[] = subject
    ? userActions("header").map((def) => ({
        label: def.label,
        icon: def.icon,
        showLabel: true,
        disabled: actions.blockedReason(def.id, subject) !== null,
        onPress: () => run(def.id),
      }))
    : [];

  const menuItems: RecordPageMenuItem[] = subject
    ? userActions("menu").flatMap((def) => {
        const itemLabel = actions.labelFor(def.id, subject);
        if (!itemLabel) return [];
        const blocked = actions.blockedReason(def.id, subject);
        return [
          {
            id: def.id,
            label: itemLabel,
            icon: def.icon,
            group: def.group,
            destructive: def.danger,
            disabled: blocked !== null,
            hint: blocked ?? undefined,
            onPress: () => run(def.id),
          },
        ];
      })
    : [];

  const status = subject ? personStatus(subject) : undefined;

  return (
    <UserRecordSurface overview={overview} activeTab={activeTab}>
      <UserRecordFrame
        userId={userId}
        scope={PLATFORM_SCOPE}
        tab={tab}
        title={title}
        backHref={USERS_HUB_PATH}
        parents={[{ label: "Users & Access", href: USERS_HUB_PATH }]}
        // access-errors: ok — admin.user_overview reads auth.users as SECURITY DEFINER (no RLS): no row is no account.
        placeholderName={{ loading: "User", missing: "User not found" }}
        loading={loading}
        status={status}
        actions={headerActions}
        menuItems={menuItems}
        notices={
          !validId ? (
            <ErrorNotice size="inline" message="That address does not name an account." error={`Not a user id: ${userId}`} operation="Open user" />
          ) : error ? (
            <ErrorNotice size="inline" message={error} error={error} operation="Read user overview" calls={["admin.user_overview"]} />
          ) : null
        }
        ready={overview !== null}
        copyForAi={{
          label: "User",
          kind: "admin-user",
          description: "One person's admin record and the open tab.",
          attributes: { id: overview?.identity.id ?? userId, email: overview?.identity.email ?? "" },
          data: overview,
        }}
        renderTab={(open, shareForAi) => {
          if (!overview || !subject) return null;
          if (open === "overview") return <UserOverviewTab overview={overview} onReopen={() => run("reopen")} />;
          const Body = TAB_BODIES[open];
          return Body ? (
            <Body
              key={open}
              userId={userId}
              scope={PLATFORM_SCOPE}
              personName={personTitle(overview)}
              overview={overview}
              version={version}
              reload={reload}
              actions={actions}
              subject={subject}
              shareForAi={shareForAi}
            />
          ) : null;
        }}
        dialogs={actions.dialogs}
      />
    </UserRecordSurface>
  );
}
