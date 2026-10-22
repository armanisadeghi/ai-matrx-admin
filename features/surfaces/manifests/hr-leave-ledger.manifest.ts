/**
 * Surface manifest — HR time-off ledger (`matrx-user/hr-leave-ledger`).
 *
 * One person's balance on ONE leave policy and every entry that moved it: two routes, one
 * record shape (`hr.leave_ledger_view`), one key:
 *   - `/hr/leave/balances/[employmentId]/[policyId]` — a manager or HR reading someone's ledger;
 *   - `/hr/me/time-off/[policyId]` — the person reading their own (`ledger_viewer` says which).
 *
 * Emitters: `SurfaceRuntimeProvider` in `features/hr/leave/manager/LeaveLedgerSurface.tsx` and
 * `features/hr/leave/components/MyLeaveLedgerSurface.tsx`, both through
 * `buildHrLeaveLedgerScope` below.
 *
 * Read-only: there is no manual adjustment door on either page (the triage guessed one;
 * `LeaveLedgerView` renders entries only). Every figure is the server's; nothing is computed here.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import type { LeaveLedgerView } from "@/features/hr/leave/api/types";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_LEAVE_LEDGER_SURFACE_NAME = "matrx-user/hr-leave-ledger";

const groups: SurfaceValueGroup[] = [
  { key: "ledger", label: "Leave ledger", sortOrder: 100, description: "One balance on one policy and its entries." },
];

const values = [
  hrValue("ledger_status", "Load status", "string", "ledger", 10,
    '"loading", "loaded", "failed" or "no_access".', { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("ledger_viewer", "Whose view", "string", "ledger", 20,
    '"self" when the person is reading their own ledger, "delegated" when a manager or HR is reading someone else\'s.',
    { alwaysAvailable: true, typicalCharCount: 9 }),
  hrValue("ledger_employment_id", "Employment ID", "string", "ledger", 30,
    "The employment this ledger belongs to.", { typicalCharCount: 36 }),
  hrValue("ledger_policy_name", "Policy name", "string", "ledger", 35, "The leave policy's name."),
  hrValue("ledger_policy", "Policy", "object", "ledger", 40,
    "The policy: { id, name, leave_kind, accrual_method, accrual_rate, accrual_per_units, balance_cap, carryover_allowed, negative_balance_allowed, negative_balance_floor, usable_on }.",
    { typicalCharCount: 300 }),
  hrValue("ledger_as_of", "As of", "string", "ledger", 50, "The date the figures are read at (the page's as-of control)."),
  hrValue("ledger_figures", "Balance figures", "object", "ledger", 60,
    "The server's figures in hours: { unlimited (true → no numbers apply), accrued_to_date, used_taken, approved_upcoming, pending_approval, bookable_now (what can be booked right now), pending_beyond_balance, ledger_balance, removed, identity_holds (false → the figures do not add up, a defect the page shows) }.",
    { typicalCharCount: 300 }),
  hrValue("ledger_sentence", "Balance in words", "string", "ledger", 70,
    "The server's own sentence explaining the balance.", { typicalCharCount: 200, inlineUpTo: 1000 }),
  hrValue("ledger_entries", "Entries", "array", "ledger", 80,
    "Every entry up to the as-of date, oldest first: { id, occurred_on, sentence (the server's words), hours_delta, balance_after, request_state, request_starts_on, request_ends_on, counts_toward, unexplained }. Capped at the latest 200.",
    { typicalCharCount: 4000, autoContext: false }),
  hrValue("ledger_entry_count", "Entry count", "number", "ledger", 90, "How many entries the ledger holds."),
  hrValue("ledger_filter", "Filter", "string", "ledger", 100,
    'Which entries the table shows: "all", "added", "used" / "used_taken" or "approved_upcoming".'),
  hrValue("ledger_running_balance_ok", "Running balance checks out", "boolean", "ledger", 110,
    "False when the running balance diverges from the entries (the page shows a blocking banner)."),
];

export const hrLeaveLedgerManifest: SurfaceManifest = {
  surfaceName: HR_LEAVE_LEDGER_SURFACE_NAME,
  situation:
    "They are reading the {ledger_policy_name|time-off} ledger ({ledger_viewer|delegated} view) as of {ledger_as_of|today}: every accrual and use behind one balance (page: {ledger_status}). It is read-only.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "One person's balance on one leave policy and every entry that moved it.",
  label: "HR Leave ledger",
  urlPattern: "/hr/leave/balances/[employmentId]/[policyId]",
  intro: `<surface_intro>
One leave balance and its history. Every number is the server's; quote ledger_figures and ledger_sentence, never compute your own balance.
- bookable_now is what can be booked today; ledger_balance can differ when requests are pending.
- unlimited true means there is no balance to quote.
- Nothing on this page can be changed from here.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
};

const MAX_ENTRIES = 200;

export function buildHrLeaveLedgerScope(input: {
  status: HrLoadStatus;
  viewer: "self" | "delegated";
  ledger: LeaveLedgerView | null;
  filter: string;
}): SurfaceScopePayload {
  const l = input.ledger;
  const f = l?.figures;
  return compact({
    ledger_status: input.status,
    ledger_viewer: input.viewer,
    ledger_employment_id: l?.employmentId ?? null,
    ledger_policy_name: f?.policyName ?? null,
    ledger_policy: f
      ? compact({
          id: f.policyId ?? l?.leavePolicyId ?? null,
          name: f.policyName,
          leave_kind: f.leaveKind,
          accrual_method: f.accrualMethod,
          accrual_rate: f.accrualRate,
          accrual_per_units: f.accrualPerUnits,
          balance_cap: f.balanceCap,
          carryover_allowed: f.carryoverAllowed,
          negative_balance_allowed: f.negativeBalanceAllowed,
          negative_balance_floor: f.negativeBalanceFloor,
          usable_on: f.usableOn,
        })
      : null,
    ledger_as_of: l?.asOf ?? null,
    ledger_figures: f
      ? compact({
          unlimited: f.unlimited,
          accrued_to_date: f.accruedToDate,
          used_taken: f.usedTaken,
          approved_upcoming: f.approvedUpcoming,
          pending_approval: f.pendingApproval,
          bookable_now: f.bookableNow,
          pending_beyond_balance: f.pendingBeyondBalance,
          ledger_balance: f.ledgerBalance,
          removed: f.removed,
          identity_holds: f.identityHolds,
        })
      : null,
    ledger_sentence: l?.sentence ?? null,
    ledger_entries: l
      ? l.entries.slice(-MAX_ENTRIES).map((e) =>
          compact({
            id: e.id,
            occurred_on: e.occurredOn,
            sentence: e.sentence,
            hours_delta: e.hoursDelta,
            balance_after: e.balanceAfter,
            request_state: e.requestState,
            request_starts_on: e.requestStartsOn,
            request_ends_on: e.requestEndsOn,
            counts_toward: e.countsToward,
            unexplained: e.unexplained || null,
          }),
        )
      : null,
    ledger_entry_count: l ? (l.entryCount ?? l.entries.length) : null,
    ledger_filter: l ? input.filter : null,
    ledger_running_balance_ok: l?.runningBalanceOk ?? null,
  }) as SurfaceScopePayload;
}
