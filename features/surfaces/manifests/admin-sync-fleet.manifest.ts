import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
export const ADMIN_SYNC_FLEET_SURFACE_NAME = "matrx-admin/sync-fleet";
const groups: SurfaceValueGroup[] = [
  { key: "fleet", label: "Sync fleet", sortOrder: 100 },
  { key: "health", label: "Fleet health", sortOrder: 200 },
  { key: "view", label: "Table views", sortOrder: 300 },
];
const values: SurfaceValue[] = [
  {
    name: "page_overview",
    label: "Fleet overview",
    description:
      "Compact XML overview of loaded fleet health, segment searches and the first 12 path-free mapping identities; total/shown attributes identify truncation.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 4000,
    inlineUpTo: 5000,
    autoContext: true,
    group: "fleet",
    sortOrder: 0,
  },
  {
    name: "over_quota_search",
    label: "Over quota search",
    description:
      "Current controlled search text for the over quota health segment. Empty text means no segment search.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 100,
    autoContext: false,
    group: "view",
    sortOrder: 150,
  },
  {
    name: "stalled_search",
    label: "Stopped search",
    description:
      "Current controlled search text for the stopped health segment. Empty text means no segment search.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 100,
    autoContext: false,
    group: "view",
    sortOrder: 150,
  },
  {
    name: "degraded_search",
    label: "Degraded search",
    description:
      "Current controlled search text for the degraded health segment. Empty text means no segment search.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 100,
    autoContext: false,
    group: "view",
    sortOrder: 150,
  },
  {
    name: "behind_search",
    label: "Devices behind search",
    description:
      "Current controlled search text for the devices behind health segment. Empty text means no segment search.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 100,
    autoContext: false,
    group: "view",
    sortOrder: 150,
  },

  {
    name: "sync_mappings",
    label: "Sync mappings",
    description:
      "Path-free mapping rows loaded by the server, capped at 1000. An empty array means a successful empty read; this client never mounts during a failed read.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 8000,
    autoContext: false,
    group: "fleet",
    sortOrder: 0,
  },
  {
    name: "sync_mapping_count",
    label: "Sync mapping count",
    description:
      "Count of loaded path-free mapping rows, before segment searches.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 4,
    autoContext: true,
    group: "fleet",
    sortOrder: 10,
  },
  {
    name: "fleet_health",
    label: "Fleet health",
    description:
      "Current segment counts, account quota count and observation time; segments overlap.",
    valueType: "object",
    alwaysAvailable: true,
    typicalCharCount: 1000,
    autoContext: false,
    group: "health",
    sortOrder: 20,
  },
  {
    name: "observed_at",
    label: "Observed at",
    description:
      "Browser clock in epoch milliseconds used to classify silent devices and display relative timestamps.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 13,
    autoContext: false,
    group: "health",
    sortOrder: 30,
  },
  {
    name: "accounts_over_quota",
    label: "Accounts over quota",
    description: "Unique accounts among the loaded over-quota mappings.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 4,
    autoContext: true,
    group: "health",
    sortOrder: 40,
  },
  {
    name: "over_quota_mappings",
    label: "Over quota mappings",
    description:
      "Loaded mappings in this health segment before its table search/filter; segments can overlap.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 4000,
    autoContext: false,
    group: "health",
    sortOrder: 50,
  },
  {
    name: "over_quota_count",
    label: "Over quota count",
    description:
      "Count of loaded mappings in this health segment before its table search/filter.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 4,
    autoContext: true,
    group: "health",
    sortOrder: 60,
  },
  {
    name: "stalled_mappings",
    label: "Stopped mappings",
    description:
      "Loaded mappings in this health segment before its table search/filter; segments can overlap.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 4000,
    autoContext: false,
    group: "health",
    sortOrder: 70,
  },
  {
    name: "stalled_count",
    label: "Stopped count",
    description:
      "Count of loaded mappings in this health segment before its table search/filter.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 4,
    autoContext: true,
    group: "health",
    sortOrder: 80,
  },
  {
    name: "degraded_mappings",
    label: "Degraded mappings",
    description:
      "Loaded mappings in this health segment before its table search/filter; segments can overlap.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 4000,
    autoContext: false,
    group: "health",
    sortOrder: 90,
  },
  {
    name: "degraded_count",
    label: "Degraded count",
    description:
      "Count of loaded mappings in this health segment before its table search/filter.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 4,
    autoContext: true,
    group: "health",
    sortOrder: 100,
  },
  {
    name: "behind_mappings",
    label: "Devices behind mappings",
    description:
      "Loaded mappings in this health segment before its table search/filter; segments can overlap.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 4000,
    autoContext: false,
    group: "health",
    sortOrder: 110,
  },
  {
    name: "behind_count",
    label: "Devices behind count",
    description:
      "Count of loaded mappings in this health segment before its table search/filter.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 4,
    autoContext: true,
    group: "health",
    sortOrder: 120,
  },
  {
    name: "fleet_table_views",
    label: "Fleet table views",
    description:
      "Per-segment canonical table query and processed rows, including searches, filters, sort and pagination; populated after each table reports its view.",
    valueType: "object",
    alwaysAvailable: true,
    typicalCharCount: 8000,
    autoContext: false,
    group: "view",
    sortOrder: 130,
  },
  {
    name: "load_state",
    label: "Load state",
    description:
      "Ready: the server awaits the database read before mounting this client. Failures reach the route error boundary, not an empty array.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 8,
    autoContext: true,
    group: "view",
    sortOrder: 140,
  },
];
const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "over_quota_search",
    label: "Over quota search",
    description:
      "Changes the existing over quota table search only. Plain string; empty clears it. Never changes a mapping, quota, device or permission.",
    valueType: "string",
    updatesValue: "over_quota_search",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 150,
  },
  {
    name: "stalled_search",
    label: "Stopped search",
    description:
      "Changes the existing stopped table search only. Plain string; empty clears it. Never changes a mapping, quota, device or permission.",
    valueType: "string",
    updatesValue: "stalled_search",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 150,
  },
  {
    name: "degraded_search",
    label: "Degraded search",
    description:
      "Changes the existing degraded table search only. Plain string; empty clears it. Never changes a mapping, quota, device or permission.",
    valueType: "string",
    updatesValue: "degraded_search",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 150,
  },
  {
    name: "behind_search",
    label: "Devices behind search",
    description:
      "Changes the existing devices behind table search only. Plain string; empty clears it. Never changes a mapping, quota, device or permission.",
    valueType: "string",
    updatesValue: "behind_search",
    mode: "ui",
    applyPolicy: "auto",
    group: "view",
    sortOrder: 150,
  },
];
export const adminSyncFleetManifest: SurfaceManifest = {
  situation:
    "They are on the Sync fleet admin page, watching folder-sync health across the platform: {sync_mapping_count} synced folders; {over_quota_count} over quota ({accounts_over_quota} accounts), {stalled_count} stopped, {degraded_count} degraded, {behind_count} with silent devices. No folder paths are shown. They can search each health table.",
  surfaceName: ADMIN_SYNC_FLEET_SURFACE_NAME,
  inheritsFrom: "matrx-default/apps",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Sync fleet",
  description:
    "Path-free organization-authorized folder sync health. Mapping rows and overlapping quota, stopped, degraded and silent-device segments describe the loaded fleet, with each table view exposed separately. Local folders and private storage ledgers are not loaded here.",
  urlPattern: "/administration/applications/sync",
  guide: "features/surfaces/guides/sync-fleet.md",
  intro: `<surface_intro>Start with page_overview: loaded fleet health and current searches. This page has no create, edit or delete mapping action; mapping rows and derived health evidence are read-only. Use the four segment search targets for view changes only. Never use generic context or data tools to bypass this page's read-only records. Path-free organization-authorized folder sync health. Mapping rows and overlapping quota, stopped, degraded and silent-device segments describe the loaded fleet, with each table view exposed separately. Local folders and private storage ledgers are not loaded here.</surface_intro>`,
  groups,
  writeTargets,
  values: mergeBaselineValues([], values),
};
export function createAdminSyncFleetScope(values: {
  page_overview: string;
  over_quota_search: string;
  stalled_search: string;
  degraded_search: string;
  behind_search: string;
  sync_mappings: unknown[];
  sync_mapping_count: number;
  fleet_health: object;
  observed_at: number;
  accounts_over_quota: number;
  over_quota_mappings: unknown[];
  over_quota_count: number;
  stalled_mappings: unknown[];
  stalled_count: number;
  degraded_mappings: unknown[];
  degraded_count: number;
  behind_mappings: unknown[];
  behind_count: number;
  fleet_table_views: object;
  load_state: "ready";
  content?: string;
  context?: Record<string, unknown>;
}): SurfaceScopePayload {
  return values;
}
