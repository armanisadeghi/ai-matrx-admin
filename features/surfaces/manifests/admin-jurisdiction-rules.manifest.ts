/**
 * Surface manifests — the HR jurisdiction rule library's two record pages. Parent: Human
 * Resources (admin is a surface, not a domain). The admin seat has no HR employer shell, so the
 * module's employer values stay empty here; they already say so.
 *
 * - `matrx-admin/jurisdiction-rule` — `/administration/hr/jurisdiction-rules/[ruleId]`: one rule
 *   (citation, class, parameters, applicability, fixtures, status history, lineage). Emitter:
 *   `JurisdictionRuleDetailClient`. Write target `propose_status_change` only OPENS the page's own
 *   confirm dialog with the status and sign-off note filled in — a promoted rule changes what HR
 *   computes, money included, so the person presses.
 * - `matrx-admin/jurisdiction-verification` — `/administration/hr/jurisdiction-rules/verification`:
 *   the JUR-SEED task board and the rules past their verification date. Emitter:
 *   `JurisdictionVerificationClient`. Read-only (verifying happens on each rule's page).
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_JURISDICTION_RULE_SURFACE_NAME = "matrx-admin/jurisdiction-rule";
export const ADMIN_JURISDICTION_VERIFICATION_SURFACE_NAME = "matrx-admin/jurisdiction-verification";

const v = (name: string, label: string, valueType: SurfaceValue["valueType"], group: string, sortOrder: number, description: string, extra: Partial<SurfaceValue> = {}): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group,
  sortOrder,
  ...extra,
});

const LOAD_STATUS = '"loading", "failed" or "refused" (the page shows why), or "loaded".';

// ── One rule ───────────────────────────────────────────────────────────────

const ruleGroup: SurfaceValueGroup = { key: "jurisdiction_rule", label: "Rule", sortOrder: 100, description: "The rule and where it stands." };
const detailGroup: SurfaceValueGroup = { key: "jurisdiction_rule_detail", label: "Rule detail", sortOrder: 200, description: "What it says and how it is proven." };

const ruleValues: SurfaceValue[] = [
  v("rule_id", "Rule ID", "string", ruleGroup.key, 100, "UUID of the rule (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("rule_load_status", "Load status", "string", ruleGroup.key, 110, `${LOAD_STATUS} "not_found" when the library has no rule with this id.`, {
    alwaysAvailable: true,
    typicalCharCount: 8,
  }),
  v(
    "rule",
    "Rule",
    "object",
    ruleGroup.key,
    120,
    "{ rule_class, rule_class_label, produces_money, jurisdiction_key, jurisdiction_name, jurisdiction_level, status, version, effective_from, effective_to, source_scope, organization_id, basis, verification_due, unverified_keys, jur_seed_task, supersedes_id, correction_of_id }.",
    { typicalCharCount: 700 },
  ),
  v("allowed_status_changes", "Status changes allowed", "array", ruleGroup.key, 130, 'The statuses it can move to from its current one ("draft", "advisory", "active", "superseded").'),
  v("citation", "Citation", "object", detailGroup.key, 200, "{ authority, title, url, retrieved_at, verified_by, verified_at, confidence }."),
  v("parameters", "Parameters", "object", detailGroup.key, 210, "The rule's parameters as stored (what HR computes with).", { typicalCharCount: 800 }),
  v("applicability", "Applicability", "object", detailGroup.key, 220, "Who and what the rule applies to, as stored.", { typicalCharCount: 500 }),
  v("fixtures", "Fixtures", "array", detailGroup.key, 230, "The fixtures that prove it: [{ code, title, expected_status, pinned }]."),
  v("status_history", "Status history", "array", detailGroup.key, 240, "Every status change: [{ at, by, from, to, reason }].", { typicalCharCount: 600 }),
];

const ruleWriteTargets: SurfaceWriteTarget[] = [
  {
    name: "propose_status_change",
    label: "Open a status change",
    description:
      'Open the page\'s own confirm dialog to move this rule to a new status, with the sign-off note filled in. NOTHING changes until the person presses its confirm button. Value is a JSON object { "status": one of allowed_status_changes (required), "sign_off_note": string (required to promote to "active"; the person can edit it) }. Refused: a status not in allowed_status_changes, or promoting with no note.',
    valueType: "object",
    mode: "ui",
    applyPolicy: "auto",
    group: ruleGroup.key,
    sortOrder: 300,
  },
];

const ruleDeclared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: ADMIN_JURISDICTION_RULE_SURFACE_NAME,
  situation:
    "As an admin they are looking at one jurisdiction rule in the HR rule library ({rule_load_status|loading}). You can open a status change, with a sign-off note, for them to confirm.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Jurisdiction rule",
  description: "One HR jurisdiction rule: citation, parameters, applicability, fixtures and status history.",
  urlPattern: "/administration/hr/jurisdiction-rules/[ruleId]",
  groups: [ruleGroup, detailGroup],
  values: ruleValues,
  writeTargets: ruleWriteTargets,
  skipBaselineValues: true,
};

export const adminJurisdictionRuleManifest = ruleDeclared;

// ── The verification board ─────────────────────────────────────────────────

const boardGroup: SurfaceValueGroup = { key: "jurisdiction_verification", label: "Verification", sortOrder: 100, description: "Seed tasks and overdue rules." };

const boardValues: SurfaceValue[] = [
  v("board_load_status", "Load status", "string", boardGroup.key, 100, LOAD_STATUS, { alwaysAvailable: true, typicalCharCount: 8 }),
  v(
    "seed_tasks",
    "JUR-SEED tasks",
    "array",
    boardGroup.key,
    110,
    "Each seed task: { jur_seed_task, rows_total, rows_active, rows_advisory, rows_draft, rows_with_unverified_keys, rows_overdue, next_verification_due, task_complete }.",
    { typicalCharCount: 1200 },
  ),
  v(
    "overdue_rules",
    "Past their verification date",
    "array",
    boardGroup.key,
    120,
    "Each overdue rule: { rule_id, rule_version, rule_class_label, jurisdiction_key, jurisdiction_name, status, jur_seed_task, verification_due, days_overdue }.",
    { typicalCharCount: 2000 },
  ),
];

const boardDeclared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: ADMIN_JURISDICTION_VERIFICATION_SURFACE_NAME,
  situation:
    "As an admin they are on the jurisdiction rule verification board ({board_load_status|loading}): the JUR-SEED tasks and the rules past their verification date. Rules are verified on their own pages.",
  inheritsFrom: "matrx-default/human-resources",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Jurisdiction rule verification",
  description: "The JUR-SEED task board and the jurisdiction rules past their verification date.",
  urlPattern: "/administration/hr/jurisdiction-rules/verification",
  groups: [boardGroup],
  values: boardValues,
  skipBaselineValues: true,
};

export const adminJurisdictionVerificationManifest = boardDeclared;
