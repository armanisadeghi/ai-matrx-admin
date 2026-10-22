/**
 * Surface manifest — My pay (`matrx-user/hr-my-pay`), `/hr/me/pay`.
 *
 * The person's own compensation (`hr_my_compensation`): every pay component in force today,
 * each with its own amount and window (never summed — a base plus a differential are two
 * rates), scheduled changes, and the history.
 *
 * Emitter: `SurfaceRuntimeProvider` in `features/hr/me/MyPaySurface.tsx`.
 * Read-only by design: the page has no edit, no request, no download.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import { compact, hrValue, type HrLoadStatus } from "./hr-surface-kit";

export const HR_MY_PAY_SURFACE_NAME = "matrx-user/hr-my-pay";

const groups: SurfaceValueGroup[] = [
  { key: "pay", label: "My pay", sortOrder: 100, description: "Own pay components, current and past." },
];

const ROW_FIELDS =
  "{ component (base, shift differential, allowance …), amount, currency, per_unit (hour, year …), pay_basis, effective_from, effective_to, change_reason }";

const values = [
  hrValue("pay_status", "Load status", "string", "pay", 10,
    '"loading", "loaded", "failed", "no_access", or "no_job" (no active job here today, so no pay to show).',
    { alwaysAvailable: true, typicalCharCount: 10 }),
  hrValue("pay_as_of", "As of", "string", "pay", 20, "The date the page reads pay at."),
  hrValue("pay_current", "Pay now", "array", "pay", 30,
    `Every pay component in force on the as-of date, each its own rate — NEVER add them up: ${ROW_FIELDS}.`,
    { typicalCharCount: 500 }),
  hrValue("pay_scheduled", "Approved, starting later", "array", "pay", 35,
    `Approved pay changes that start after the as-of date: ${ROW_FIELDS}.`, { typicalCharCount: 300 }),
  hrValue("pay_history", "Pay history", "array", "pay", 40, `Past pay components, newest first: ${ROW_FIELDS}.`,
    { typicalCharCount: 1200, autoContext: false }),
  hrValue("pay_currency", "Currency", "string", "pay", 50, "The default currency for this employment."),
];

export const hrMyPayManifest: SurfaceManifest = {
  surfaceName: HR_MY_PAY_SURFACE_NAME,
  situation:
    "They are looking at their own pay: each pay component in force today and what changed when (page: {pay_status}). It is read-only.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "The person's own compensation: current components and history (/hr/me/pay).",
  label: "HR My pay",
  urlPattern: "/hr/me/pay",
  intro: `<surface_intro>
The person's own pay. Each row in pay_current is a separate rate with its own window; never sum them into one number.
Nothing can be changed here; a pay question goes to their manager or HR.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), values),
};

type Row = Record<string, unknown>;

function payRow(row: Row) {
  const pick = (key: string) => row[key] ?? null;
  return compact({
    component: pick("component_kind") ?? "base",
    amount: pick("amount"),
    currency: pick("currency"),
    per_unit: pick("per_unit"),
    pay_basis: pick("pay_basis"),
    effective_from: pick("effective_from"),
    effective_to: pick("effective_to"),
    change_reason: pick("change_reason"),
  });
}

export function buildHrMyPayScope(input: {
  status: HrLoadStatus | "no_job";
  data: { as_of: string; current: Row[]; history: Row[]; currency: string | null } | null;
}): SurfaceScopePayload {
  const d = input.data;
  return compact({
    pay_status: input.status,
    pay_as_of: d?.as_of ?? null,
    pay_current: d ? d.current.map(payRow) : null,
    pay_scheduled: d
      ? d.history.filter((r) => typeof r.effective_from === "string" && r.effective_from > d.as_of).map(payRow)
      : null,
    pay_history: d ? d.history.map(payRow) : null,
    pay_currency: d?.currency ?? null,
  }) as SurfaceScopePayload;
}
