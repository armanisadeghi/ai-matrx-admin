/**
 * Surface manifest — one spend alarm (`matrx-admin/spend-alarm`).
 *
 * `/administration/billing/alarms/[id]`: one record of the spend alarms (what was stopped or
 * spent, the rule that tripped, what it names, every occurrence) and the actions it offers.
 * Parent: Account (billing lives under account; admin is a surface, not a domain).
 *
 * Emitter: `SpendAlarmRecordPage` (`features/admin/spend-alarms/`). The alarm value is the same
 * `alarmAgentData` the page's Copy for AI hands an agent. Write target `propose_action` only
 * OPENS the page's own confirm dialog for an action it offers (approve and run-once spend money,
 * pause and reject stop work, resolve closes the alarm); the person presses. Mute, unmute and
 * reopen stay the person's buttons.
 */

import type { SurfaceManifest, SurfaceValue, SurfaceValueGroup, SurfaceWriteTarget } from "@ai-matrx/chat/surfaces/types";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_SPEND_ALARM_SURFACE_NAME = "matrx-admin/spend-alarm";

const group: SurfaceValueGroup = { key: "spend_alarm", label: "Spend alarm", sortOrder: 100, description: "The alarm and what it names." };

const v = (name: string, label: string, valueType: SurfaceValue["valueType"], sortOrder: number, description: string, extra: Partial<SurfaceValue> = {}): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group: group.key,
  sortOrder,
  ...extra,
});

const values: SurfaceValue[] = [
  v("alarm_id", "Alarm ID", "string", 100, "UUID of the alarm (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v(
    "alarm_load_status",
    "Load status",
    "string",
    110,
    '"loading", "failed" (the page shows why) or "loaded".',
    { alwaysAvailable: true, typicalCharCount: 8 },
  ),
  v("alarm_status_label", "Status", "string", 120, 'Its status as shown: the level (e.g. Critical), "Fixed, watching", "Muted" or "Resolved".'),
  v("alarm_sentence", "What happened", "string", 130, "The alarm's sentence, with names.", { typicalCharCount: 200 }),
  v(
    "alarm",
    "Alarm",
    "object",
    140,
    "The whole record as Copy for AI gives it: { alarm: { id, kind, level, status, title, what_happened, rule, fix, change_the_limit, subject, count, first/last_seen_at, cost_usd, cost_avoided_usd, watching, muted, resolved }, blocked: [{ what, id, name }], occurrences }.",
    { typicalCharCount: 3000 },
  ),
  v("automation", "Automation", "object", 150, "The scheduled automation it names, when any: { title, enabled }."),
  v("approval_status", "Approval status", "string", 160, "The status of the spend approval it names, when any."),
  v(
    "actions_offered",
    "Actions offered",
    "array",
    170,
    'The actions the page offers on this alarm, from: "approve", "reject", "pause", "resume", "run_now", "open_agent", "open_mandate", "open_source".',
    { typicalCharCount: 80 },
  ),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "propose_action",
    label: "Open an action",
    description:
      'Open the page\'s own confirm dialog for one action on this alarm. NOTHING happens until the person presses its confirm button. Value is one of "approve", "reject", "pause", "run_now" (each only when listed in actions_offered) or "resolve" (only while the alarm is not resolved). Refused otherwise.',
    valueType: "string",
    mode: "ui",
    applyPolicy: "auto",
    group: group.key,
    sortOrder: 300,
  },
];

const declared: Omit<SurfaceManifest, "readiness"> = {
  surfaceName: ADMIN_SPEND_ALARM_SURFACE_NAME,
  situation:
    "As an admin they are looking at one spend alarm ({alarm_status_label|loading}): {alarm_sentence|not loaded yet}. You can open one of its actions for them to confirm.",
  inheritsFrom: "matrx-default/account",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Spend alarm",
  description: "One spend alarm: what was stopped or spent, the rule, what it names and its occurrences.",
  urlPattern: "/administration/billing/alarms/[id]",
  groups: [group],
  values,
  writeTargets,
  skipBaselineValues: true,
};

/** No typed `readiness` (D2: earned, never typed); the installed type still requires the key. */
export const adminSpendAlarmManifest = declared as SurfaceManifest;
