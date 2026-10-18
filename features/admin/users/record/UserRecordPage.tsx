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
import { RegionSkeleton, Tabs } from "@ai-matrx/design-system/controls";
import { CopyForAiAction } from "@/features/admin/attention/CopyForAiAction";
import {
  RecordPageHeader,
  type RecordPageAction,
  type RecordPageMenuItem,
} from "@/features/shell/components/header/templates/RecordPageHeader";
import { useRecordTitle } from "@/lib/record-title/record-title";
import { recordToast } from "@/lib/toast";
import { personStatus } from "../lib/accountStatus";
import { personChanged, useUserActions, type UserActions, type UserActionSubject } from "./useUserActions";
import { actionSubjectOf, fetchUserOverview, personTitle, type UserOverview } from "./userOverview";
import { UserOverviewTab } from "./UserOverviewTab";
import { UserOrganizationsTab } from "./UserOrganizationsTab";
import { UserBillingTab } from "./UserBillingTab";
import { UserPreferencesTab } from "./UserPreferencesTab";
import { UserAcquisitionTab } from "./UserAcquisitionTab";
import { UserSupportTab } from "./UserSupportTab";
import { UserHistoryTab } from "./UserHistoryTab";
import { UserActivityTab } from "./UserActivityTab";
import { UserContentTab } from "./UserContentTab";
import { UserNotesTab } from "./UserNotesTab";
import { UserSecurityTab } from "./UserSecurityTab";
import { UserRecordSurface } from "./UserRecordSurface";
import {
  USERS_HUB_PATH,
  USER_ACTION_PARAM,
  isUserActionId,
  isVisibleUserTab,
  userActions,
  userRecordHref,
  visibleUserTabs,
  type UserActionId,
  type UserTabId,
} from "./userSurfaces";

export interface UserTabBodyProps {
  userId: string;
  overview: UserOverview;
  /** The page's version: every tab loader keys on it, so a change anywhere refreshes the open tab. */
  version: number;
  /** Something about this person changed: every held copy drops it and the page + tab re-read. */
  reload: () => void;
  /** THE dispatch (useUserActions) — tabs run registered actions through it, never their own copy. */
  actions: UserActions;
  /** The person as the actions' subject. */
  subject: UserActionSubject;
  /** What this tab shows, for Copy for AI (the page copies overview + the open tab's data). */
  shareForAi: (data: unknown) => void;
}

// The body of every BUILT tab (userSurfaces.ts `built: true`). Overview renders inline below because
// it needs the page's reopen action. Each body mounts only while its tab is open, so it reads its
// own data then — nothing is fetched for a closed tab.
const TAB_BODIES: Partial<Record<UserTabId, ComponentType<UserTabBodyProps>>> = {
  organizations: UserOrganizationsTab,
  billing: UserBillingTab,
  preferences: UserPreferencesTab,
  acquisition: UserAcquisitionTab,
  support: UserSupportTab,
  history: UserHistoryTab,
  activity: UserActivityTab,
  content: UserContentTab,
  notes: UserNotesTab,
  security: UserSecurityTab,
};

/** The tab segment of `/administration/users/<id>/<tab>`, or undefined on Overview. */
function tabFromPath(pathname: string, userId: string): string | undefined {
  const base = `${USERS_HUB_PATH}/${encodeURIComponent(userId)}`;
  if (!pathname.startsWith(`${base}/`)) return undefined;
  return decodeURIComponent(pathname.slice(base.length + 1)) || undefined;
}

export function UserRecordPage({ userId, tab: tabProp }: { userId: string; tab?: string }) {
  const router = useRouter();
  // Rendered by the [id] layout, so it stays mounted across tabs and reads the tab from the address.
  const pathname = usePathname();
  const tab = tabProp ?? tabFromPath(pathname, userId);
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
  const activeTab: UserTabId = isVisibleUserTab(tab) ? tab : "overview";
  useEffect(() => {
    if (tab && !isVisibleUserTab(tab)) router.replace(userRecordHref(userId));
  }, [tab, userId, router]);

  const title = overview ? personTitle(overview) : null;
  useRecordTitle(title);

  const subject = overview ? actionSubjectOf(overview) : null;
  const label = title ?? "this person";

  // What the open tab shows, for Copy for AI (read at click time; never re-renders the page).
  const tabData = useRef<{ tab: UserTabId; data: unknown } | null>(null);

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

  const tabs = visibleUserTabs();
  const Body = activeTab === "overview" ? null : TAB_BODIES[activeTab];

  return (
    <UserRecordSurface overview={overview} activeTab={activeTab}>
      <RecordPageHeader
        backHref={USERS_HUB_PATH}
        parents={[{ label: "Users & Access", href: USERS_HUB_PATH }]}
        // access-errors: ok — admin.user_overview reads auth.users as SECURITY DEFINER (no RLS): no row is no account.
        record={{ name: title ?? (loading ? "User" : "User not found") }}
        status={status}
        actions={headerActions}
        menu={menuItems.length ? { items: menuItems } : undefined}
      />
      <div className="h-full overflow-y-auto px-4 pt-4 sm:px-6" data-matrx-page-scroll="" data-testid="user-record">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-6">
          {!validId ? (
            <ErrorNotice size="inline" message="That address does not name an account." error={`Not a user id: ${userId}`} operation="Open user" />
          ) : error ? (
            <ErrorNotice size="inline" message={error} error={error} operation="Read user overview" calls={["admin.user_overview"]} />
          ) : null}

          {loading && !overview ? <RegionSkeleton shape="cards" count={6} aria-label="Loading user" /> : null}

          {overview ? (
            <>
              <div className="flex items-end justify-between gap-3">
                {tabs.length > 1 ? (
                  <Tabs<UserTabId>
                    aria-label="User sections"
                    value={activeTab}
                    onValueChange={(next) => router.push(userRecordHref(userId, next))}
                    data={tabs.map((t) => ({ value: t.id, label: t.label }))}
                  />
                ) : (
                  <span />
                )}
                <CopyForAiAction
                  label="User"
                  agent={() => {
                    const shown = tabData.current?.tab === activeTab ? tabData.current.data : undefined;
                    return {
                      kind: "admin-user",
                      location: userRecordHref(userId, activeTab),
                      description: "One person's admin record and the open tab.",
                      attributes: { id: overview.identity.id, email: overview.identity.email ?? "", tab: activeTab },
                      data: shown === undefined ? overview : { overview, [activeTab]: shown },
                    };
                  }}
                />
              </div>
              {activeTab === "overview" ? (
                <UserOverviewTab overview={overview} onReopen={() => run("reopen")} />
              ) : Body && subject ? (
                <Body
                  key={activeTab}
                  userId={userId}
                  overview={overview}
                  version={version}
                  reload={reload}
                  actions={actions}
                  subject={subject}
                  shareForAi={(data) => {
                    tabData.current = { tab: activeTab, data };
                  }}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {actions.dialogs}
    </UserRecordSurface>
  );
}
