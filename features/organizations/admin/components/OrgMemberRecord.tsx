"use client";

/**
 * One member's page for an organization's owners and admins, at
 * /organizations/<slug>/admin/users/<id>[/<tab>]: the platform user page's frame and tabs
 * (features/admin/users/record — UserRecordFrame, userSurfaces, the shared tab bodies) scoped to
 * THIS organization's slice, with the org seat's own actions: suspend / reactivate (reason
 * required, recorded in this organization's log), take over, remove. Data: org_admin_get_member.
 */
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Ban, CircleCheck, KeyRound, UserMinus } from "lucide-react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { PropertyRow, KpiGrid, KpiTile } from "@ai-matrx/design-system/controls";
import { MatrxUuidCell } from "@ai-matrx/design-system/data-table/uuid-cell";
import { formatCount, formatFileSize } from "@ai-matrx/kit/format";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { CostDoor } from "@/components/cost/CostDoor";
import type { RecordPageAction, RecordPageMenuItem } from "@/features/shell/components/header/templates/RecordPageHeader";
import { toast } from "@/lib/toast";
import {
  ORGANIZATIONS_SURFACE_NAME,
  createOrganizationsScope,
} from "@/features/surfaces/manifests/organizations.manifest";
import { UserRecordFrame, tabFromPath } from "@/features/admin/users/record/UserRecordFrame";
import { SCOPED_TAB_BODIES } from "@/features/admin/users/record/scopedTabBodies";
import { useReasonPrompt } from "@/features/admin/users/record/useReasonPrompt";
import { realName } from "@/features/admin/users/record/userOverview";
import { scopeHubPath, userRecordHref, type UserRecordScope } from "@/features/admin/users/record/userSurfaces";
import { useOrgMemberDetail } from "../hooks";
import { setMemberStatus } from "../service";
import type { OrgAdminMemberDetail } from "../types";
import { MCENTS_PER_USD, formatRelativeTime } from "../utils";
import { MemberControlsForm } from "./MemberControlsForm";
import { RemoveMemberDialog } from "./RemoveMemberDialog";
import { TakeOverAccountDialog } from "./TakeOverAccountDialog";

type OrganizationScope = Extract<UserRecordScope, { kind: "organization" }>;

function day(iso: string | null | undefined): string | null {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;
}

/** Their name, else email — a placeholder name ("User") is never a name (the platform page's rule). */
function memberName(m: OrgAdminMemberDetail): string {
  return realName(m.displayName) ?? m.email ?? "Unnamed member";
}

/** Overview for the org seat: this organization's numbers, the person's facts here, and the controls. */
function OrgMemberOverview({
  member,
  scope,
  onSaved,
}: {
  member: OrgAdminMemberDetail;
  scope: OrganizationScope;
  onSaved: () => void;
}) {
  const resourceTotal = member.resources.reduce((sum, r) => sum + r.count, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]" data-testid="org-member-overview">
      <div className="flex min-w-0 flex-col gap-4">
        <KpiGrid className="lg:grid-cols-3">
          <KpiTile
            label="Resources here"
            value={formatCount(resourceTotal)}
            hint={`${formatCount(member.resources.length)} types`}
            href={userRecordHref(member.userId, "content", scope)}
          />
          <KpiTile label="Files here" value={formatCount(member.orgFilesCount)} hint={formatFileSize(member.orgBytesUsed)} />
          <KpiTile
            label="Account storage"
            value={formatFileSize(member.accountBytesUsed)}
            hint={`${formatCount(member.accountFilesCount)} files, all organizations`}
          />
          <KpiTile label="AI spend · 24h" value={member.cost24hMcents == null ? "—" : <CostDoor label="Usage" usd={member.cost24hMcents / MCENTS_PER_USD} />} hint={`${formatCount(member.requests24h)} requests`} />
          <KpiTile label="Requests · 6h" value={formatCount(member.requests6h)} hint="Account-wide" />
          <KpiTile
            label="Last active here"
            value={member.lastOrgActivityAt ? formatRelativeTime(member.lastOrgActivityAt) : "Never"}
            href={userRecordHref(member.userId, "activity", scope)}
          />
        </KpiGrid>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-3 py-2">
            <h2 className="text-sm font-medium">Controls</h2>
          </div>
          <div className="p-3">
            <MemberControlsForm orgId={scope.orgId} member={member} onSaved={onSaved} />
          </div>
        </section>
      </div>

      <aside className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3" aria-label={`${memberName(member)} details`}>
        <PropertyRow label="Email" value={member.email} missing={member.email ? undefined : "None"} />
        <PropertyRow label="User ID">
          <MatrxUuidCell value={member.userId} label="User ID" />
        </PropertyRow>
        <PropertyRow label="Role" value={member.role.charAt(0).toUpperCase() + member.role.slice(1)} />
        <PropertyRow label="Status" value={member.status === "suspended" ? "Suspended" : "Active"} />
        <PropertyRow label="Joined" value={day(member.joinedAt)} missing={member.joinedAt ? undefined : "Unknown"} />
        <PropertyRow label="Member level" value={member.memberLevel} missing={member.memberLevel ? undefined : "None"} />
        <PropertyRow
          label="Last request"
          value={member.lastRequestAt ? formatRelativeTime(member.lastRequestAt) : null}
          meta="Account-wide"
          missing={member.lastRequestAt ? undefined : "Never"}
        />
      </aside>
    </div>
  );
}

export function OrgMemberRecord({ userId, tab: tabProp, scope }: { userId: string; tab?: string; scope: OrganizationScope }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Rendered by the member layout, so it stays mounted across tabs and reads the tab from the address.
  const pathname = usePathname();
  const tab = tabProp ?? tabFromPath(pathname, userId, scope);
  const { member, loading, error, refresh } = useOrgMemberDetail(scope.orgId, userId);
  const [version, setVersion] = useState(0);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [takeOverOpen, setTakeOverOpen] = useState(false);
  const { askReason, reasonDialog } = useReasonPrompt();

  const reload = () => {
    refresh();
    setVersion((v) => v + 1);
  };

  const title = member ? memberName(member) : null;
  const label = title ?? "this member";
  // Owners are never suspended, taken over or removed from here (the database refuses it too).
  const manageable = member !== null && member.role !== "owner";
  const suspended = member?.status === "suspended";

  const toggleStatus = () =>
    askReason({
      title: suspended ? `Reactivate ${label}?` : `Suspend ${label}?`,
      description: suspended ? "They are marked active again." : "They are flagged suspended across this organization's admin views.",
      confirmLabel: suspended ? "Reactivate" : "Suspend",
      run: async (reason) => {
        await setMemberStatus(scope.orgId, userId, suspended ? "active" : "suspended", reason);
        toast.success(suspended ? "Member reactivated" : "Member suspended");
        reload();
      },
    });

  const headerActions: RecordPageAction[] = manageable
    ? [{ label: suspended ? "Reactivate" : "Suspend", icon: suspended ? CircleCheck : Ban, showLabel: true, onPress: toggleStatus }]
    : [];
  const menuItems: RecordPageMenuItem[] = manageable
    ? [
        { id: "take_over", label: "Take over account…", icon: KeyRound, group: "access", onPress: () => setTakeOverOpen(true) },
        {
          id: "remove",
          label: "Remove from organization…",
          icon: UserMinus,
          group: "danger",
          destructive: true,
          onPress: () => setRemoveOpen(true),
        },
      ]
    : [];

  const hub = scopeHubPath(scope);
  const personName = title ?? "this member";

  const getScope = () =>
    createOrganizationsScope({
      current_view: "workspace",
      org_id: scope.orgId,
      org_slug: scope.orgSlug,
      org_name: scope.orgName,
      selected_member_id: userId,
      ...(member
        ? {
            member_resource_total: member.resources.reduce((sum, r) => sum + r.count, 0),
            member_resources: member.resources.map((r) => ({
              resource_type: r.resourceType,
              display_label: r.displayLabel,
              schema_name: r.schemaName,
              table_name: r.tableName,
              count: r.count,
            })),
          }
        : {}),
    });

  return (
    <SurfaceRuntimeProvider surfaceName={ORGANIZATIONS_SURFACE_NAME} getScope={getScope}>
      <UserRecordFrame
        userId={userId}
        scope={scope}
        tab={tab}
        title={title}
        backHref={hub}
        parents={[{ label: scope.orgName, href: hub }]}
        placeholderName={{ loading: "Member", missing: "Member not found" }}
        loading={loading}
        status={member ? (suspended ? { label: "Suspended", tone: "destructive" } : { label: member.role.charAt(0).toUpperCase() + member.role.slice(1), tone: "neutral" }) : undefined}
        actions={headerActions}
        menuItems={menuItems}
        notices={error ? <ErrorNotice size="inline" message={error} error={error} operation="Read member" calls={["public.org_admin_get_member"]} /> : null}
        ready={member !== null}
        copyForAi={{
          label: "Member",
          kind: "org-member",
          description: `One member's record in ${scope.orgName} and the open tab.`,
          attributes: { id: userId, email: member?.email ?? "", organization: scope.orgName },
          data: member,
        }}
        renderTab={(open, shareForAi) => {
          if (!member) return null;
          if (open === "overview") return <OrgMemberOverview member={member} scope={scope} onSaved={reload} />;
          const Body = SCOPED_TAB_BODIES[open];
          return Body ? (
            <Body
              key={open}
              userId={userId}
              scope={scope}
              personName={personName}
              version={version}
              reload={reload}
              shareForAi={shareForAi}
            />
          ) : null;
        }}
        dialogs={
          <>
            {reasonDialog}
            <TakeOverAccountDialog
              open={takeOverOpen}
              onOpenChange={setTakeOverOpen}
              orgId={scope.orgId}
              orgName={scope.orgName}
              userId={userId}
              label={label}
              onDone={reload}
            />
            {member ? (
              <RemoveMemberDialog
                open={removeOpen}
                onOpenChange={setRemoveOpen}
                orgId={scope.orgId}
                orgSlug={scope.orgSlug}
                sourceUserId={userId}
                sourceLabel={label}
                resources={member.resources}
                onDone={() => startTransition(() => router.push(hub))}
              />
            ) : null}
          </>
        }
      />
    </SurfaceRuntimeProvider>
  );
}
