/**
 * Surface manifest — Assists Manager (`matrx-user/assists`).
 *
 * `/assists`: the user's inbox of one-click AI assists (`platform.assists`,
 * `features/assists/**`) — what producers have proposed, what the user snoozed,
 * starred, or dismissed, and which sources they have silenced.
 *
 * Declared 2026-08-17: the assists inbox had no surface declaration at all,
 * even though assists are the platform's own AI-suggestion primitive.
 *
 * THE INTENTIONAL-ACTION LAW still governs: an assist never runs from this
 * surface's values — only the user's click on the verb-labeled button executes.
 *
 * Curated groups (band 0-899):
 *   inbox_view   Which slice of the inbox is on screen
 *   inbox_state  Counts and suppressions
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

const groups: SurfaceValueGroup[] = [
  {
    key: "inbox_view",
    label: "Inbox view",
    sortOrder: 100,
    description: "Which slice of the assists inbox the user is looking at.",
  },
  {
    key: "inbox_state",
    label: "Inbox state",
    sortOrder: 200,
    description: "How much is waiting, and what the user has silenced.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  { name: "assist_table_controls", label: "Live table controls", description: "Immediate table controls as displayed, including search before its read debounce. Compare assist_table_query for the requested read state.", valueType: "object", alwaysAvailable: true, typicalCharCount: 350, group: "inbox_view", sortOrder: 315 },
  { name: "assist_preferences_ready", label: "Preferences ready", description: "Whether synced quiet preferences have hydrated. Quiet controls are refused until true.", valueType: "boolean", alwaysAvailable: true, typicalCharCount: 5, group: "inbox_view", sortOrder: 375 },
  { name: "assist_overview", label: "Inbox overview", description: "Compact XML of current controls, current read status, and up to 25 successful matching rows. Pending or failed reads carry no stale row content.", valueType: "string", alwaysAvailable: true, typicalCharCount: 4000, inlineUpTo: 4500, group: "inbox_state", sortOrder: 410 },
  { name: "assist_include_snoozed", label: "Include snoozed", description: "Whether snoozed assists are included in the current view. Always present.", valueType: "boolean", alwaysAvailable: true, typicalCharCount: 5, group: "inbox_view", sortOrder: 130 },
  { name: "assist_starred_only", label: "Starred only", description: "Whether the view is limited to starred assists. Always present.", valueType: "boolean", alwaysAvailable: true, typicalCharCount: 5, group: "inbox_view", sortOrder: 140 },
  { name: "assist_unseen_only", label: "Unseen only", description: "Whether the view is limited to unseen assists. Always present.", valueType: "boolean", alwaysAvailable: true, typicalCharCount: 5, group: "inbox_view", sortOrder: 150 },
  { name: "assist_show_silenced", label: "Show silenced", description: "Whether the source-suppression panel is expanded. Always present.", valueType: "boolean", alwaysAvailable: true, typicalCharCount: 5, group: "inbox_view", sortOrder: 160 },
  {"name": "assist_load_state", "label": "Load state", "description": "Whether the current query is loading, ready, or failed. Old-query rows are not current results.", "valueType": "string", "alwaysAvailable": true, "typicalCharCount": 12, "group": "inbox_state", "sortOrder": 300},
  {"name": "assist_load_error", "label": "Load error", "description": "The current query failure message. Absent while loading or after success.", "valueType": "string", "alwaysAvailable": false, "typicalCharCount": 250, "group": "inbox_state", "sortOrder": 310},
  {"name": "assist_table_query", "label": "Table query", "description": "Current table search, sort, column filters, page and page size, including the pending query.", "valueType": "object", "alwaysAvailable": true, "typicalCharCount": 350, "group": "inbox_view", "sortOrder": 320},
  {"name": "assist_status_counts", "label": "Status counts", "description": "Counts by pending, accepted, dismissed, resolved, expired and superseded. Absent until the current read succeeds.", "valueType": "object", "alwaysAvailable": false, "typicalCharCount": 150, "group": "inbox_state", "sortOrder": 330},
  {"name": "loaded_assists", "label": "Loaded assist records", "description": "Full assist records for the loaded page, including body, actions, configuration, flags and provenance. Absent until the current query succeeds.", "valueType": "array", "alwaysAvailable": false, "typicalCharCount": 6000, "group": "inbox_state", "sortOrder": 340},
  {"name": "source_suppressions", "label": "Source suppressions", "description": "Loaded source suppression records, including expiry and source keys. Absent until the current read succeeds.", "valueType": "array", "alwaysAvailable": false, "typicalCharCount": 1000, "group": "inbox_state", "sortOrder": 350},
  {"name": "assist_quiet", "label": "Assists quiet", "description": "Whether the person has quieted assists globally. Always present.", "valueType": "boolean", "alwaysAvailable": true, "typicalCharCount": 5, "group": "inbox_view", "sortOrder": 360},
  {"name": "assist_quiet_until", "label": "Quiet until", "description": "Quiet expiry timestamp. Absent when there is no timed expiry.", "valueType": "string", "alwaysAvailable": false, "typicalCharCount": 30, "group": "inbox_view", "sortOrder": 370},
  {"name": "assist_bulk_busy", "label": "Bulk action busy", "description": "Whether a dismiss or snooze operation is running. Always present.", "valueType": "boolean", "alwaysAvailable": true, "typicalCharCount": 5, "group": "inbox_state", "sortOrder": 380},
  {"name": "assist_dismiss_dialog_open", "label": "Dismiss dialog open", "description": "Whether the confirmation to dismiss the shown pending assists is open. Always present.", "valueType": "boolean", "alwaysAvailable": true, "typicalCharCount": 5, "group": "inbox_view", "sortOrder": 390},
  {"name": "assist_view", "label": "Inbox view settings", "description": "Composite of tab, urgency, four view flags, table query and quiet settings. Always present.", "valueType": "object", "alwaysAvailable": true, "typicalCharCount": 600, "group": "inbox_view", "sortOrder": 400},
  {
    name: "assist_status_tab",
    label: "Status tab",
    description:
      'Which status tab is open: pending (Open), accepted, dismissed, resolved (Went away), or all (Everything). Always populated.',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 12,
    sortOrder: 100,
    group: "inbox_view",
  },
  {
    name: "assist_urgency_filter",
    label: "Urgency filter",
    description:
      "Urgency the list is filtered to. Empty when the user is looking at every urgency.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 10,
    sortOrder: 110,
    group: "inbox_view",
  },
  {
    name: "assist_view_flags",
    label: "View flags",
    description:
      "The inbox toggles as one object: { include_snoozed, starred_only, unseen_only, show_silenced }. Always populated — all false by default.",
    valueType: "object",
    alwaysAvailable: true,
    typicalCharCount: 120,
    sortOrder: 120,
    group: "inbox_view",
  },
  {
    name: "assist_total_count",
    label: "Total matching assists",
    description:
      "How many assists match the current tab and filters, server-side — not just the visible page. Absent until the current query succeeds; zero for a successfully loaded empty inbox.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 4,
    sortOrder: 200,
    group: "inbox_state",
  },
  {
    name: "visible_assists_summary",
    label: "Visible assists",
    description:
      "One entry per assist on the current page with { id, title, urgency, status, source }. Absent until the current query succeeds; empty array when a successful query matches nothing. Bindable-only; an agent that needs one opens it by id.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1800,
    autoContext: false,
    sortOrder: 210,
    group: "inbox_state",
  },
  {
    name: "silenced_sources",
    label: "Silenced sources",
    description:
      "Producer sources the user has suppressed. Absent until the current query succeeds; empty array when nothing is silenced. An agent must not propose reviving a source the user deliberately silenced without saying so.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 200,
    sortOrder: 220,
    group: "inbox_state",
  },
];

export const assistsManifest: SurfaceManifest = {
  situation:
    "They are in their Assists inbox, the one-click help the platform offers them, on the {assist_status_tab} tab: {assist_total_count|an unknown number of} assists match, urgency {assist_urgency_filter|any}. The rows shown are in your context. They can change the view, snooze or dismiss assists and quiet them; an assist only runs when they press it.",
  surfaceName: "matrx-user/assists",
  inheritsFrom: "matrx-default/platform",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "The user inbox of one-click AI assists.",
  label: "Assists",
  urlPattern: "/assists",
  intro: `<surface_intro>
You are on the Assists inbox: the user's queue of one-click AI assists that producers across the platform have proposed for them. Each assist is an offer, not an action.
assist_status_tab plus assist_view_flags describe which slice they are looking at; assist_total_count is the true server-side match count, not the page size.
Use set_assist_view for inbox filters, resume_assists for the existing quiet preference, and update_assists for approved flag/restore/dismiss/snooze changes. Use these page targets rather than generic tools; they never execute an assist.
Nothing here executes on your say-so — an assist runs only when the user presses its own verb-labeled button. Treat silenced_sources as a decision the user already made.
</surface_intro>`,
  guide: "features/surfaces/guides/assists.md",
  groups,
  writeTargets: [
    { name: "set_assist_view", label: "Assist view", description: "Changes existing inbox controls without executing an assist. JSON object with optional status_tab (pending|accepted|dismissed|resolved|all), urgency (normal|elevated|urgent or null), include_snoozed/starred_only/unseen_only/show_silenced (boolean), search/source_key/surface_name (string; null clears source_key/surface_name), source_kind (deterministic|agent|sweep|stream or null), page/page_size (positive integer), sort ({id: created_at|decided_at|priority|confidence|status|sourceKey|first_seen_at|occurrences, direction: asc|desc} or null). Only supplied fields change. Filter changes reset to page one unless page is supplied. Unknown fields refused.", valueType: "object", valueKind: "json", updatesValue: "assist_view", mode: "ui", applyPolicy: "auto", group: "inbox_view", sortOrder: 100 },
    { name: "resume_assists", label: "Resume assists", description: "Resumes assists locally through the existing quiet preference control and queues its canonical background synchronization. The receipt does not confirm durable saving. Value must be boolean true; refused until preferences hydrate. Never accepts or executes any assist.", valueType: "boolean", updatesValue: "assist_quiet", mode: "ui", applyPolicy: "ask", group: "inbox_view", sortOrder: 110 },
    { name: "update_assists", label: "Update assists", description: "Saves triage changes through existing row controls after approval; never executes an assist. JSON ARRAY of {id: loaded assist UUID, starred?: boolean, status?: pending|dismissed, snooze?: 1d|7d|30d}. Exactly one change per entry. pending restores the assist; dismissed removes it from active suggestions; snooze is allowed only for pending rows. Send status or snooze, not both. Unknown/unloaded or repeated ids refused before any change. No create/delete targets: this inbox has no record creation/deletion controls; dismiss preserves the record.", valueType: "array", valueKind: "json", updatesValue: "loaded_assists", mode: "entity", applyPolicy: "ask", group: "inbox_state", sortOrder: 120 },
  ],
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
};

/** One entry as emitted in `visible_assists_summary`. */
export interface AssistSummaryEntry {
  id: string;
  title: string;
  urgency: string | null;
  status: string;
  source: string | null;
}

/** Type-safe payload helper — required keys mirror `alwaysAvailable: true`. */
export function createAssistsScope(values: {
  assist_include_snoozed: boolean;
  assist_starred_only: boolean;
  assist_unseen_only: boolean;
  assist_show_silenced: boolean;
  assist_load_state: "loading" | "ready" | "failed";
  assist_load_error?: string;
  assist_table_query: object;
  assist_table_controls: object;
  assist_preferences_ready: boolean;
  assist_overview: string;
  assist_status_counts?: object;
  loaded_assists?: unknown[];
  source_suppressions?: unknown[];
  assist_quiet: boolean;
  assist_quiet_until?: string;
  assist_bulk_busy: boolean;
  assist_dismiss_dialog_open: boolean;
  assist_view: object;
  content?: string;
  assist_status_tab: string;
  assist_view_flags: {
    include_snoozed: boolean;
    starred_only: boolean;
    unseen_only: boolean;
    show_silenced: boolean;
  };
  assist_total_count?: number;
  visible_assists_summary?: AssistSummaryEntry[];
  silenced_sources?: string[];
  selection?: string;
  context?: Record<string, unknown>;
  assist_urgency_filter?: string;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
