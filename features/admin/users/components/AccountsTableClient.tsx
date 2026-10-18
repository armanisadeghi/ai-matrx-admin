"use client";

// Accounts tab of the Users & Access hub — the canonical roster.
//
// Full user data (auth facts + profile name/avatar + admin level) in the
// official MatrxDataTable: per-column sort/filter, Copy-for-AI (row + view),
// and real per-row actions (magic link, password reset, email, onboarding
// flag) plus cross-links to this user's preferences / usage / admin level via
// ?user=<id>. An admin surface hides nothing.

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Gift,
  MoreHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { isJsonObject } from "@/types/json";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { runPerRow } from "@/lib/entity-list/standardBulkActions";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { Lock, Unlock } from "lucide-react";
import { formatCount } from "@ai-matrx/kit/format";
import { Cost } from "@/components/cost/Cost";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { toast } from "@/lib/toast";
import { useAppSelector } from "@/lib/redux/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import { filterAndSortRows } from "@ai-matrx/design-system/data-table/filter-engine";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { useTableUrlState } from "@ai-matrx/design-system/data-table/url-state";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { ADMIN_USERS_SURFACE_NAME } from "@/features/surfaces/manifests/admin-users.manifest";
import { buildAdminUsersScope } from "../lib/admin-users-scope";
import { AdminUserRef } from "./AdminUserRef";
import { USERS_ADMIN_LOCATION, ADMIN_LEVEL_LABEL } from "../constants";
import type { AdminUserRow } from "../types";
import { ErrorNotice } from "@ai-matrx/design-system";
import { periodLabel } from "@/features/admin/limits/types";
import { UserResearchDialog } from "./UserResearchDialog";
import { readUserResearch } from "../service/userResearch";
import { readMyUserNotes, type MyUserNoteRow } from "../service/userNotes";
import { RELATIONSHIP_LABELS, CONTACT_STATE_LABELS, type UserResearch } from "../lib/userResearch";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { buildAdminUserMenuSection } from "./admin-user-menu-section";
import { personChanged, useUserActions } from "../record/useUserActions";
import {
  allUserActions,
  userDoors,
  userRecordHref,
} from "../record/userSurfaces";
import { AI_REQUESTS_LABEL } from "../record/userOverview";
import { pushAppHref } from "@/lib/deployment/navigate";
import { loadAdminRoster } from "../adminRoster";
import { pushAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { readOf } from "@ai-matrx/design-system";
import { DrillExplorer } from "@/components/official/drill-explorer/DrillExplorer";
import { DrillOrList } from "@/components/official/drill-explorer/DrillOrList";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";
import { usageNameResolver } from "@/features/admin/usage-drill/useUsageDrill";
import { useListViewPrefs } from "@/lib/list-views/useListViewPrefs";
import {
  PERSON_KIND_LABEL,
  PERSON_STAGE_LABEL,
  PERSON_STAGE_RANK,
  withOwnerCategory,
} from "../lib/personSegments";
import {
  ACCOUNT_SEGMENTS,
  DEFAULT_ACCOUNT_SEGMENT,
  isAccountSegment,
  rowInSegment,
  type AccountSegment,
} from "../lib/accountSegments";
import {
  ACCOUNT_STARTER_VIEWS,
  ACCOUNT_STATUS_COLUMN,
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_STATUSES,
  accountStatuses,
  accountStatusLabels,
  type AccountStatus,
} from "../lib/accountStatus";

const ROSTER_PAGE_SIZE = 50;

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const USAGE_TONE: Record<NonNullable<AdminUserRow["plan"]>["state"], string> = {
  ok: "text-muted-foreground",
  near: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  over: "text-rose-600 border-rose-500/40 bg-rose-500/10",
};

const PLAN_SOURCE_LABEL: Record<NonNullable<AdminUserRow["plan"]>["source"], string> = {
  grant: "Assigned to this person",
  default: "Default plan",
  guest: "Guest allowance",
  organization: "From the organization's Enterprise values",
};

function usageTitle(plan: NonNullable<AdminUserRow["plan"]>): string | undefined {
  const b = plan.binding;
  if (!b) return undefined;
  const limit = b.limit === null ? "unlimited" : formatCount(b.limit);
  const resets = b.resets_at ? ` · resets ${new Date(b.resets_at).toLocaleString()}` : "";
  return `${periodLabel(b.period)}: ${formatCount(b.used)} / ${limit} points${resets}`;
}

const STATUS_TONE: Record<AccountStatus, string> = {
  active: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10",
  closed: "text-rose-600 border-rose-500/40 bg-rose-500/10",
  guest: "text-muted-foreground border-border bg-muted",
  admin: "text-sky-600 border-sky-500/40 bg-sky-500/10",
  grant: "text-violet-600 border-violet-500/40 bg-violet-500/10",
  near_limit: "text-amber-600 border-amber-500/40 bg-amber-500/10",
  over_limit: "text-rose-600 border-rose-500/40 bg-rose-500/10",
};

/** The Status facet's "no status chosen" value. */
const ANY_STATUS = "any";

/** Seeded once per admin: the roster's starter views (the admin's own stored views win). */
const ACCOUNT_VIEW_DEFAULTS = { savedViews: ACCOUNT_STARTER_VIEWS };

const KIND_TONE: Record<AdminUserRow["kind"], string> = {
  person: "text-emerald-600 border-emerald-500/40 bg-emerald-500/10",
  circle: "text-violet-600 border-violet-500/40 bg-violet-500/10",
  team: "text-sky-600 border-sky-500/40 bg-sky-500/10",
  test: "text-muted-foreground border-border bg-muted",
  bot: "text-amber-600 border-amber-500/40 bg-amber-500/10",
};

function levelBadge(level: string | null) {
  if (!level) return <span className="text-xs text-muted-foreground">—</span>;
  const label = ADMIN_LEVEL_LABEL[level] ?? level;
  const variant =
    level === "super_admin"
      ? "text-rose-600 border-rose-500/40 bg-rose-500/10"
      : level === "senior_admin"
        ? "text-amber-600 border-amber-500/40 bg-amber-500/10"
        : "text-sky-600 border-sky-500/40 bg-sky-500/10";
  return (
    <Badge variant="outline" className={variant}>
      {label}
    </Badge>
  );
}

/** Organizations shown inline in the Accounts cell; the rest sit behind "+N more". */
const ORG_CELL_VISIBLE = 3;

function AccountsRoster() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // `?user=<id>` is THE canonical destination for a named user (AdminUserRef's
  // first door). Same focus-banner shape the sibling consoles already use.
  const focusedUserId = searchParams.get("user");
  // Which slice of the roster is showing. Default: people who signed up —
  // bots, test accounts and idle guests are one click away, with their count
  // on the button, never silently dropped.
  const segmentParam = searchParams.get("segment");
  const segment: AccountSegment = isAccountSegment(segmentParam)
    ? segmentParam
    : DEFAULT_ACCOUNT_SEGMENT;
  const { prefs: viewPrefs, setPrefs: setViewPrefs } =
    useListViewPrefs("admin-user-accounts", ACCOUNT_VIEW_DEFAULTS);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const researchOwnerId = useAppSelector(state => state.userAuth.id);
  const costDisplay = useCostDisplay();
  const [refreshKey, setRefreshKey] = useState(0);
  const [research, setResearch] = useState<UserResearch[]>([]);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchTarget, setResearchTarget] = useState<AdminUserRow | null>(null);
  const researchByUser = useMemo(() => new Map(research.filter(record => record.created_by === researchOwnerId).map(record => [record.subject_id, record])), [research, researchOwnerId]);
  const ownerOrganizations = useMemo(() => new Set(rows.find(row => row.id === researchOwnerId)?.organizations.map(org => org.id) ?? []), [rows, researchOwnerId]);
  useEffect(() => {
    if (!researchOwnerId) return;
    let cancelled = false;
    void readUserResearch(researchOwnerId).then(records => { if (!cancelled) { setResearch(records); setResearchError(null); } })
      .catch(error => { if (!cancelled) setResearchError(error instanceof Error ? error.message : "Could not load personal notes"); });
    return () => { cancelled = true; };
  }, [researchOwnerId, refreshKey]);
  // "My notes": my own notes about people, from the ONE home (admin.my_user_notes).
  const [myNotes, setMyNotes] = useState<Map<string, MyUserNoteRow[]>>(new Map());
  const [myNotesError, setMyNotesError] = useState<string | null>(null);
  const [myNotesVersion, setMyNotesVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void readMyUserNotes().then(byUser => { if (!cancelled) { setMyNotes(byUser); setMyNotesError(null); } })
      .catch(error => { if (!cancelled) setMyNotesError(error instanceof Error ? error.message : "Could not load my notes"); });
    return () => { cancelled = true; };
  }, [refreshKey, myNotesVersion]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickedRow, setClickedRow] = useState<AdminUserRow | null>(null);
  // The table's search / column filters / sort / page live HERE rather than
  // inside MatrxDataTable ("controlled-local": the table still filters the
  // local rows, the caller just owns the query). Without this the admin's
  // live query is invisible to everything outside the table — including the
  // surface emitter, which has to be able to say how many accounts still
  // match what the admin is looking at.
  const tableQuery = useTableUrlState({
    tableId: "user-accounts",
    defaultPageSize: ROSTER_PAGE_SIZE,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // THE shared roster (one read per tab); Refresh asks for a fresh one.
        const json = await loadAdminRoster({ refresh: refreshKey > 0 });
        if (!cancelled) {
          setRows(json.users as AdminUserRow[]);
          setPlansError(typeof json.plans_error === "string" ? json.plans_error : null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // The per-person actions are THE one dispatch (the person's record page runs the same code):
  // labels, "can't now, because…" and every dialog come from it. A change the database accepted
  // patches this roster's row; one with nothing to patch (plan, free months) re-reads the roster.
  const userActions = useUserActions({
    onChanged: (id, patch) => {
      if (Object.keys(patch).length === 0) setRefreshKey((key) => key + 1);
      else setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
  });
  const { messageTarget, messageDraft, dialogs: userActionDialogs } = userActions;

  const columns = useMemo((): MatrxColumnDef<AdminUserRow>[] => {
    return [
      {
        id: "display_name",
        accessorKey: "display_name",
        header: "Name",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              {row.avatar_url ? (
                <AvatarImage src={row.avatar_url} alt="" />
              ) : null}
              <AvatarFallback className="text-[10px]">
                {(row.display_name ?? row.email ?? "?")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <AdminUserRef
              userId={row.id}
              name={
                row.display_name ??
                (row.is_anonymous ? `Guest ${row.id.slice(0, 6)}` : null)
              }
              email={row.email}
              hideEmail
              href={userRecordHref(row.id)}
            />
          </div>
        ),
        width: 200,
      },
      { id: "email", accessorKey: "email", header: "Email", width: 220 },
      {
        // Every chip true of the account; an array cell, so the select filter matches any one.
        id: ACCOUNT_STATUS_COLUMN,
        header: "Status",
        accessorFn: (row) => accountStatusLabels(row),
        filter: "select",
        sortable: false,
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-1">
            {accountStatuses(row).map((status) => (
              <Badge key={status} variant="outline" className={STATUS_TONE[status]}>
                {ACCOUNT_STATUS_LABEL[status]}
              </Badge>
            ))}
          </div>
        ),
        width: 170,
      },
      { id: "my_category", header: "My category", accessorFn: row => researchError ? "—" : RELATIONSHIP_LABELS[researchByUser.get(row.id)?.category ?? "unknown"], filter: "select", width: 150,
        cell: row => <Button variant="quiet" onClick={() => setResearchTarget(row)}>{researchError ? "—" : RELATIONSHIP_LABELS[researchByUser.get(row.id)?.category ?? "unknown"]}</Button> },
      { id: "contact_status", header: "Contact status", accessorFn: row => researchError ? "—" : CONTACT_STATE_LABELS[researchByUser.get(row.id)?.contact_state ?? (row.banned ? "hold" : "not_contacted")], filter: "select", width: 130 },
      { id: "my_notes", header: "My notes", accessorFn: row => myNotesError ? "—" : (myNotes.get(row.id)?.map(note => note.content).join(" · ") ?? ""), hidden: true, width: 240 },
      {
        id: "kind",
        header: "Who",
        accessorFn: (row) => PERSON_KIND_LABEL[row.kind],
        filter: "select",
        cell: (row) => (
          <Badge
            variant="outline"
            className={KIND_TONE[row.kind]}
            title={row.kind_reason}
          >
            {PERSON_KIND_LABEL[row.kind]}
          </Badge>
        ),
        width: 90,
      },
      {
        id: "stage",
        header: "Stage",
        accessorFn: (row) => PERSON_STAGE_LABEL[row.stage],
        sortValue: (row) => PERSON_STAGE_RANK[row.stage],
        filter: "select",
        cell: (row) => (
          <span
            className={
              row.stage === "active" || row.stage === "used_ai"
                ? "text-xs font-medium text-foreground"
                : "text-xs text-muted-foreground"
            }
          >
            {PERSON_STAGE_LABEL[row.stage]}
          </span>
        ),
        width: 130,
      },
      {
        id: "plan",
        header: "Plan",
        accessorFn: (row) => row.plan?.name ?? "—",
        filter: "select",
        cell: (row) =>
          row.plan ? (
            <span
              className="text-xs"
              title={`${PLAN_SOURCE_LABEL[row.plan.source]}${row.plan.grant_expires_at ? ` · until ${fmtDate(row.plan.grant_expires_at)}` : ""}${row.plan.grant_note ? ` · ${row.plan.grant_note}` : ""}`}
            >
              {row.plan.name}
              <span className="ml-1 text-muted-foreground">
                {row.plan.source === "grant" ? "" : row.plan.source === "guest" ? "(guest)" : row.plan.source === "organization" ? `(${row.plan.organization?.name ?? "organization"})` : "(default)"}
              </span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 130,
      },
      {
        id: "usage",
        header: "Usage",
        accessorFn: (row) => row.plan?.state ?? "—",
        filter: "select",
        cell: (row) =>
          row.plan ? (
            <Badge
              variant="outline"
              className={USAGE_TONE[row.plan.state]}
              title={usageTitle(row.plan)}
            >
              {row.plan.state}
              {row.plan.binding && row.plan.binding.limit ? (
                <span className="ml-1 tabular-nums">
                  {Math.min(999, Math.round((row.plan.binding.used / row.plan.binding.limit) * 100))}%
                </span>
              ) : null}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 100,
      },
      {
        id: "ai_requests",
        accessorKey: "ai_requests",
        header: AI_REQUESTS_LABEL,
        filter: "number",
        align: "right",
        cell: (row) =>
          row.ai_requests > 0 ? (
            <span className="text-xs tabular-nums">
              {formatCount(row.ai_requests)}
              {row.ai_requests_7d > 0 ? (
                <span
                  className="ml-1 text-muted-foreground"
                  title="In the last 7 days"
                >
                  ({formatCount(row.ai_requests_7d)} 7d)
                </span>
              ) : null}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 120,
      },
      {
        id: "ai_active_days",
        accessorKey: "ai_active_days",
        header: "Active days",
        filter: "number",
        align: "right",
        cell: (row) =>
          row.ai_active_days > 0 ? (
            <span
              className="text-xs tabular-nums"
              title={`First AI use ${fmtDate(row.first_ai_activity)}`}
            >
              {formatCount(row.ai_active_days)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 100,
      },
      {
        id: "last_ai_activity",
        accessorKey: "last_ai_activity",
        header: "Last AI use",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {fmtDate(row.last_ai_activity)}
          </span>
        ),
        width: 110,
      },
      {
        id: "ai_cost",
        accessorKey: "ai_cost",
        header: "AI cost",
        filter: "number",
        align: "right",
        cell: (row) => (
          <Cost
            usd={row.ai_cost > 0 ? row.ai_cost : null}
            short
            className="text-xs text-muted-foreground"
          />
        ),
        width: 150,
      },
      {
        id: "source",
        accessorKey: "source",
        header: "Source",
        filter: "select",
        cell: (row) =>
          row.source ? (
            <span
              className="block max-w-[140px] truncate text-xs"
              title={row.landing ?? undefined}
            >
              {row.source}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 130,
      },
      {
        id: "client",
        accessorKey: "client",
        header: "Client",
        filter: "select",
        cell: (row) =>
          row.client ? (
            <span className="block max-w-[150px] truncate text-xs">
              {row.client}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 150,
      },
      {
        id: "landing",
        accessorKey: "landing",
        header: "Landing page",
        hidden: true,
        cell: (row) =>
          row.landing ? (
            <span className="block max-w-[220px] truncate text-xs">
              {row.landing}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 220,
      },
      {
        id: "organizations",
        header: "Organizations",
        accessorFn: (row) =>
          row.organizations
            .map((organization) => `${organization.name} ${organization.role}`)
            .join(" "),
        // Every organization named here is a real record with a route — each
        // one links to itself instead of being flattened into a comma string
        // whose only destination was a filtered list of the OTHER entity.
        cell: (row) =>
          row.organizations.length === 0 ? (
            <span className="text-xs text-muted-foreground">—</span>
          ) : (
            <div className="flex max-w-[280px] items-center gap-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5">
                {row.organizations
                  .slice(0, ORG_CELL_VISIBLE)
                  .map((organization, index, shown) => (
                    <span
                      key={organization.id}
                      className="inline-flex min-w-0 items-center text-xs"
                    >
                      <EntityRef
                        token="organization"
                        id={organization.id}
                        name={organization.name}
                        showIcon={false}
                      />
                      {index < shown.length - 1 ? (
                        <span className="text-muted-foreground">,</span>
                      ) : null}
                    </span>
                  ))}
                {row.organizations.length > ORG_CELL_VISIBLE ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        +{row.organizations.length - ORG_CELL_VISIBLE} more
                      </button>
                    </PopoverTrigger>
                    <PopoverContent /* sizing: fixed — a fixed-measure panel on purpose; its rows truncate inside the box */
                      align="start"
                      className="max-h-72 w-72 overflow-y-auto p-2"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ul className="flex flex-col gap-1">
                        {row.organizations.map((organization) => (
                          <li key={organization.id} className="text-xs">
                            <EntityRef
                              token="organization"
                              id={organization.id}
                              name={organization.name}
                              showIcon={false}
                            />
                          </li>
                        ))}
                      </ul>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
              <button
                type="button"
                title="View this user's organizations"
                aria-label="View this user's organizations"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  pushAppHref(router, userRecordHref(row.id, "organizations"));
                }}
              >
                <Building2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ),
        width: 280,
      },
      {
        id: "admin_level",
        accessorKey: "admin_level",
        header: "Admin",
        filter: "select",
        cell: (row) => levelBadge(row.admin_level),
        width: 120,
      },
      {
        id: "mcp_full_access",
        header: "MCP access",
        accessorFn: (row) => Boolean(row.admin_level) || row.mcp_full_access,
        filter: "boolean",
        cell: (row) =>
          row.admin_level ? (
            <Badge variant="outline">Admin</Badge>
          ) : row.mcp_full_access ? (
            <Badge variant="default">Granted</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Off</span>
          ),
        width: 120,
      },
      {
        id: "top_tier_models",
        header: "Top tier",
        accessorFn: (row) => row.top_tier_models,
        filter: "boolean",
        cell: (row) =>
          row.top_tier_models ? (
            <Badge variant="default">On</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Off</span>
          ),
        width: 96,
      },
      {
        id: "providers",
        header: "Providers",
        accessorFn: (r) => r.providers.join(", "),
        filter: "select",
        cell: (row) =>
          row.providers.length ? (
            <span className="text-xs">{row.providers.join(", ")}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 120,
      },
      {
        id: "email_confirmed",
        accessorKey: "email_confirmed",
        header: "Confirmed",
        filter: "boolean",
        align: "center",
        cell: (row) =>
          row.email_confirmed ? (
            <BadgeCheck className="mx-auto h-4 w-4 text-emerald-500" />
          ) : (
            <span className="text-xs text-muted-foreground">No</span>
          ),
        width: 90,
      },
      {
        id: "onboarding_completed",
        accessorKey: "onboarding_completed",
        header: "Onboarded",
        filter: "boolean",
        align: "center",
        cell: (row) => (
          <span className="text-xs">
            {row.onboarding_completed ? "Yes" : "New"}
          </span>
        ),
        width: 90,
      },
      {
        id: "last_sign_in_at",
        accessorKey: "last_sign_in_at",
        header: "Last sign-in",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {fmtDate(row.last_sign_in_at)}
          </span>
        ),
        width: 120,
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: "Created",
        format: { id: "datetime" },
        filter: "date",
        cell: (row) => (
          <span className="text-xs text-muted-foreground">
            {fmtDate(row.created_at)}
          </span>
        ),
        width: 110,
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "Phone",
        hidden: true,
        cell: (row) =>
          row.phone ? (
            <span className="text-xs">{row.phone}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
        width: 120,
      },
      {
        id: "id",
        accessorKey: "id",
        header: "User ID",
        cellKind: "uuid",
        sortable: false,
        filter: false,
        width: 120,
      },
    ];
  }, [router, researchByUser, researchError, setResearchTarget]);

  // Derived, never stored: a deep link that arrives after load and one that
  // arrives before it resolve identically, and closing the focus cannot fight a
  // seeding effect.
  const focusedUser = focusedUserId
    ? (rows.find((row) => row.id === focusedUserId) ?? null)
    : null;
  // A focused account always shows, whatever segment it falls in — the admin
  // asked for that one record by id.
  // Your own category (friend, employee, test…) outranks the automatic guess.
  const classifiedRows = rows.map((row) => {
    const category = researchByUser.get(row.id)?.category;
    return withOwnerCategory(
      row,
      category,
      category ? RELATIONSHIP_LABELS[category] : undefined,
    );
  });
  const segmentCounts = Object.fromEntries(
    ACCOUNT_SEGMENTS.map((entry) => [
      entry.id,
      classifiedRows.filter((row) => rowInSegment(row, entry.id)).length,
    ]),
  ) as Record<AccountSegment, number>;
  const visibleRows = focusedUserId
    ? classifiedRows.filter((row) => row.id === focusedUserId)
    : classifiedRows.filter((row) => rowInSegment(row, segment));

  // THE STATUS FACET is the Status column's own select filter, drawn as chips: one source of truth,
  // so a saved view, the column's filter menu and the chips can never disagree.
  const statusFilter = tableQuery.state.columnFilters[ACCOUNT_STATUS_COLUMN];
  const chosenStatusLabels =
    statusFilter?.kind === "select" && !statusFilter.negated
      ? (statusFilter.values ?? [statusFilter.value])
      : [];
  const statusFacetValue =
    chosenStatusLabels.length === 0
      ? ANY_STATUS
      : chosenStatusLabels.length === 1
        ? (ACCOUNT_STATUSES.find((entry) => entry.label === chosenStatusLabels[0])?.id ?? "")
        : "";
  const statusCounts = Object.fromEntries(
    ACCOUNT_STATUSES.map((entry) => [
      entry.id,
      visibleRows.filter((row) => accountStatuses(row).includes(entry.id)).length,
    ]),
  ) as Record<AccountStatus, number>;
  function selectStatus(next: string) {
    const { [ACCOUNT_STATUS_COLUMN]: _previous, ...otherFilters } = tableQuery.state.columnFilters;
    const label = ACCOUNT_STATUSES.find((entry) => entry.id === next)?.label;
    tableQuery.onStateChange({
      ...tableQuery.state,
      page: 1,
      columnFilters: label
        ? { ...otherFilters, [ACCOUNT_STATUS_COLUMN]: { kind: "select", value: label, values: [label] } }
        : otherFilters,
    });
  }

  // BULK CLOSE / REOPEN — the roster's own iam.close_account / reopen_account,
  // once per person; refusals (your own account, an erased one) are skipped and
  // named. Built-ins are off: people are not favouritable/trashable records.
  const accountBulkActions: EntityBulkAction<AdminUserRow>[] = [
    {
      id: "give-free-months",
      label: "Give free months…",
      icon: Gift,
      // The dialog resolves nothing, so the selection stays; people without
      // an account of their own are named and left out, never unticked.
      run: (sel) => {
        const people = sel.rows.filter((row) => !row.is_anonymous);
        if (people.length === 0) throw new Error("Anonymous visitors have no billing account to credit.");
        if (people.length < sel.rows.length) {
          toast.warning(`${sel.rows.length - people.length} anonymous visitor(s) left out`);
        }
        userActions.giveFreeMonths(
          people.map((row) => ({ id: row.id, label: row.display_name ?? row.email ?? row.id })),
        );
      },
    },
    {
      id: "close-accounts",
      label: "Close",
      icon: Lock,
      variant: "destructive",
      confirm: (sel) => ({
        title: `Close ${sel.count} account${sel.count === 1 ? "" : "s"}?`,
        description: `${sel.count} ${sel.count === 1 ? "person" : "people"} can't sign in again (open sessions last up to an hour); API keys are revoked, schedules pause. Records stay; reopen any time.`,
        confirmLabel: "Close accounts",
        variant: "destructive",
        reason: { placeholder: "Reason (recorded with each closure)" },
      }),
      run: async (sel, input) => {
        const reason = input?.reason;
        if (!reason) throw new Error("A reason is required to close accounts.");
        return runPerRow(
          sel,
          async (id) => {
            const { error } = await createClient()
              .schema("iam")
              .rpc("close_account", { p_user: id, p_reason: reason });
            // access-errors: ok — a write refusal, named per row in the bulk result.
            if (error) throw new Error(error.message);
            personChanged(id);
          },
          {
            done: "Closed",
            noun: "account",
            labelOf: (row) => row.email ?? row.display_name ?? row.id,
            skipReason: (row) =>
              row.id === researchOwnerId
                ? "Your own account"
                : row.banned
                  ? "Already closed"
                  : null,
          },
          (row) => row.id,
        );
      },
    },
    {
      id: "reopen-accounts",
      label: "Reopen",
      icon: Unlock,
      confirm: (sel) => ({
        title: `Reopen ${sel.count} account${sel.count === 1 ? "" : "s"}?`,
        description: `${sel.count} ${sel.count === 1 ? "person" : "people"} can sign in again; paused schedules and connections resume. Revoked API keys stay revoked.`,
        confirmLabel: "Reopen",
        reason: { placeholder: "Reason (recorded in the admin history)" },
      }),
      run: async (sel, input) => {
        const reason = input?.reason;
        if (!reason) throw new Error("A reason is required to reopen accounts.");
        return runPerRow(
          sel,
          async (id) => {
            const { data, error } = await createClient()
              .schema("iam")
              .rpc("reopen_account", { p_user: id, p_reason: reason });
            // access-errors: ok — a write refusal, named per row in the bulk result.
            if (error) throw new Error(error.message);
            // `reopened: false` = nothing was closed: a skip with its reason, never a "Reopened" (B2).
            if (isJsonObject(data) && data.reopened === false) {
              throw new Error("Already open");
            }
            personChanged(id);
          },
          {
            done: "Reopened",
            noun: "account",
            labelOf: (row) => row.email ?? row.display_name ?? row.id,
            skipReason: (row) =>
              row.erased ? "Erased — cannot be reopened" : !row.banned ? "Already open" : null,
          },
          (row) => row.id,
        );
      },
    },
  ];
  const accountBulk = useTableBulkSelection<AdminUserRow>({
    noun: "account",
    rows: visibleRows,
    getRowId: (row) => row.id,
    getRowName: (row) => row.email ?? row.display_name ?? row.id,
    actions: accountBulkActions,
    standardBulkActions: false,
    onRefresh: () => setRefreshKey((key) => key + 1),
  });

  function selectSegment(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_ACCOUNT_SEGMENT) params.delete("segment");
    else params.set("segment", next);
    const query = params.toString();
    pushAddressWithoutNavigating(query ? `${pathname}?${query}` : pathname);
  }
  // The roster loaded and the requested account is not in it. Saying "no
  // accounts match your filters" here would blame a filter for a record that
  // simply is not in this list.
  const focusMissed = Boolean(
    focusedUserId && !loading && !error && focusedUser === null,
  );

  // How many accounts survive the admin's current query. Computed with the
  // table's OWN engine over the table's OWN inputs, so the number the surface
  // emits cannot drift from the number the table renders — a re-implemented
  // count would be a second source of truth that silently disagrees the first
  // time a filter kind is added.
  const matchingRows = useMemo(
    () =>
      filterAndSortRows(
        visibleRows,
        columns.filter((column) => !column.hidden),
        tableQuery.state.columnFilters,
        tableQuery.state.sort,
        tableQuery.state.search,
        undefined,
        tableQuery.state.layeredFilters,
        tableQuery.state.searchMatchMode,
      ),
    [visibleRows, columns, tableQuery.state],
  );

  function clearUserFocus() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("user");
    const query = params.toString();
    // Discrete close — Back re-opens the user the admin was just reading.
    pushAddressWithoutNavigating(query ? `${pathname}?${query}` : pathname);
  }

  return (
    // The roster's agent emitter. `getScope` is SYNCHRONOUS over the live
    // render state above — the Surface Context window polls it every 400ms
    // while it is open, so a build step that fetched would hammer
    // /api/admin/users behind a panel that looks idle.
    <SurfaceRuntimeProvider
      surfaceName={ADMIN_USERS_SURFACE_NAME}
      getScope={() =>
        buildAdminUsersScope({
          rows,
          loading,
          error,
          focusedUserId,
          focusedUser,
          focusMissed,
          matchingCount: matchingRows.length,
          search: tableQuery.state.search,
          columnFilters: tableQuery.state.columnFilters,
          sort: tableQuery.state.sort,
          page: tableQuery.state.page,
          pageSize: tableQuery.state.pageSize,
          dmRecipientId: messageTarget?.id ?? null,
          dmDraft: messageDraft,
        })
      }
    >
    <div className="flex h-full flex-col gap-3 p-4">
      {/* The read's failure is said once, by the table (read=). */}

      {focusedUserId ? (
        <div
          data-surface-value="focused_user"
          className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <UserRound className="h-4 w-4 shrink-0 text-primary" />
            {/* read-gate-exempt: focusMissed is true only after the accounts read succeeded (!loading && !error) */}
            {focusMissed ? (
              <span className="min-w-0">
                No account with id{" "}
                <code className="rounded bg-muted px-1 text-xs">
                  {focusedUserId}
                </code>{" "}
                is in this roster — it may have been deleted, or it may sit
                outside what this view loads.
              </span>
            ) : (
              <>
                <span className="shrink-0">Showing</span>
                <AdminUserRef
                  userId={focusedUserId}
                  name={focusedUser?.display_name}
                  email={focusedUser?.email}
                  hideEmail
                />
              </>
            )}
          </div>
          <Button icon={<X />} variant="quiet" onClick={clearUserFocus}> Show all accounts
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1" data-surface-value="visible_user_count">
        <NonEditableContextMenu
          sourceFeature="admin"
          contentSource={{ type: "raw" }}
          contextData={{ content: "" }}
          resolveContextOnOpen={(element) => {
            const id = element
              ?.closest("[data-row-id]")
              ?.getAttribute("data-row-id");
            const row = id ? (visibleRows.find((r) => r.id === id) ?? null) : null;
            setClickedRow(row);
            if (!row) return null;
            return {
              content: [
                `${row.display_name ?? "(no name)"} <${row.email ?? "no-email"}>`,
                `id=${row.id}`,
                row.admin_level ? `admin=${row.admin_level}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            };
          }}
          extraSections={[
            buildAdminUserMenuSection(
              clickedRow
                ? {
                    id: clickedRow.id,
                    email: clickedRow.email,
                    displayName: clickedRow.display_name,
                  }
                : null,
            ),
          ]}
        >
        <MatrxDataTable
          selection={accountBulk.selection}
          data={visibleRows}
          columns={[...(columns), { id: "custom-actions", header: "Manage", sortable: false, filter: false, customActions: (row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  icon={<MoreHorizontal />} aria-label="Actions"
                  variant="quiet"
                  title="Actions"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">
                  {row.email ?? row.id}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setResearchTarget(row)}>
                  <UserRound className="mr-2 h-4 w-4" /> Personal notes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* THE registry: the page's tabs, then the hub pages no tab replaces. */}
                {userDoors(row.id, { withoutActions: true }).map(({ id, label, icon: Icon, href }) => (
                  <DropdownMenuItem key={id} onClick={() => pushAppHref(router, href)}>
                    <Icon className="mr-2 h-4 w-4" /> {label}
                  </DropdownMenuItem>
                ))}
                {allUserActions().flatMap((def, index, list) => {
                  const itemLabel = userActions.labelFor(def.id, row);
                  if (!itemLabel) return [];
                  const Icon = def.icon;
                  const blocked = userActions.blockedReason(def.id, row);
                  const startsGroup = index === 0 || list[index - 1]?.group !== def.group;
                  return [
                    ...(startsGroup ? [<DropdownMenuSeparator key={`sep-${def.id}`} />] : []),
                    <DropdownMenuItem
                      key={def.id}
                      disabled={blocked !== null}
                      onClick={() => userActions.run(def.id, row)}
                    >
                      <Icon className="mr-2 h-4 w-4" /> {itemLabel}
                      {blocked ? <span className="ml-auto pl-4 type-meta">{blocked}</span> : null}
                    </DropdownMenuItem>,
                  ];
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) }]}
          getRowId={(r) => r.id}
          // A row opens the person's own record page (the Name cell links there too).
          getRowHref={(r) => userRecordHref(r.id)}
          rowClick="page"
          // onRowOpen is what turns on the table's row hover + pointer; the page click itself
          // goes through getRowHref above, so this only runs when a row has no href.
          onRowOpen={(r) => pushAppHref(router, userRecordHref(r.id))}
          isLoading={loading}
          pageSize={ROSTER_PAGE_SIZE}
          // Local filtering, caller-owned query — see `tableQuery` above.
          query={{
            mode: "controlled-local",
            state: tableQuery.state,
            onStateChange: tableQuery.onStateChange,
          }}
          // A focused id that is not in the roster must NOT be reported as a
          // filter miss — that blames a control the user never touched for a
          // record that simply is not in this list. The banner above says what
          // actually happened; this only has to stop contradicting it.
          read={readOf({ loading, error }, { what: "user accounts" })}
          emptyState={
            focusMissed
              ? {
                  title: "That account isn't in this roster",
                  description:
                    "Clear the focus above to see every account this view loads.",
                }
              : {
                  title: "No users",
                  description: "No accounts match your filters.",
                }
          }
          viewTabsStore={{
            views: viewPrefs.savedViews ?? [],
            onChange: (savedViews) => setViewPrefs({ savedViews }),
          }}
          summary={{
            metrics: [
              {
                id: "accounts",
                label: "Accounts",
                value: ({ rows: shown }) => formatCount(shown.length),
              },
              {
                id: "signed_in",
                label: "Signed in",
                value: ({ rows: shown }) =>
                  formatCount(shown.filter((row) => !row.is_anonymous && row.last_sign_in_at).length),
              },
              {
                id: "used_ai",
                label: "Used AI",
                value: ({ rows: shown }) =>
                  formatCount(shown.filter((row) => row.ai_requests > 0).length),
              },
              {
                id: "active_7d",
                label: "Active this week",
                value: ({ rows: shown }) =>
                  formatCount(shown.filter((row) => row.ai_requests_7d > 0).length),
              },
              {
                id: "ai_cost",
                label: "AI cost",
                value: ({ rows: shown }) =>
                  costDisplay.format(
                    shown.reduce((sum, row) => sum + row.ai_cost, 0) || null,
                    { short: true },
                  ),
              },
            ],
          }}
          toolbar={{
            search: true,
            searchPlaceholder: "Search name, email, id…",
            facets: focusedUserId
              ? []
              : [
                  {
                    type: "button-group",
                    id: "segment",
                    value: segment,
                    defaultValue: DEFAULT_ACCOUNT_SEGMENT,
                    options: ACCOUNT_SEGMENTS.map((entry) => ({
                      value: entry.id,
                      label: `${entry.label} ${formatCount(segmentCounts[entry.id])}`,
                    })),
                    onChange: selectSegment,
                  },
                  {
                    type: "button-group",
                    id: ACCOUNT_STATUS_COLUMN,
                    label: "Status",
                    value: statusFacetValue,
                    defaultValue: ANY_STATUS,
                    options: [
                      { value: ANY_STATUS, label: "Any status" },
                      // A status no account in this slice has is not offered (unless it is the one chosen).
                      ...ACCOUNT_STATUSES.filter(
                        (entry) => statusCounts[entry.id] > 0 || entry.id === statusFacetValue,
                      ).map((entry) => ({
                        value: entry.id,
                        label: `${entry.label} ${formatCount(statusCounts[entry.id])}`,
                      })),
                    ],
                    onChange: selectStatus,
                  },
                ],
            actions: (
              <Button
                variant="outline"
                onClick={() => setRefreshKey((current) => current + 1)}
              >
                Refresh
              </Button>
            ),
          }}
          copy={{
            label: "User",
            listLabel: "Users (this view)",
            location: USERS_ADMIN_LOCATION,
            rowKind: "user",
            listKind: "users",
            rowDescription: "One account from the admin Users roster.",
            listDescription: "Filtered/sorted user accounts currently visible.",
            humanRow: (r) =>
              [
                `${r.display_name ?? "(no name)"} <${r.email ?? "no-email"}>`,
                `id=${r.id}`,
                r.admin_level ? `admin=${r.admin_level}` : null,
                `providers=${r.providers.join("/") || "none"} confirmed=${r.email_confirmed} onboarded=${r.onboarding_completed} mcp_full_access=${Boolean(r.admin_level) || r.mcp_full_access}`,
                `kind=${r.kind} (${r.kind_reason}) stage=${r.stage} plan=${r.plan ? `${r.plan.key} (${r.plan.source}) usage=${r.plan.state}` : "unknown"} ai_requests=${r.ai_requests} ai_requests_7d=${r.ai_requests_7d} ai_cost=${costDisplay.format(r.ai_cost)} source=${r.source ?? "unknown"} client=${r.client ?? "unknown"}`,
                `created=${r.created_at ?? "?"} last_sign_in=${r.last_sign_in_at ?? "never"}`,
                `organizations=${r.organizations.map((organization) => `${organization.name}:${organization.role}`).join(",") || "none"}`,
              ]
                .filter(Boolean)
                .join("\n"),
            rowAttributes: (r) => ({
              id: r.id,
              email: r.email,
              admin_level: r.admin_level,
              mcp_full_access: Boolean(r.admin_level) || r.mcp_full_access,
              mcp_full_access_grant: r.mcp_full_access,
              onboarded: r.onboarding_completed,
              kind: r.kind,
              stage: r.stage,
              ai_requests: r.ai_requests,
            }),
            // `all` is the table's DATA prop, which is the focus-filtered
            // array — so the framework's own `total_count` reported 1 while the
            // roster held N accounts, telling any agent reading the payload
            // that the platform has one user. `listAttributes` is spread LAST
            // in buildListPayload, so overriding `total_count` here corrects
            // the canonical key rather than adding a second, truer one beside
            // a wrong one. The focused id is named so the payload explains its
            // own narrowness instead of silently understating the fleet.
            listAttributes: (visible) => ({
              visible_count: visible.length,
              total_count: rows.length,
              segment,
              ...(focusedUserId ? { focused_user_id: focusedUserId } : {}),
            }),
          }}

        />
        </NonEditableContextMenu>
      </div>

      {plansError && <ErrorNotice size="inline" message="Plans and usage could not load. Refresh to retry." error={plansError} operation="Load account plans" calls={["users.admin_account_plans"]} />}
      {researchError && <ErrorNotice size="inline" message="Personal notes could not load. Refresh to retry." error={researchError} operation="Load personal user notes" calls={["crm.party_research"]} />}
      {myNotesError && <ErrorNotice size="inline" message="My notes could not load. Refresh to retry." error={myNotesError} operation="Load my notes about people" calls={["admin.my_user_notes"]} />}
      {researchTarget && researchOwnerId && <UserResearchDialog
        key={researchTarget.id} row={researchTarget} ownerId={researchOwnerId}
        existing={researchByUser.get(researchTarget.id) ?? null}
        myNotes={myNotes.get(researchTarget.id) ?? []}
        sharedOrganizations={researchTarget.id === researchOwnerId ? [] : researchTarget.organizations.filter(org => ownerOrganizations.has(org.id)).map(org => org.name)}
        onClose={() => setResearchTarget(null)}
        onSaved={record => setResearch(records => [...records.filter(current => current.subject_id !== record.subject_id), record])}
        onNotesSaved={() => setMyNotesVersion(v => v + 1)}
      />}
      {userActionDialogs}
    </div>
    </SurfaceRuntimeProvider>
  );
}

// THE ROSTER COUNTED (lane DRILL-WAVE2-B): the roster is paged 50 at a time and mostly editing, so it
// stays the first screen; one control opens the declared definition `account_roster` — accounts, AI cost
// and requests by plan, by where they came from and by signup month, counted on the database.
export function AccountsTableClient() {
  return (
    <DrillOrList
      definition="account_roster"
      listLabel="Accounts"
      firstScreen="list"
      list={<AccountsRoster />}
      renderDrill={(extras) => (
        <DrillExplorer
          source={{ kind: "entity", token: "account_roster" }}
          lane="platform"
          // org-fallback-deliberate: the platform lane of an admin explorer asks in the platform's own organization (its calendar is UTC)
          organizationId={SYSTEM_ORGANIZATION_ID}
          timeZone="UTC"
          title="Accounts"
          rootLabel="All accounts"
          names={{ person: usageNameResolver(SYSTEM_ORGANIZATION_ID, "person") }}
          headline={{ measure: "accounts", also: ["cost", "requests"] }}
          rowNoun="account"
          countMeasure="accounts"
          location="Administration › Users › Accounts"
          headerExtras={extras}
          dataAttributes={{ "data-account-roster-drill": "" }}
        />
      )}
    />
  );
}
