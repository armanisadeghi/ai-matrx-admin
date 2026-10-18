"use client";

// A person's Organizations tab (/administration/users/<id>/organizations): every organization
// membership they hold or held, read for this ONE person (iam.memberships, platform-admin read) —
// never the whole directory. Add / change role / remove go through the same door the
// Organizations page uses (service/orgMembership.ts), so the server's refusals and audit apply.

import { useEffect, useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import { readOf } from "@ai-matrx/design-system";
import { Badge, Button, SearchField, Select } from "@ai-matrx/design-system/controls";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AppLink from "@/components/navigation/AppLink";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { recordToast, toast } from "@/lib/toast";
import { createClient } from "@/utils/supabase/client";
import { getRoleLabel, isOrgRole, type OrgRole } from "@/features/organizations/types";
import { listPersonMemberships, mutateOrgMembership, type PersonMembership } from "../service/orgMembership";
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
  userId,
  personLabel,
  onClose,
  onAdded,
}: {
  open: boolean;
  userId: string;
  personLabel: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [role, setRole] = useState<OrgRole>("member");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length < 2) return;
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
          if (!alive) return;
          setSearchError(error ? error.message : null);
          setResults(data ?? []);
        });
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, open]);

  const close = () => {
    setQuery("");
    setResults([]);
    setPicked(null);
    setRole("member");
    onClose();
  };

  const submit = async () => {
    if (!picked) return;
    setSaving(true);
    try {
      await mutateOrgMembership("POST", { organizationId: picked.id, userId, role });
      recordToast.success({ type: "organization", id: picked.id, title: picked.name }, `Added to ${picked.name}`);
      onAdded();
      close();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to organization</DialogTitle>
          <DialogDescription className="truncate">{personLabel}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <SearchField value={query} placeholder="Search organizations…" onChange={(e) => setQuery(e.target.value)} aria-label="Search organizations" />
          {searchError ? <p className="type-secondary text-destructive">{searchError}</p> : null}
          {query.trim().length >= 2 && results.length === 0 && !searchError ? (
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
          <Button variant="primary" disabled={!picked || saving} onClick={() => void submit()}>
            {picked ? `Add to ${picked.name}` : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserOrganizationsTab({ userId, overview, reload }: UserTabBodyProps) {
  const [rows, setRows] = useState<PersonMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const label = personTitle(overview);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listPersonMemberships(userId)
      .then((list) => {
        if (!alive) return;
        setRows(list);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, version]);

  const refresh = () => {
    setVersion((v) => v + 1);
    reload();
  };

  const changeRole = async (m: PersonMembership, next: string) => {
    if (!isOrgRole(next) || next === m.role) return;
    const ok = await confirm({
      title: `Change role to ${getRoleLabel(next)}?`,
      description: `${label} becomes ${getRoleLabel(next)} in ${m.organization_name}.`,
      confirmLabel: "Change role",
    });
    if (!ok) return;
    setSaving(m.id);
    try {
      await mutateOrgMembership("PATCH", { organizationId: m.organization_id, userId, role: next });
      toast.success("Role updated");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

  const remove = async (m: PersonMembership) => {
    const ok = await confirm({
      title: `Remove from ${m.organization_name}?`,
      description: `${label} loses this membership. The last owner, or a person's only organization, is refused.`,
      confirmLabel: "Remove",
      variant: "destructive",
    });
    if (!ok) return;
    setSaving(m.id);
    try {
      await mutateOrgMembership("DELETE", { organizationId: m.organization_id, userId });
      toast.success("Membership removed");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  };

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
          description: "Not a member of any organization.",
          icon: <Building2 className="h-6 w-6 text-muted-foreground" />,
        }}
        toolbar={{ search: true, searchPlaceholder: "Search organizations…" }}
      />
      <AddToOrganizationDialog open={addOpen} userId={userId} personLabel={label} onClose={() => setAddOpen(false)} onAdded={refresh} />
    </div>
  );
}
