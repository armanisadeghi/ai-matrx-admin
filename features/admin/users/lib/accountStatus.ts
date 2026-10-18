// features/admin/users/lib/accountStatus.ts
//
// THE STATUS CHIPS of an account (users one roof, lane L, 2026-10-18). Every chip is read straight
// off the roster row — never re-derived from another source: `banned` is the closure flag
// (iam.close_account), `is_anonymous` the guest flag, `admin_level` the admins row, the plan's
// `source` / `state` come verbatim from users.admin_account_plans. A row carries every chip that is
// true of it (an admin can also be on a grant), so the Status column is an ARRAY cell — the table's
// select filter treats it as a set, and the toolbar's Status facet is that same column filter.
//
// The three starter views of the Accounts roster live here too: they are the table's own saved
// views (useListViewPrefs → user_preferences, per admin, on the server), seeded once; an admin
// renames or closes them like any view they made.

import type { TableViewSnapshot } from "@ai-matrx/design-system/data-table/types";
import type { SavedListView } from "@/lib/redux/preferences/userPreferencesSlice";
import type { AdminUserRow } from "../types";

export const ACCOUNT_STATUSES = [
  { id: "active", label: "Active" },
  { id: "closed", label: "Closed" },
  { id: "guest", label: "Guest" },
  { id: "admin", label: "Admin" },
  { id: "grant", label: "On a grant" },
  { id: "near_limit", label: "Near limit" },
  { id: "over_limit", label: "Over limit" },
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]["id"];

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = Object.fromEntries(
  ACCOUNT_STATUSES.map((status) => [status.id, status.label]),
) as Record<AccountStatus, string>;

/** The Status column / filter id. */
export const ACCOUNT_STATUS_COLUMN = "status";

type StatusRow = Pick<AdminUserRow, "banned" | "is_anonymous" | "admin_level" | "plan">;

/** Every status true of this row, in chip order. */
export function accountStatuses(row: StatusRow): AccountStatus[] {
  const out: AccountStatus[] = [];
  if (row.banned) out.push("closed");
  else if (!row.is_anonymous) out.push("active");
  if (row.is_anonymous) out.push("guest");
  if (row.admin_level) out.push("admin");
  if (row.plan?.source === "grant") out.push("grant");
  if (row.plan?.state === "near") out.push("near_limit");
  if (row.plan?.state === "over") out.push("over_limit");
  return out;
}

/** The labels the Status column filters on (the select filter matches a label in the set). */
export function accountStatusLabels(row: StatusRow): string[] {
  return accountStatuses(row).map((status) => ACCOUNT_STATUS_LABEL[status]);
}

function starter(id: string, label: string, query: Partial<TableViewSnapshot["query"]>): SavedListView {
  return {
    id,
    label,
    snapshot: {
      __kind: "matrx-table-view",
      version: 1,
      query: {
        pageSize: 50,
        search: "",
        anyOf: "",
        columnFilters: {},
        sort: null,
        ...query,
      },
      // Empty: the roster's declared columns, in their declared order and visibility.
      columns: { order: [], hidden: [] },
    },
  };
}

/** Seeded as the surface default; the admin's own stored views always win. */
export const ACCOUNT_STARTER_VIEWS: SavedListView[] = [
  starter("starter-new-this-week", "New this week", {
    columnFilters: { created_at: { kind: "date", preset: "7d" } },
    sort: { id: "created_at", direction: "desc" },
  }),
  starter("starter-heavy-ai", "Heavy AI users", {
    columnFilters: { ai_requests: { kind: "number", min: 100 } },
    sort: { id: "ai_requests", direction: "desc" },
  }),
  starter("starter-closed", "Closed accounts", {
    columnFilters: {
      [ACCOUNT_STATUS_COLUMN]: { kind: "select", value: ACCOUNT_STATUS_LABEL.closed, values: [ACCOUNT_STATUS_LABEL.closed] },
    },
  }),
];
