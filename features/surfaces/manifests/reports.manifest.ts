/**
 * Surface manifest — Reports (`matrx-user/reports`).
 *
 * `/reports` (the module landing over the report registry) and each report's
 * own route, `/reports/agent-drift` being the first. Reports are read-only
 * analyses over platform data; the registry (`features/reports/registry.ts`) is
 * metadata-only, so adding a report is an entry plus a route.
 *
 * Declared 2026-08-17: the reports module had no surface declaration at all.
 *
 * Curated groups (band 0-899):
 *   report_location  Which report is open
 *   report_scope     What the open report is computed over
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
    key: "report_location",
    label: "Report",
    sortOrder: 100,
    description: "Which report the user has open, if any.",
  },
  {
    key: "report_scope",
    label: "Report scope",
    sortOrder: 200,
    description: "What the open report is computed over.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  { name: "reports_catalog", label: "Reports catalog", description: "Complete metadata of the reports rendered on the landing: slug, title, description, icon, routes, and live/coming-soon status. Absent on report detail routes.", valueType: "array", alwaysAvailable: false, typicalCharCount: 1500, group: "report_location", sortOrder: 130 },
  { name: "report_count", label: "Report count", description: "Number of reports rendered on the landing, including coming-soon cards. Absent on report detail routes.", valueType: "number", alwaysAvailable: false, typicalCharCount: 3, group: "report_location", sortOrder: 140 },
  {
    name: "report_slug",
    label: "Report slug",
    description:
      'Slug of the open report (e.g. "agent-drift"). Empty on the reports landing, where no single report is open.',
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 20,
    sortOrder: 100,
    group: "report_location",
  },
  {
    name: "report_title",
    label: "Report title",
    description:
      "Display title of the open report. Empty on the landing route.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 40,
    sortOrder: 110,
    group: "report_location",
  },
  {
    name: "available_report_slugs",
    label: "Available reports",
    description:
      "Slugs of every report in the registry that is live for this user, in landing order. Always populated. Lets an agent point at a report that exists rather than inventing one.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 120,
    sortOrder: 120,
    group: "report_location",
  },
  {
    name: "report_is_admin_scope",
    label: "Platform-wide scope",
    description:
      "True when the open report is showing its platform-wide admin variant rather than the user's own data. Always populated — false on the user-scoped view and on the landing.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    sortOrder: 200,
    group: "report_scope",
  },
  {
    name: "report_row_count",
    label: "Report row count",
    description:
      "How many rows the open report currently resolves to. Absent on the landing route or before the report has loaded.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 5,
    sortOrder: 210,
    group: "report_scope",
  },
  {
    name: "report_findings",
    label: "Report findings",
    description:
      "One entry per row of the open report, as the person sees it. Agent Drift: agent_id, agent_name, current_version, and the counts breaking, silent_breaking, warning, info, stale_pins and usages. Empty on the landing and while the report loads.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 1800,
    sortOrder: 220,
    group: "report_scope",
  },
  {
    name: "report_totals",
    label: "Report totals",
    description:
      "The report's roll-up across every row: for Agent Drift { agents_with_drift, breaking, silent_breaking, warning, info }. Absent on the landing.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 120,
    sortOrder: 230,
    group: "report_scope",
  },
  {
    name: "report_load_status",
    label: "Report load status",
    description: "How the report's read went: { status: idle | loading | succeeded | failed, error }. Absent on the landing.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 60,
    sortOrder: 240,
    group: "report_scope",
  },
  {
    name: "report_selected_agent_id",
    label: "Selected agent",
    description: "The agent whose usages the person has opened in the report's detail pane. Absent when none is open.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 36,
    sortOrder: 250,
    group: "report_scope",
  },
];

export const reportsManifest: SurfaceManifest = {
  surfaceName: "matrx-user/reports",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "Read-only analyses over platform data.",
  readiness: "partial",
  readinessNote:
    "The /reports landing emits the complete report catalog and live availability. Per-report drill-in values, the canonical menu after truthful source attribution is registered, outside-helper binding proof and independent certification remain.",
  label: "Reports",
  urlPattern: "/reports",
  intro: `<surface_intro>
You are in Reports: read-only analyses over platform data. The landing lists every report that exists; a report route shows one of them.
report_slug is empty on the landing — use available_report_slugs rather than guessing at a report that may not exist. report_is_admin_scope matters: when it is true the numbers are platform-wide, not the user's own, and must not be described as "your" data.
Reports do not change anything; propose actions elsewhere, not here.
</surface_intro>`,
  groups,
  briefValues: ["report_title","report_slug","report_row_count"],
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
};

/** Type-safe payload helper — required keys mirror `alwaysAvailable: true`. */
export function createReportsScope(values: {
  available_report_slugs: string[];
  report_is_admin_scope: boolean;
  reports_catalog?: import("@/features/reports/registry").ReportDefinition[];
  report_count?: number;
  content?: string;
  selection?: string;
  context?: Record<string, unknown>;
  report_slug?: string;
  report_title?: string;
  report_row_count?: number;
  report_findings?: Array<Record<string, unknown>>;
  report_totals?: Record<string, unknown>;
  report_load_status?: Record<string, unknown>;
  report_selected_agent_id?: string;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
