"use client";

// THE frame of one person's record, for every seat (users one-roof, Arman 2026-10-17; org admins
// 2026-10-18): RecordPageHeader (back + crumbs + name + status + header verbs + ONE Actions menu),
// the seat's tab row (userSurfaces.ts), a Copy-for-AI of the record plus the open tab, and the open
// tab's body. The platform page (UserRecordPage) and the organization member page
// (features/organizations/admin/components/OrgMemberRecord) each bring their own read and actions;
// everything around them is this one file.

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { RegionSkeleton, Tabs } from "@ai-matrx/design-system/controls";
import { CopyForAiAction } from "@/features/admin/attention/CopyForAiAction";
import type { AgentPayloadInput } from "@/components/agent-copy/buildAgentPayload";
import {
  RecordPageHeader,
  type RecordPageAction,
  type RecordPageHeaderProps,
  type RecordPageMenuItem,
} from "@/features/shell/components/header/templates/RecordPageHeader";
import { useRecordTitle } from "@/lib/record-title/record-title";
import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";
import type { AdminUserRow } from "../types";
import { isVisibleUserTab, userRecordHref, visibleUserTabs, type UserRecordScope, type UserTabId } from "./userSurfaces";

/** The tab segment of the record's address (`<base>/<tab>`), or undefined on Overview. */
export function tabFromPath(pathname: string, userId: string, scope: UserRecordScope): string | undefined {
  const base = userRecordHref(userId, "overview", scope);
  if (!pathname.startsWith(`${base}/`)) return undefined;
  return decodeURIComponent(pathname.slice(base.length + 1)) || undefined;
}

/** The open tab for this seat: a tab that is not registered, built or in scope opens Overview. */
export function activeTabOf(tab: string | undefined, scope: UserRecordScope): UserTabId {
  return isVisibleUserTab(tab, scope) ? tab : "overview";
}

/** The open tab's body: the seat's renderer, handed the frame's Copy-for-AI sink. */
function OpenTab({
  tab,
  render,
  shareForAi,
}: {
  tab: UserTabId;
  render: UserRecordFrameProps["renderTab"];
  shareForAi: (data: unknown) => void;
}) {
  return <>{render(tab, shareForAi)}</>;
}

export interface UserRecordFrameProps {
  userId: string;
  scope: UserRecordScope;
  /** The tab segment from the address (may be unknown; it then reopens Overview). */
  tab: string | undefined;
  /** The person's name, or null until it loads. */
  title: string | null;
  backHref: string;
  parents: RecordPageHeaderProps["parents"];
  /** What the header says while loading, and when there is no such person. */
  placeholderName: { loading: string; missing: string };
  loading: boolean;
  status?: RecordPageHeaderProps["status"];
  actions: RecordPageAction[];
  menuItems: RecordPageMenuItem[];
  /** Load or address errors, shown above the body. */
  notices?: ReactNode;
  /** The record is loaded: tabs and bodies render. */
  ready: boolean;
  /** The record for Copy for AI (the frame adds the open tab's data). */
  copyForAi: { label: string; kind: string; description: string; attributes: Record<string, string>; data: unknown };
  /** The open tab's body; `shareForAi` hands the frame what the tab shows. */
  renderTab: (tab: UserTabId, shareForAi: (data: unknown) => void) => ReactNode;
  dialogs?: ReactNode;
}

export function UserRecordFrame({
  userId,
  scope,
  tab,
  title,
  backHref,
  parents,
  placeholderName,
  loading,
  status,
  actions,
  menuItems,
  notices,
  ready,
  copyForAi,
  renderTab,
  dialogs,
}: UserRecordFrameProps) {
  const router = useRouter();
  const activeTab = activeTabOf(tab, scope);
  useEffect(() => {
    if (tab && !isVisibleUserTab(tab, scope)) router.replace(userRecordHref(userId, "overview", scope));
  }, [tab, userId, scope, router]);
  useRecordTitle(title);
  // The person's door opens the other people of this seat — the roster the hub lists (platform: the
  // cached `/api/admin/users` read; organization: `org_admin_list_members`), same tab, capped.
  const loadPeople = async () => {
    const people: { id: string; label: string }[] =
      scope.kind === "organization"
        ? (await (await import("@/features/organizations/admin/service")).listOrgMembers(scope.orgId)).map((m) => ({
            id: m.userId,
            label: m.displayName || m.email || "Member",
          }))
        : ((await (await import("../adminRoster")).loadAdminRoster()).users as AdminUserRow[]).map((u) => ({
            id: u.id,
            label: u.display_name || u.full_name || u.email || "Person",
          }));
    return people
      .slice(0, SIBLINGS_MAX)
      .map((p) => ({ label: p.label, href: userRecordHref(p.id, activeTab, scope), active: p.id === userId }));
  };

  // What the open tab shows, for Copy for AI (read at click time; never re-renders the page).
  const tabData = useRef<{ tab: UserTabId; data: unknown } | null>(null);
  const shareForAi = useCallback(
    (data: unknown) => {
      tabData.current = { tab: activeTab, data };
    },
    [activeTab],
  );

  const tabs = visibleUserTabs(scope);

  return (
    <>
      <RecordPageHeader
        backHref={backHref}
        parents={parents}
        record={{ name: title ?? (loading ? placeholderName.loading : placeholderName.missing), loadSiblings: loadPeople }}
        status={status}
        actions={actions}
        menu={menuItems.length ? { items: menuItems } : undefined}
      />
      <div className="h-full overflow-y-auto px-4 pt-4 sm:px-6" data-matrx-page-scroll="" data-testid="user-record">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 pb-6">
          {notices}
          {loading && !ready ? <RegionSkeleton shape="cards" count={6} aria-label="Loading user" /> : null}
          {ready ? (
            <>
              <div className="flex items-end justify-between gap-3">
                {tabs.length > 1 ? (
                  <Tabs<UserTabId>
                    aria-label="User sections"
                    value={activeTab}
                    onValueChange={(next) => router.push(userRecordHref(userId, next, scope))}
                    data={tabs.map((t) => ({ value: t.id, label: t.label }))}
                  />
                ) : (
                  <span />
                )}
                <CopyForAiAction
                  label={copyForAi.label}
                  agent={(): AgentPayloadInput => {
                    const shown = tabData.current?.tab === activeTab ? tabData.current.data : undefined;
                    return {
                      kind: copyForAi.kind,
                      location: userRecordHref(userId, activeTab, scope),
                      description: copyForAi.description,
                      attributes: { ...copyForAi.attributes, tab: activeTab },
                      data: shown === undefined ? copyForAi.data : { record: copyForAi.data, [activeTab]: shown },
                    };
                  }}
                />
              </div>
              <OpenTab tab={activeTab} render={renderTab} shareForAi={shareForAi} />
            </>
          ) : null}
        </div>
      </div>
      {dialogs}
    </>
  );
}
