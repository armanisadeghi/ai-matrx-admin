"use client";

// A person's Organizations tab (/administration/users/<id>/organizations): every organization
// membership they hold or held, read for this ONE person (iam.memberships, platform-admin read) —
// never the whole directory. Add / change role / remove go through the same door the
// Organizations page uses (service/orgMembership.ts), so the server's refusals and audit apply;
// each asks its reason through the page's one reason prompt (useUserActions.askReason).

import { useEffect, useState } from "react";
import { useRecordLoad } from "./useRecordLoad";
import { Building2, Plus, Trash2 } from "lucide-react";
import { ErrorNotice, readOf } from "@ai-matrx/design-system";
import { Badge, Button, SearchField, Select } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppLink from "@/components/navigation/AppLink";
import { recordToast, toast } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";
import { getRoleLabel, isOrgRole, type OrgRole } from "@/features/organizations/types";
import {
  listPersonMemberships,
  mutateOrgMembership,
  type MembershipChange,
  type MembershipMethod,
  type PersonMembership,
} from "../service/orgMembership";
import { personTitle } from "./userOverview";
import type { UserTabBodyProps } from "./UserRecordPage";

const ROLE_OPTIONS: { value: OrgRole; label: string }[] = (["owner", "admin", "member"] as const).map((r) => ({
  value: r,
  label: getRoleLabel(r),
}));

/** The platform-admin page for one organization. */
export function adminOrganizationHref(orgId: string): string {
  return `/administration/users/organizations?org=${encodeURIComponent(orgId)}`;
}

function AddToOrganizationDialog({
  open,
  personLabel,
  onClose,
  onPick,
}: {
  open: boolean;
  personLabel: string;
  onClose: () => void;
  /** The admin picked an organization and role; the caller asks the reason and adds. */
  onPick: (org: { id: string; name: string }, role: OrgRole) => void;
}) {
  const [query, setQuery] = useState("");
  // Results carry the term they answer, so "no match" never flashes during the debounce (N4).
  const [found, setFound] = useState<{ term: string; rows: { id: string; name: string; slug: string }[]; error: string | null } | null>(null);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [role, setRole] = useState<OrgRole>("member");
  const term = query.trim();
  const current = found && found.term === term ? found : null;
  const results = term.length >= 2 ? (current?.rows ?? []) : [];
  const searchError = term.length >= 2 ? (current?.error ?? null) : null;

  useEffect(() => {
    if (!open || term.length < 2) return;
    let alive = true;
    const t = setTimeout(() => {
      createClient()
        .schema("iam")
        .from("organizations")
        .select("id, name, slug")
        .is("archived_at", null)
        .ilike("name", `%${term.replace(/[%_]/g, "")}%`)
        .order("name")
        .limit(20)
        .then(({ data, error }) => {
          if (alive) setFound({ term, rows: data ?? [], error: error ? error.message : null });
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term, open]);

  const close = () => {
    setQuery("");
    setFound(null);
    setPicked(null);
    setRole("member");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to organization</DialogTitle>
          <DialogDescription className="truncate">{personLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <SearchField
            value={query}
            placeholder="Search organizations…"
            onChange={(e) => {
              setQuery(e.target.value);
              setPicked(null);
            }}
            aria-label="Search organizations"
          />
          {searchError ? <ErrorNotice size="inline" message={searchError} error={searchError} operation="Search organizations" /> : null}
          {current && term.length >= 2 && results.length === 0 && !searchError ? (
            <p className="type-secondary text-muted-foreground">No organization matches</p>
          ) : null}
          {results.length > 0 ? (
            <Select<string>
              aria-label="Organization"
              value={picked?.id ?? ""}
              options={[
                { value: "", label: `Pick one of ${results.length}`, disabled: true },
                ...results.map((o) => ({ value: o.id, label: `${o.name} · ${o.slug}` })),
              ]}
              onValueChange={(id) => {
                const o = results.find((r) => r.id === id);
                setPicked(o ? { id: o.id, name: o.name } : null);
              }}
            />
          ) : null}
          <Select<OrgRole> aria-label="Role" value={role} options={ROLE_OPTIONS} onValueChange={setRole} />
        </div>
        <DialogFooter>
          <Button variant="quiet" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!picked}
            onClick={() => {
              if (!picked) return;
              onPick(picked, role);
              close();
            }}
          >
            {picked ? `Add to ${picked.name}` : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserOrganizationsTab({ userId, overview, version: pageVersion, reload, actions, shareForAi }: UserTabBodyProps) {
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const label = personTitle(overview);

  const { data: rowsData, loading, error } = useRecordLoad(listPersonMemberships, userId, pageVersion + version);
  const rows = rowsData ?? [];
  useEffect(() => shareForAi({ memberships: rows }), [rows, shareForAi]);

  // Every membership change asks its reason (the one prompt) and sends it: the server writes it to
  // iam.org_admin_audit and the person's admin history.
  const change = (key: string, method: MembershipMethod, body: Omit<MembershipChange, "reason">, done: () => void) => async (reason: string) => {
    setSaving(key);
    try {
      await mutateOrgMembership(method, { ...body, reason });
      done();
      reload();
    } finally {
      setSaving(null);
    }
  };

  const add = (org: { id: string; name: string }, role: OrgRole) =>
    actions.askReason({
      title: `Add ${label} to ${org.name}?`,
      description: `They join as ${getRoleLabel(role)}.`,
      confirmLabel: "Add",
      run: change(`add:${org.id}`, "POST", { organizationId: org.id, userId, role }, () =>
        recordToast.success({ type: "organization", id: org.id, title: org.name }, `Added to ${org.name}`),
      ),
    });

  const changeRole = (m: PersonMembership, next: string) => {
    if (!isOrgRole(next) || next === m.role) return;
    actions.askReason({
      title: `Change role to ${getRoleLabel(next)}?`,
      description: `${label} becomes ${getRoleLabel(next)} in ${m.organization_name}.`,
      confirmLabel: "Change role",
      run: change(m.id, "PATCH", { organizationId: m.organization_id, userId, role: next }, () => toast.success("Role updated")),
    });
  };

  const remove = (m: PersonMembership) =>
    actions.askReason({
      title: `Remove from ${m.organization_name}?`,
      description: `${label} loses this membership.`,
      confirmLabel: "Remove",
      run: change(m.id, "DELETE", { organizationId: m.organization_id, userId }, () => toast.success("Membership removed")),
    });

  const columns: MatrxColumnDef<PersonMembership>[] = [
    {
      id: "organization_name",
      accessorKey: "organization_name",
      header: "Organization",
      width: 260,
      cell: (m) => (
        <AppLink href={adminOrganizationHref(m.organization_id)} className="truncate hover:text-primary">
          {m.organization_name}
        </AppLink>
      ),
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      filter: "select",
      width: 150,
      cell: (m) =>
        m.status === "active" && isOrgRole(m.role) ? (
          <Select<OrgRole>
            aria-label="Role"
            variant="inline"
            value={m.role}
            options={ROLE_OPTIONS}
            disabled={saving === m.id}
            onValueChange={(v) => void changeRole(m, v)}
          />
        ) : (
          <span className="type-secondary">{isOrgRole(m.role) ? getRoleLabel(m.role) : m.role}</span>
        ),
    },
    { id: "joined_at", accessorKey: "joined_at", header: "Joined", format: { id: "datetime" }, width: 170 },
    {
      id: "status",
      accessorFn: (m) => (m.archived_at ? "org archived" : m.status),
      header: "Status",
      filter: "select",
      width: 130,
      cell: (m) => (
        <Badge tone={m.archived_at ? "warning" : m.status === "active" ? "success" : "neutral"}>
          {m.archived_at ? "Org archived" : m.status}
        </Badge>
      ),
    },
    {
      id: "custom-actions",
      header: "",
      sortable: false,
      filter: false,
      customActions: (m) =>
        m.status === "active" ? (
          <Button variant="quiet" icon={<Trash2 />} aria-label="Remove membership" title="Remove membership" disabled={saving === m.id} onClick={() => void remove(m)} />
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-3" data-testid="user-organizations-tab">
      <div className="flex justify-end">
        <Button variant="outline" icon={<Plus />} onClick={() => setAddOpen(true)} disabled={overview.identity.is_anonymous}>
          Add to organization
        </Button>
      </div>
      <MatrxDataTable
        data={rows}
        columns={columns}
        getRowId={(m) => m.id}
        isLoading={loading}
        pageSize={50}
        read={readOf({ loading, error }, { what: "memberships", onRetry: () => setVersion((v) => v + 1) })}
        emptyState={{
          title: "No organizations",
          icon: <Building2 className="h-6 w-6 text-muted-foreground" />,
        }}
        toolbar={{ search: true, searchPlaceholder: "Search organizations…" }}
      />
      <AddToOrganizationDialog open={addOpen} personLabel={label} onClose={() => setAddOpen(false)} onPick={add} />
    </div>
  );
}
