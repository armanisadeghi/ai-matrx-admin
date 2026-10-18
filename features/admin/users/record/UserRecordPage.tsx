"use client";

// THE ONE PAGE for one person in platform admin (/administration/users/<id>[/<tab>]; users one-roof,
// Arman 2026-10-17). The record-page pattern every admin record follows (SpendAlarmRecordPage,
// HeldRunView): RecordPageHeader (back + crumbs + name + status + the header verbs + ONE Actions
// menu), a Copy-for-AI of the whole record, and the tab bodies the registry (userSurfaces.ts) says
// are built. Data: admin.user_overview, one call.

import { useRecordLoad } from "./useRecordLoad";
import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
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
import { pushAppHref } from "@/lib/deployment/navigate";
import { ChangePlanDialog, type ChangePlanSubject } from "@/features/admin/limits/components/ChangePlanDialog";
import { GiveFreeMonthsDialog, type FreeMonthsPerson } from "../components/GiveFreeMonthsDialog";
import { StartSupportSessionDialog, type SupportSessionTarget } from "../support-sessions/StartSupportSessionDialog";
import { SendTutorialDialog, type TutorialRecipient } from "@/features/guided-tutorials/admin/SendTutorialDialog";
import { ADMIN_LEVEL_LABEL } from "../constants";
import { useUserActions } from "./useUserActions";
import { actionSubjectOf, fetchUserOverview, isClosed, personTitle, type UserOverview } from "./userOverview";
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
import {
  USERS_HUB_PATH,
  isVisibleUserTab,
  userActionDisabled,
  userActionLabel,
  userActions,
  userRecordHref,
  visibleUserTabs,
  type UserActionId,
  type UserTabId,
} from "./userSurfaces";

export interface UserTabBodyProps {
  userId: string;
  overview: UserOverview;
  reload: () => void;
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

export function UserRecordPage({ userId, tab }: { userId: string; tab?: string }) {
  const router = useRouter();
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
  const [planTarget, setPlanTarget] = useState<ChangePlanSubject | null>(null);
  const [freeMonthsPeople, setFreeMonthsPeople] = useState<FreeMonthsPerson[] | null>(null);
  const [supportTarget, setSupportTarget] = useState<SupportSessionTarget | null>(null);
  const [tutorialPerson, setTutorialPerson] = useState<TutorialRecipient | null>(null);

  const reload = () => setVersion((v) => v + 1);
  const actions = useUserActions({ onPatched: () => reload() });

  // A tab that is not registered, or not built yet, is never an empty page: it opens Overview.
  const activeTab: UserTabId = isVisibleUserTab(tab) ? tab : "overview";
  useEffect(() => {
    if (tab && !isVisibleUserTab(tab)) router.replace(userRecordHref(userId));
  }, [tab, userId, router]);

  const title = overview ? personTitle(overview) : null;
  useRecordTitle(title);

  const subject = overview ? actionSubjectOf(overview) : null;
  const label = title ?? "this person";

  const run = (id: UserActionId) => {
    if (!subject || !overview) return;
    switch (id) {
      case "support_session":
        setSupportTarget({ id: subject.id, email: subject.email, displayName: subject.display_name });
        return;
      case "message":
        actions.openMessage(subject);
        return;
      case "email":
        pushAppHref(router, `/administration/users/email?userId=${encodeURIComponent(subject.id)}`);
        return;
      case "magic_link":
        void actions.sendAuthLink(subject, "magiclink");
        return;
      case "password_reset":
        void actions.sendAuthLink(subject, "recovery");
        return;
      case "change_plan":
        setPlanTarget({
          kind: "user",
          id: subject.id,
          name: label,
          currentPlanKey: overview.plan?.key ?? null,
          grantActive: overview.plan?.source === "grant",
        });
        return;
      case "free_months":
        setFreeMonthsPeople([{ id: subject.id, label }]);
        return;
      case "tutorial":
        setTutorialPerson({ id: subject.id, label, email: subject.email });
        return;
      case "mcp_access":
        void actions.toggleMcpFullAccess(subject);
        return;
      case "top_tier":
        void actions.toggleTopTierModels(subject);
        return;
      case "onboarded":
        void actions.toggleOnboarding(subject);
        return;
      case "verify_email":
        actions.verifyEmail(subject);
        return;
      case "close":
        void actions.setAccountClosed(subject, true);
        return;
      case "reopen":
        void actions.setAccountClosed(subject, false);
        return;
      case "sign_out_everywhere":
        actions.signOutEverywhere(subject);
        return;
    }
  };

  // Label and disabled rules live in the registry (userSurfaces.ts) so the page, the chip menu
  // and the Accounts "Manage" menu never disagree.
  const labelFor = (id: UserActionId): string | null => (subject ? userActionLabel(id, subject) : null);
  const disabledFor = (id: UserActionId): boolean =>
    !subject ||
    userActionDisabled(id, subject, {
      myId: actions.myId,
      closeBlocked: actions.closeBlockedReason(subject) !== null,
    });

  const headerActions: RecordPageAction[] = subject
    ? userActions("header").map((def) => ({
        label: def.label,
        icon: def.icon,
        showLabel: true,
        disabled: disabledFor(def.id),
        onPress: () => run(def.id),
      }))
    : [];

  const menuItems: RecordPageMenuItem[] = subject
    ? userActions("menu").flatMap((def) => {
        const itemLabel = labelFor(def.id);
        if (!itemLabel) return [];
        return [
          {
            id: def.id,
            label: itemLabel,
            icon: def.icon,
            group: def.group,
            destructive: def.danger,
            disabled: disabledFor(def.id),
            onPress: () => run(def.id),
          },
        ];
      })
    : [];

  const status = overview
    ? isClosed(overview)
      ? { label: overview.closure?.erased_at ? "Erased" : "Closed", tone: "destructive" as const }
      : overview.identity.is_anonymous
        ? { label: "Guest", tone: "neutral" as const }
        : overview.admin_level
          ? { label: ADMIN_LEVEL_LABEL[overview.admin_level] ?? overview.admin_level, tone: "info" as const }
          : undefined
    : undefined;

  const tabs = visibleUserTabs();
  const Body = activeTab === "overview" ? null : TAB_BODIES[activeTab];

  return (
    <>
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
                  agent={() => ({
                    kind: "admin-user",
                    location: userRecordHref(userId, activeTab),
                    description: "One person's admin record: identity, plan, usage, attention.",
                    attributes: { id: overview.identity.id, email: overview.identity.email ?? "" },
                    data: overview,
                  })}
                />
              </div>
              {activeTab === "overview" ? (
                <UserOverviewTab overview={overview} onReopen={() => run("reopen")} />
              ) : Body ? (
                <Body key={activeTab} userId={userId} overview={overview} reload={reload} />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {actions.dialogs}
      <StartSupportSessionDialog target={supportTarget} onClose={() => setSupportTarget(null)} />
      <ChangePlanDialog subject={planTarget} onClose={() => setPlanTarget(null)} onChanged={reload} />
      <GiveFreeMonthsDialog
        open={freeMonthsPeople !== null}
        people={freeMonthsPeople ?? []}
        onClose={() => setFreeMonthsPeople(null)}
        onApplied={reload}
      />
      <SendTutorialDialog person={tutorialPerson} onClose={() => setTutorialPerson(null)} />
    </>
  );
}
