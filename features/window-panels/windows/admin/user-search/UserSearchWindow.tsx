"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, UserRound } from "lucide-react";
import { WindowPanel } from "@ai-matrx/summon/window";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Button } from "@/components/ui/button";
import { SearchField } from "@ai-matrx/design-system/controls";
import { createClient } from "@/utils/supabase/client";
import { AdminUserRef } from "@/features/admin/users/components/AdminUserRef";
import type { UserSearchCandidate } from "@/features/user-search/types";
import type { Database } from "@/types/database.types";
import { emitUserSearchEvent } from "@/features/user-search/callbacks";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export interface UserSearchWindowProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId: string;
  callbackGroupId: string;
  title: string;
  initialQuery: string;
  directory: "admin" | "provided";
  candidates: UserSearchCandidate[];
  excludeUserIds: string[];
}

type PersonHit = Database["admin"]["Functions"]["search_people"]["Returns"][number];

/** How many people one directory search returns (admin.search_people caps at 50). */
const DIRECTORY_LIMIT = 50;

function mapPersonHit(row: PersonHit): UserSearchCandidate {
  return {
    id: row.id,
    email: row.email ?? null,
    displayName: row.display_name ?? row.name ?? null,
    avatarUrl: row.avatar_url ?? null,
    phone: row.phone ?? null,
    adminLevel: row.admin_level ?? null,
    organizations: row.organizations ?? [],
    source: "Account directory",
    createdAt: row.created_at ?? null,
    lastSignInAt: row.last_sign_in_at ?? null,
  };
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function UserSearchWindow(props: UserSearchWindowProps) {
  if (!props.isOpen) return null;
  return <UserSearchWindowInner {...props} />;
}

function UserSearchWindowInner({
  onClose,
  instanceId,
  callbackGroupId,
  title,
  initialQuery,
  directory,
  candidates,
  excludeUserIds,
}: UserSearchWindowProps) {
  const [rows, setRows] = useState<UserSearchCandidate[]>(candidates);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initialQuery);
  const query = search.trim();

  // The admin directory is searched IN the database (admin.search_people, users one-roof S10): each
  // pause in typing asks for the few people who match — never the whole roster.
  useEffect(() => {
    if (directory !== "admin" || !query) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      createClient()
        .schema("admin")
        .rpc("search_people", { p_query: query, p_limit: DIRECTORY_LIMIT })
        .then(({ data, error: rpcError }) => {
          if (cancelled) return;
          if (rpcError) setError(rpcError.message);
          else setRows((data ?? []).map(mapPersonHit));
          setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [directory, query]);

  const serverSearch = directory === "admin";
  const shownRows = serverSearch && !query ? [] : rows;

  const excluded = new Set(excludeUserIds);
  const visibleRows = shownRows.filter((row) => !excluded.has(row.id));

  const columns: MatrxColumnDef<UserSearchCandidate>[] = [
    {
      id: "user",
      header: "User",
      accessorFn: (row) => row.displayName ?? row.email ?? row.id,
      width: 230,
      cell: (row) =>
        directory === "admin" ? (
          <AdminUserRef
            userId={row.id}
            name={row.displayName}
            email={row.email}
          />
        ) : (
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">
              {row.displayName ?? row.email ?? "Unnamed user"}
            </div>
            {row.displayName && row.email ? (
              <div className="truncate text-xs text-muted-foreground">
                {row.email}
              </div>
            ) : null}
          </div>
        ),
    },
    {
      id: "email",
      header: "Email",
      accessorKey: "email",
      width: 220,
      cell: (row) => row.email ?? "—",
    },
    {
      id: "phone",
      header: "Phone",
      accessorKey: "phone",
      width: 140,
      cell: (row) => row.phone ?? "—",
      mobileHidden: true,
    },
    {
      id: "organizations",
      header: "Organizations",
      accessorFn: (row) => row.organizations.join(", "),
      width: 210,
      cell: (row) => row.organizations.join(", ") || "—",
      mobileHidden: true,
    },
    {
      id: "adminLevel",
      header: "Admin level",
      accessorKey: "adminLevel",
      filter: "select",
      width: 130,
      cell: (row) => row.adminLevel ?? "None",
      mobileHidden: true,
    },
    {
      id: "source",
      header: "Source",
      accessorKey: "source",
      filter: "select",
      width: 130,
      cell: (row) => row.source ?? "—",
      mobileHidden: true,
    },
    {
      id: "lastSignInAt",
      header: "Last sign-in",
      accessorKey: "lastSignInAt",
      width: 130,
      cell: (row) => formatDate(row.lastSignInAt),
      mobileHidden: true,
    },
  ];

  const close = () => {
    emitUserSearchEvent(callbackGroupId, { type: "window-close", instanceId });
    onClose();
  };

  const select = (user: UserSearchCandidate) => {
    emitUserSearchEvent(callbackGroupId, {
      type: "selected",
      instanceId,
      user,
    });
    close();
  };

  return (
    <WindowPanel
      id={`user-search:${instanceId}`}
      overlayId="userSearchWindow"
      title={title}
      titleNode={
        <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
          <Search className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{title}</span>
        </span>
      }
      onClose={close}
      width={1040}
      height={680}
      minWidth={380}
      minHeight={420}
      position="center"
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-3"
    >
      {error ? (
        <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-ink">
          {error}
          <ErrorAlchemyMenu error={error} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <MatrxDataTable
          data={visibleRows}
          columns={[...(columns), { id: "custom-actions", header: "Actions", sortable: false, filter: false, customActions: (row) => (
            <Button variant="primary" onClick={() => select(row)}>
              Select
            </Button>
          ) }]}
          getRowId={(row) => row.id}
          searchText={(row) =>
            [
              row.id,
              row.email,
              row.displayName,
              row.phone,
              row.adminLevel,
              row.source,
              ...row.organizations,
            ]
              .filter(Boolean)
              .join(" ")
          }
          isLoading={loading}
          pageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          toolbar={
            serverSearch
              ? {
                  search: false,
                  customSearch: (
                    <SearchField
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name, email, or ID…"
                      aria-label="Search people"
                      className="min-w-[220px] sm:w-80"
                    />
                  ),
                }
              : {
                  search: true,
                  searchPlaceholder:
                    "Search name, email, phone, organization, or ID…",
                  searchValue: search,
                  onSearchChange: setSearch,
                }
          }
          // read-gate-exempt: error swaps this for the failed-read state and the message above names the failure once
          emptyState={{
            icon: loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <UserRound className="h-5 w-5" />
            ),
            title: error
              ? "The user directory could not be read"
              : loading
                ? "Searching"
                : serverSearch && !query
                  ? "Search people"
                  : "No matching users",
            description: error
              ? "The read failed; see the message above."
              : loading
                ? "Reading the user directory."
                : serverSearch && !query
                  ? "Type a name, email, or ID."
                  : "Change the search or clear column filters.",
          }}
          onRowOpen={select}

        />
      </div>
    </WindowPanel>
  );
}

export default UserSearchWindow;
