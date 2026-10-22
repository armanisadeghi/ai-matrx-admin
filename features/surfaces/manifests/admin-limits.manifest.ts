import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
export const ADMIN_LIMITS_SURFACE_NAME = "matrx-admin/limits";
const groups: SurfaceValueGroup[] = [
  { key: "addons", label: "Account add-ons", sortOrder: 100 },
];
const values: SurfaceValue[] = [
  {
    name: "addons_loaded",
    label: "Loaded account add-ons",
    description:
      "Complete decorated account-add-on rows currently loaded, including their resolved plan allowance and raise calculation.",
    valueType: "array",
    alwaysAvailable: false,
    autoContext: false,
    group: "addons",
    sortOrder: 100,
    typicalCharCount: 120,
  },
  {
    name: "processed_addons",
    label: "Filtered account add-ons",
    description: "Decorated rows matching the current canonical table view.",
    valueType: "array",
    alwaysAvailable: false,
    autoContext: false,
    group: "addons",
    sortOrder: 115,
    typicalCharCount: 120,
  },
  {
    name: "processed_addons_count",
    label: "Filtered add-ons",
    description: "Count of decorated rows matching the current canonical table view. Only on the Account add-ons tab.",
    valueType: "number",
    alwaysAvailable: false,
    group: "addons",
    sortOrder: 118,
    typicalCharCount: 120,
  },
  {
    name: "addons_loaded_count",
    label: "Loaded add-ons",
    description: "Count of complete loaded add-on rows. Only on the Account add-ons tab.",
    valueType: "number",
    alwaysAvailable: false,
    group: "addons",
    sortOrder: 110,
    typicalCharCount: 120,
  },
  {
    name: "addons_table_query",
    label: "Add-ons table query",
    description:
      "Live canonical add-ons table search, column filters, sort, and page. Only on the Account add-ons tab.",
    valueType: "object",
    alwaysAvailable: false,
    group: "addons",
    sortOrder: 120,
    typicalCharCount: 120,
  },
];
export const adminLimitsManifest: SurfaceManifest = {
  situation:
    "They are on the Limits and Knobs admin page, looking at account add-ons across the platform: {addons_loaded_count} loaded, {processed_addons_count} matching the table's current view. Each row's plan allowance and how much the add-on raises it are in your context.",
  surfaceName: ADMIN_LIMITS_SURFACE_NAME,
  inheritsFrom: "matrx-default/platform",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "",
  label: "Limits and Knobs",
  urlPattern: "/administration/users/limits",
  groups,
  values: mergeBaselineValues(pickBaseline("context"), values),
};
export function createAdminLimitsScope(values: {
  addons_loaded: unknown[];
  addons_loaded_count: number;
  processed_addons: unknown[];
  processed_addons_count: number;
  addons_table_query: object;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
