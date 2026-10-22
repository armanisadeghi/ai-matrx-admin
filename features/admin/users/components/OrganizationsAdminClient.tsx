"use client";

import { useEffect, useState } from "react";
import { UntrustedCount } from "@ai-matrx/design-system";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { AdminUserRef } from "@/features/admin/users/components/AdminUserRef";
import { USERS_ADMIN_LOCATION } from "@/features/admin/users/constants";
import type {
  AdminOrganizationDirectory,
  AdminOrganizationKind,
  AdminOrganizationMembershipRow,
  AdminOrganizationRow,
  AdminUserRow,
} from "@/features/admin/users/types";
import { UserSearchField } from "@/features/user-search/UserSearchField";
import type { UserSearchCandidate } from "@/features/user-search/types";
import {
  getRoleLabel,
  isOrgRole,
  type OrgRole,
} from "@/features/organizations/types";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { CONTEXT_MENU_ENTITY_KEY } from "@ai-matrx/context-menu/engine";
import type { ContextMenuExtraItem } from "@ai-matrx/context-menu/engine";
import { buildAdminUserMenuSection } from "@/features/admin/users/components/admin-user-menu-section";
import {
  unavailableHere,
  withAvailability,
} from "@ai-matrx/context-menu/engine";
import { pushAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { readOf } from "@ai-matrx/design-system";
import { ErrorNotice } from "@ai-matrx/design-system";
import {
  ChangePlanDialog,
  type ChangePlanSubject,
} from "@/features/admin/limits/components/ChangePlanDialog";
import { fetchOrgPlanAssignments, fetchPlans } from "@/features/admin/limits/service";
import { audienceLabel, type OrgPlanAssignment, type Plan } from "@/features/admin/limits/types";
import { EnterpriseCustomLimitsEditor } from "@/features/admin/limits/components/EnterpriseCustomLimitsEditor";
import { mutateOrgMembership } from "@/features/admin/users/service/orgMembership";
import { loadAdminRoster } from "@/features/admin/users/adminRoster";
import { REASON_PLACEHOLDER, useReasonPrompt } from "@/features/admin/users/record/useReasonPrompt";

/** A bulk run's reason (the bulk dialog requires one; the database refuses a change without it). */
function requireReason(reason: string | undefined): string {
  if (!reason?.trim()) throw new Error("A reason is required");
  return reason.trim();
}

interface MemberDisplayRow extends AdminOrganizationMembershipRow {
  email: string | null;
  display_name: string | null;
}

const ROLE_OPTIONS: OrgRole[] = ["owner", "admin", "member"];

const KIND_LABEL: Record<AdminOrganizationKind, string> = {
  real: "Real",
  guests: "Guests",
  tests: "Tests",
  empty: "Empty",
};

export function OrganizationsAdminClient() {
  const { askReason, reasonDialog } = useReasonPrompt();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const focusedUserId = searchParams.get("user");
  const requestedOrganizationId = searchParams.get("org");
  // `?plan=enterprise` lists only organizations on that plan audience (the
  // Plan allowances matrix links here for Enterprise's custom values).
  const planAudienceFilter = searchParams.get("plan");

  // How many organizations the table's Kind filter leaves in view (the table reports its filtered rows).
  const [shownCount, setShownCount] = useState<number | null>(null);
  const [directory, setDirectory] = useState<AdminOrganizationDirectory | null>(
    null,
  );
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(requestedOrganizationId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Which plan each organization is on (billing.org_plan via org_plan_list,
  // super-admin). An org with no row is on the default plan. A failed read is
  // shown, never rendered as "default".
  const [orgPlans, setOrgPlans] = useState<Map<string, OrgPlanAssignment>>(new Map());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [planTarget, setPlanTarget] = useState<ChangePlanSubject | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [clickedOrganization, setClickedOrganization] =
    useState<AdminOrganizationRow | null>(null);
  const [clickedMember, setClickedMember] = useState<MemberDisplayRow | null>(
    null,
  );
  const [addUserId, setAddUserId] = useState<string>();
  const [addUserQuery, setAddUserQuery] = useState("");
  const [addRole, setAddRole] = useState<OrgRole>("member");
  const [savingMembershipId, setSavingMembershipId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // The people come from THE shared roster (one read per tab); after a membership change
        // (refreshKey bumps) it is read fresh, since every person's organizations moved.
        const [directoryResponse, usersJson] = await Promise.all([
          fetch("/api/admin/users/organizations", { cache: "no-store" }),
          loadAdminRoster({ refresh: refreshKey > 0 }),
        ]);
        const directoryJson = await directoryResponse.json();
        if (!directoryResponse.ok) {
          throw new Error(
            directoryJson.error ?? "Failed to load organizations",
          );
        }
        if (!cancelled) {
          setDirectory(directoryJson.directory as AdminOrganizationDirectory);
          setUsers(usersJson.users as AdminUserRow[]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load organization directory",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    void Promise.all([fetchOrgPlanAssignments(), fetchPlans()])
      .then(([assignments, planRows]) => {
        if (cancelled) return;
        setOrgPlans(new Map(assignments.map((a) => [a.organization_id, a])));
        setPlans(planRows);
        setPlansError(null);
      })
      .catch((planError: unknown) => {
        if (!cancelled)
          setPlansError(planError instanceof Error ? planError.message : String(planError));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const planByKey = new Map(plans.map((plan) => [plan.plan_key, plan]));
  const defaultPlan = plans.find((plan) => plan.is_default && plan.active);
  /** The org's plan as a label: assigned plan name, else the default plan. */
  const orgPlanLabel = (organizationId: string): string => {
    if (plansError) return "—";
    const assignment = orgPlans.get(organizationId);
    if (assignment?.plan_id) {
      const plan = planByKey.get(assignment.plan_id);
      // Two plans can share a name (Personal Pro, Business Pro) — name the group.
      return plan ? `${plan.name} · ${audienceLabel(plan.audience)}` : assignment.plan_id;
    }
    if (assignment) return assignment.tier;
    return defaultPlan ? `${defaultPlan.name} (default)` : "—";
  };

  const membershipOrganizationIds = new Set(
    (directory?.memberships ?? [])
      .filter((membership) => membership.user_id === focusedUserId)
      .map((membership) => membership.organization_id),
  );
  const orgPlanAudience = (organizationId: string): string | null => {
    const planId = orgPlans.get(organizationId)?.plan_id;
    return planId ? (planByKey.get(planId)?.audience ?? null) : (defaultPlan?.audience ?? null);
  };
  const visibleOrganizations = (directory?.organizations ?? []).filter(
    (organization) =>
      (!planAudienceFilter || orgPlanAudience(organization.id) === planAudienceFilter) &&
      (!focusedUserId || membershipOrganizationIds.has(organization.id)),
  );

  const hiddenByFilter =
    shownCount === null ? 0 : Math.max(0, visibleOrganizations.length - shownCount);
  // The Kind filter opens on the admin default (knob admin_organizations.default_kind). Not when the
  // admin arrived for one person's organizations or one organization (?user= / ?org=): those show all.
  const openingKind = directory?.defaultKind ?? "all";
  const initialKindFilter =
    openingKind === "all" || focusedUserId || requestedOrganizationId
      ? undefined
      : {
          kind: {
            kind: "select" as const,
            value: KIND_LABEL[openingKind],
            values: [KIND_LABEL[openingKind]],
          },
        };

  // The organization shown is the one the admin PICKED — from the URL (`?org=`)
  // or by opening a row in the table beside this panel. Nothing pre-picks the
  // first organization in the list: a first-membership pick puts an admin in
  // front of a tenant they never chose, and every action in this panel acts on
  // it. With nothing picked the panel says "Select an organization".
  // common-docs/policies/context-is-carried-never-rebuilt.md
  const isVisibleOrganization = (id: string | null): boolean =>
    Boolean(id) &&
    visibleOrganizations.some((organization) => organization.id === id);
  const effectiveSelectedOrganizationId = isVisibleOrganization(
    requestedOrganizationId,
  )
    ? requestedOrganizationId
    : isVisibleOrganization(selectedOrganizationId)
      ? selectedOrganizationId
      : null;

  const userById = new Map(users.map((user) => [user.id, user]));
  const focusedUser = focusedUserId ? userById.get(focusedUserId) : undefined;
  const selectedOrganization = directory?.organizations.find(
    (organization) => organization.id === effectiveSelectedOrganizationId,
  );
  const selectedMemberships = (directory?.memberships ?? []).filter(
    (membership) => membership.organization_id === selectedOrganization?.id,
  );
  const members: MemberDisplayRow[] = selectedMemberships.map((membership) => {
    const user = userById.get(membership.user_id);
    return {
      ...membership,
      email: user?.email ?? null,
      display_name: user?.display_name ?? user?.full_name ?? null,
    };
  });
  const currentMemberIds = new Set(
    selectedMemberships.map((membership) => membership.user_id),
  );
  const availableUserOptions: UserSearchCandidate[] = users
    .filter(
      (user) =>
        !currentMemberIds.has(user.id),
    )
    .map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name ?? user.full_name,
      avatarUrl: user.avatar_url,
      phone: user.phone,
      adminLevel: user.admin_level,
      organizations: user.organizations.map(
        (organization) => organization.name,
      ),
      source: "Account directory",
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    }));
  const editableRoleOptions: OrgRole[] = ROLE_OPTIONS;

  // R21 (Arman, 2026-09-10): one owner per organization, and ownership moves
  // only through a transfer. The database refuses a second owner even for a
  // super admin, so "Owner" is ABSENT from the picker when someone else already
  // holds it — never offered and then rejected.
  const organizationHasOwner = members.some((member) => member.role === "owner");
  const roleOptionsFor = (member?: MemberDisplayRow): OrgRole[] =>
    editableRoleOptions.filter(
      (role) =>
        role !== "owner" ||
        member?.role === "owner" ||
        !organizationHasOwner,
    );

  function setOrganizationFocus(organization: AdminOrganizationRow) {
    setSelectedOrganizationId(organization.id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("org", organization.id);
    // Discrete focus change — Back returns to the previous focus.
    pushAddressWithoutNavigating(`${pathname}?${params.toString()}`);
  }

  function setUserFocus(userId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("user", userId);
    params.delete("org");
    pushAddressWithoutNavigating(`${pathname}?${params.toString()}`);
  }

  function clearUserFocus() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("user");
    if (effectiveSelectedOrganizationId)
      params.set("org", effectiveSelectedOrganizationId);
    pushAddressWithoutNavigating(`${pathname}?${params.toString()}`);
  }

  async function mutateMembership(
    method: "POST" | "PATCH" | "DELETE",
    // Every membership change carries its reason: the database refuses one without (F1).
    body: { organizationId: string; userId: string; role?: OrgRole; reason: string },
  ) {
    await mutateOrgMembership(method, body);
    setRefreshKey((current) => current + 1);
  }

  function addMember() {
    if (!selectedOrganization || !addUserId) return;
    const organization = selectedOrganization;
    const userId = addUserId;
    askReason({
      title: `Add to ${organization.name}?`,
      description: `Joins as ${getRoleLabel(addRole)}.`,
      confirmLabel: "Add member",
      run: async (reason) => {
        setSavingMembershipId(userId);
        try {
          await mutateMembership("POST", { organizationId: organization.id, userId, role: addRole, reason });
          toast.success("Organization member added");
          setAddOpen(false);
          setAddUserId(undefined);
          setAddUserQuery("");
          setAddRole("member");
        } finally {
          setSavingMembershipId(null);
        }
      },
    });
  }

  function changeRole(member: MemberDisplayRow, nextRole: string) {
    if (
      !selectedOrganization ||
      !isOrgRole(nextRole) ||
      nextRole === member.role
    )
      return;
    const organization = selectedOrganization;
    askReason({
      title: `Change role to ${getRoleLabel(nextRole)}?`,
      description: `${member.display_name ?? member.email ?? member.user_id} will become ${getRoleLabel(nextRole)} in ${organization.name}.`,
      confirmLabel: "Change role",
      run: async (reason) => {
        setSavingMembershipId(member.id);
        try {
          await mutateMembership("PATCH", { organizationId: organization.id, userId: member.user_id, role: nextRole, reason });
          toast.success("Organization role updated");
        } finally {
          setSavingMembershipId(null);
        }
      },
    });
  }

  function removeMember(member: MemberDisplayRow) {
    if (!selectedOrganization) return;
    const organization = selectedOrganization;
    askReason({
      title: `Remove from ${organization.name}?`,
      description: `${member.display_name ?? member.email ?? member.user_id} loses this membership. The last owner, or a person's only organization, can't be removed.`,
      confirmLabel: "Remove member",
      run: async (reason) => {
        setSavingMembershipId(member.id);
        try {
          await mutateMembership("DELETE", { organizationId: organization.id, userId: member.user_id, reason });
          toast.success("Organization member removed");
        } finally {
          setSavingMembershipId(null);
        }
      },
    });
  }

  const organizationColumns: MatrxColumnDef<AdminOrganizationRow>[] = [
    {
      id: "name",
      accessorKey: "name",
      header: "Organization",
      cell: (organization) => (
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            variant="secondary"
            className="min-w-9 justify-center px-1.5 font-mono text-[10px]"
          >
            {organization.abbreviation}
          </Badge>
          <div className="min-w-0">
            <EntityRef
              token="organization"
              id={organization.id}
              name={organization.name}
              showIcon={false}
              className="text-sm font-medium"
            />
          </div>
        </div>
      ),
      width: 220,
    },
    {
      // Organizations are all equal (access ladder): there is no organization "type". The one
      // real distinction is the platform's own system organization, so the column names that
      // fact and nothing else — every other row stays empty rather than wearing an invented label.
      id: "system",
      header: "System",
      accessorFn: (organization) =>
        organization.is_system ? "System" : "Not system",
      filter: "select",
      cell: (organization) =>
        organization.is_system ? <Badge variant="outline">System</Badge> : null,
      width: 90,
    },
    {
      // Who is in it (iam.organization_kind). One-at-a-time filter; the opening value is the
      // admin_organizations.default_kind knob. Clearing it shows every kind.
      id: "kind",
      header: "Kind",
      accessorFn: (organization) => KIND_LABEL[organization.kind],
      filter: "select",
      filterSingle: true,
      width: 80,
    },
    {
      id: "plan",
      header: "Plan",
      accessorFn: (organization) => orgPlanLabel(organization.id),
      filter: "select",
      width: 120,
    },
    {
      id: "member_count",
      accessorKey: "member_count",
      header: "Members",
      align: "right",
      width: 80,
    },
    {
      id: "owner_count",
      accessorKey: "owner_count",
      header: "Owners",
      align: "right",
      width: 70,
    },
    {
      id: "id",
      accessorKey: "id",
      header: "Organization ID",
      cellKind: "fk",
      // The column is named `id`, not `organization_id`, so the automatic
      // column-name → token resolution can't fire. Declare the token.
      fk: { token: "organization", label: "Organization" },
      sortable: false,
      filter: false,
      width: 120,
    },
  ];

  const memberColumns: MatrxColumnDef<MemberDisplayRow>[] = [
    {
      id: "display_name",
      accessorKey: "display_name",
      header: "User",
      cell: (member) => (
        <AdminUserRef
          userId={member.user_id}
          name={member.display_name}
          email={member.email}
        />
      ),
      width: 240,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      filter: "select",
      cell: (member) => (
        <Select
          value={member.role}
          onValueChange={(value) => void changeRole(member, value)}
          disabled={savingMembershipId === member.id}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptionsFor(member).map((role) => (
              <SelectItem key={role} value={role}>
                {getRoleLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      width: 130,
    },
    {
      id: "joined_at",
      accessorKey: "joined_at",
      header: "Joined",
      format: { id: "datetime" },
      cell: (member) => (
        <span className="text-xs text-muted-foreground">
          {new Date(member.joined_at).toLocaleDateString()}
        </span>
      ),
      width: 110,
    },
    {
      id: "user_id",
      accessorKey: "user_id",
      header: "User ID",
      cellKind: "uuid",
      sortable: false,
      filter: false,
      width: 120,
    },
  ];

  // BULK MEMBERSHIP — the same /api/admin/users/organizations door the row
  // buttons use, once per member. The server's own refusals (last owner, a
  // person's only organization) are skipped and named per person. Built-ins
  // are off: a membership is not a favouritable or trashable record.
  const memberBulkActions: EntityBulkAction<MemberDisplayRow>[] = [
    {
      id: "set-role",
      label: "Set role…",
      icon: UserRound,
      confirm: (sel) => ({
        title: `Set role for ${sel.count} member${sel.count === 1 ? "" : "s"}?`,
        description: `${sel.count} ${sel.count === 1 ? "person" : "people"} get the role you pick in ${selectedOrganization?.name ?? "this organization"}. Anyone already in it is skipped; the last owner stays an owner.`,
        confirmLabel: "Set role",
        ask: {
          kind: "choice",
          label: "Role",
          options: ROLE_OPTIONS.map((role) => ({ value: role, label: role.charAt(0).toUpperCase() + role.slice(1) })),
          defaultValue: "admin",
        },
        reason: { placeholder: "Reason (recorded in the admin history)" },
      }),
      run: (sel, input) =>
        runPerRow(
          sel,
          async (_id, member) => {
            if (!selectedOrganization || !member) throw new Error("No organization selected");
            const role = ROLE_OPTIONS.find((r) => r === input?.value);
            if (!role) throw new Error("Pick a role");
            if (!input?.reason) throw new Error("A reason is required.");
            if (member.role === role) throw new Error(`Already ${role}`);
            await mutateMembership("PATCH", {
              organizationId: selectedOrganization.id,
              userId: member.user_id,
              role,
              // The dialog asked one value (the role) and one reason; the audit records the person's words.
              reason: input?.reason ?? "",
            });
          },
          {
            done: "Role set",
            noun: "member",
            labelOf: (m) => m.display_name ?? m.email ?? m.user_id,
          },
          (m) => m.id,
        ),
    },
    {
      id: "remove-members",
      label: "Remove",
      icon: Trash2,
      variant: "destructive",
      confirm: (sel) => ({
        title: `Remove ${sel.count} member${sel.count === 1 ? "" : "s"} from ${selectedOrganization?.name ?? "this organization"}?`,
        description: `${sel.count} ${sel.count === 1 ? "person" : "people"} will lose this membership. The last owner and anyone whose only organization this is are skipped and named.`,
        confirmLabel: "Remove members",
        variant: "destructive",
        reason: { placeholder: REASON_PLACEHOLDER },
      }),
      run: (sel, input) =>
        runPerRow(
          sel,
          async (_id, member) => {
            if (!selectedOrganization || !member) throw new Error("No organization selected");
            await mutateMembership("DELETE", {
              organizationId: selectedOrganization.id,
              userId: member.user_id,
              reason: requireReason(input?.reason),
            });
          },
          {
            done: "Removed",
            noun: "member",
            labelOf: (m) => m.display_name ?? m.email ?? m.user_id,
          },
          (m) => m.id,
        ),
    },
  ];
  const memberBulk = useTableBulkSelection<MemberDisplayRow>({
    noun: "member",
    rows: members,
    getRowId: (m) => m.id,
    getRowName: (m) => m.display_name ?? m.email ?? m.user_id,
    actions: memberBulkActions,
    standardBulkActions: false,
    // mutateMembership already bumps refreshKey after each change.
    onRefresh: () => {},
  });

  // Counts come from the directory read: a failed read shows "—", never 0.
  const directoryRead = readOf({ loading, error, data: directory }, { what: "organizations" });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      {reasonDialog}
      {/* The read's failure is said once, by the table (read=). */}
      {plansError ? (
        <ErrorNotice
          size="inline"
          message="Organization plans could not load. Refresh to retry."
          error={plansError}
          operation="Load organization plans"
          calls={["billing.org_plan_list", "billing.plan"]}
        />
      ) : null}

      {planAudienceFilter ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-1.5 text-sm">
          <span className="truncate">
            Only organizations on {audienceLabel(planAudienceFilter)} plans
          </span>
          <Button
            variant="quiet"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("plan");
              pushAddressWithoutNavigating(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
            }}
          >
            Show all
          </Button>
        </div>
      ) : null}
      {focusedUserId ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <UserRound className="h-4 w-4 shrink-0 text-primary" />
            <span className="shrink-0">Organizations for</span>
            <AdminUserRef
              userId={focusedUserId}
              name={focusedUser?.display_name}
              email={focusedUser?.email}
              hideEmail
            />
            <Badge variant="secondary">
              <UntrustedCount
                read={directoryRead}
                label="Organizations"
                value={visibleOrganizations.length}
              />
            </Badge>
          </div>
          <Button icon={<X />} variant="quiet" onClick={clearUserFocus}> Show all organizations
          </Button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[minmax(26rem,0.85fr)_minmax(34rem,1.15fr)]">
        <section className="flex min-h-0 flex-col rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-primary" /> Organizations
              </div>
              <p className="text-xs text-muted-foreground">
                <UntrustedCount
                  read={directoryRead}
                  label="Shown organizations"
                  value={shownCount ?? visibleOrganizations.length}
                />{" "}
                shown
                {directory && hiddenByFilter > 0 ? ` · ${hiddenByFilter} hidden by filter` : ""}
                {" · "}
                <UntrustedCount
                  read={directoryRead}
                  label="Organizations"
                  value={directory?.organizations.length ?? 0}
                />{" "}
                total
              </p>
            </div>
            <Button
              icon={loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )} aria-label="Refresh organizations"
              variant="quiet"
              title="Refresh organizations"
              onClick={() => setRefreshKey((current) => current + 1)}
              disabled={loading}
            />
          </div>
          <div className="min-h-0 flex-1 p-2">
            <NonEditableContextMenu
              sourceFeature="admin"
              contentSource={{ type: "raw" }}
              contextData={{ content: "" }}
              resolveContextOnOpen={(element) => {
                const id = element
                  ?.closest("[data-row-id]")
                  ?.getAttribute("data-row-id");
                const organization = id
                  ? (visibleOrganizations.find((o) => o.id === id) ?? null)
                  : null;
                setClickedOrganization(organization);
                if (!organization) return null;
                return {
                  [CONTEXT_MENU_ENTITY_KEY]: {
                    type: "organization",
                    id: organization.id,
                    title: organization.name,
                  },
                  content: `${organization.name} (${organization.slug})\nid=${organization.id}\nmembers=${organization.member_count} owners=${organization.owner_count}`,
                };
              }}
              extraSections={[
                withAvailability(
                  {
                    id: "organization-actions",
                    label: clickedOrganization?.name || "This organization",
                    icon: Building2,
                    anchor: "after-compare",
                    items: [
                      {
                        kind: "item",
                        id: "organization-view-members",
                        label: "View members",
                        icon: UserRound,
                        disabled: !clickedOrganization,
                        onSelect: () =>
                          clickedOrganization &&
                          setOrganizationFocus(clickedOrganization),
                      },
                    ] satisfies ContextMenuExtraItem[],
                  },
                  !clickedOrganization
                    ? { "organization-view-members": unavailableHere("this table") }
                    : undefined,
                ),
              ]}
            >
            <MatrxDataTable
              key={directory ? "ready" : "loading"}
              urlState={{ id: "organizations", selectedRow: false }}
              {...(initialKindFilter ? { initialColumnFilters: initialKindFilter } : {})}
              onViewChange={(rows) => setShownCount(rows.length)}
              data={visibleOrganizations}
              columns={organizationColumns}
              getRowId={(organization) => organization.id}
              isLoading={loading}
              pageSize={50}
              selectedId={effectiveSelectedOrganizationId}
              onRowOpen={setOrganizationFocus}
              detail={{ enabled: false }}
              toolbar={{
                search: true,
                searchPlaceholder: "Search organizations…",
              }}
              copy={{
                label: "Organization",
                listLabel: "Organizations (this view)",
                location: USERS_ADMIN_LOCATION,
                rowKind: "organization",
                listKind: "organizations",
                humanRow: (organization) =>
                  `${organization.name} (${organization.slug})\nid=${organization.id}\nmembers=${organization.member_count} owners=${organization.owner_count}`,
              }}
              read={readOf({ loading, error }, { what: "organizations" })}
              emptyState={{
                title: focusedUserId
                  ? "No organization memberships"
                  : "No organizations",
                description: focusedUserId
                  ? "This user does not belong to an organization."
                  : "No organizations are available.",
              }}
            />
            </NonEditableContextMenu>
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-lg border bg-card">
          <div className="flex min-h-[57px] items-center justify-between gap-3 border-b px-3 py-2">
            <div className="min-w-0">
              {selectedOrganization ? (
                <EntityRef
                  token="organization"
                  id={selectedOrganization.id}
                  name={selectedOrganization.name}
                  showIcon={false}
                  alwaysShowActions
                  className="text-sm font-semibold"
                />
              ) : (
                <div className="truncate text-sm font-semibold">
                  Select an organization
                </div>
              )}
              {selectedOrganization ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    <UntrustedCount
                      read={directoryRead}
                      label="Members"
                      value={members.length}
                    />{" "}
                    members
                  </span>
                  <span aria-hidden>·</span>
                  <span>{orgPlanLabel(selectedOrganization.id)}</span>
                </div>
              ) : null}
            </div>
            <Button
              icon={<WalletCards />}
              variant="outline"
              disabled={!selectedOrganization || Boolean(plansError)}
              onClick={() =>
                selectedOrganization &&
                setPlanTarget({
                  kind: "organization",
                  id: selectedOrganization.id,
                  name: selectedOrganization.name,
                  currentPlanKey: orgPlans.get(selectedOrganization.id)?.plan_id ?? null,
                })
              }
            > Change plan
            </Button>
            <Button
              icon={<Plus />}
              variant="primary"
              onClick={() => setAddOpen(true)}
              disabled={!selectedOrganization}
            > Add member
            </Button>
          </div>
          {selectedOrganization && orgPlanAudience(selectedOrganization.id) === "enterprise" ? (
            <EnterpriseCustomLimitsEditor
              key={selectedOrganization.id}
              organizationId={selectedOrganization.id}
              organizationName={selectedOrganization.name}
              className="mx-2 mt-2"
            />
          ) : null}
          <div className="min-h-0 flex-1 p-2">
            <NonEditableContextMenu
              sourceFeature="admin"
              contentSource={{ type: "raw" }}
              contextData={{ content: "" }}
              resolveContextOnOpen={(element) => {
                const id = element
                  ?.closest("[data-row-id]")
                  ?.getAttribute("data-row-id");
                const member = id
                  ? (members.find((m) => m.id === id) ?? null)
                  : null;
                setClickedMember(member);
                if (!member) return null;
                return {
                  content: `${member.display_name ?? "Unnamed user"} <${member.email ?? "no-email"}>\nuser_id=${member.user_id}\nrole=${member.role}`,
                };
              }}
              extraSections={[
                withAvailability(
                  buildAdminUserMenuSection(
                    clickedMember
                      ? {
                          id: clickedMember.user_id,
                          email: clickedMember.email,
                          displayName: clickedMember.display_name,
                        }
                      : null,
                  ),
                  undefined,
                ),
                {
                  id: "organization-member-actions",
                  label: "This membership",
                  anchor: "after-compare",
                  items: [
                    {
                      kind: "item",
                      id: "organization-member-remove",
                      label: "Remove from organization…",
                      icon: Trash2,
                      destructive: true,
                      disabled: !clickedMember,
                      onSelect: () =>
                        clickedMember && void removeMember(clickedMember),
                    },
                  ] satisfies ContextMenuExtraItem[],
                },
              ]}
            >
            <MatrxDataTable
              urlState={{ id: "organization-members" }}
              selection={memberBulk.selection}
              data={members}
              columns={[...(memberColumns), { id: "custom-actions", header: "Actions", sortable: false, filter: false, customActions: (member) => (
                <>
                  <Button
                    icon={<Building2 />} aria-label="View this user's organizations"
                    variant="quiet"
                    title="View this user's organizations"
                    onClick={() => setUserFocus(member.user_id)}
                  />
                  <Button
                    icon={savingMembershipId === member.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )} aria-label="Remove member"
                    variant="quiet"
                    title="Remove member"
                    disabled={savingMembershipId === member.id}
                    onClick={() => void removeMember(member)}
                  />
                </>
              ) }]}
              getRowId={(member) => member.id}
              isLoading={loading}
              detail={{ enabled: false }}
              pageSize={50}
              toolbar={{
                search: true,
                searchPlaceholder: "Search members…",
              }}
              copy={
                selectedOrganization
                  ? {
                      label: "Organization member",
                      listLabel: "Organization members (this view)",
                      location: `${USERS_ADMIN_LOCATION} — ${selectedOrganization.name}`,
                      rowKind: "organization_member",
                      listKind: "organization_members",
                      humanRow: (member) =>
                        `${member.display_name ?? "Unnamed user"} <${member.email ?? "no-email"}>\nuser_id=${member.user_id}\nrole=${member.role}`,
                    }
                  : undefined
              }

              // Members come from the same directory read: its failure is said once, by the organizations table.
              read={readOf({ loading, error: selectedOrganization ? error : null }, { what: "organization members" })}
              emptyState={{
                title: selectedOrganization
                  ? "No members"
                  : "Select an organization",
                description: selectedOrganization
                  ? "This organization has no active memberships."
                  : "Choose an organization to inspect and manage its users.",
              }}
            />
            </NonEditableContextMenu>
          </div>
        </section>
      </div>

      <Dialog
        modal={false}
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) {
            setAddUserId(undefined);
            setAddUserQuery("");
          }
        }}
      >
        <DialogContent onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Add organization member</DialogTitle>
            <DialogDescription>
              Add an existing account to {selectedOrganization?.name}. New-user
              invitations remain in the Invitations tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">User</label>
              <UserSearchField
                value={addUserQuery}
                onValueChange={(value) => {
                  setAddUserQuery(value);
                  setAddUserId(undefined);
                }}
                onUserSelect={(user) => {
                  setAddUserId(user.id);
                  setAddUserQuery(user.email ?? user.displayName ?? user.id);
                }}
                candidates={availableUserOptions}
                directory="provided"
                title={`Choose a member for ${selectedOrganization?.name ?? "organization"}`}
                placeholder="Search name, email, organization, or ID…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={addRole}
                onValueChange={(role) => {
                  if (isOrgRole(role)) setAddRole(role);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptionsFor().map((role) => (
                    <SelectItem key={role} value={role}>
                      {getRoleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="quiet" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={savingMembershipId ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Plus />
              )}
              variant="primary"
              onClick={() => void addMember()}
              disabled={!addUserId || savingMembershipId !== null}
            >
              Add member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ChangePlanDialog
        subject={planTarget}
        onClose={() => setPlanTarget(null)}
        onChanged={() => setRefreshKey((current) => current + 1)}
      />
    </div>
  );
}
