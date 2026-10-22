/**
 * Surface manifest — Trash (`matrx-user/trash`), route `/trash`.
 *
 * Everything the person has deleted, anywhere, and when it goes away for good. Emitters: the page
 * (`app/(core)/trash/page.tsx`: counts by kind, the retention schedule) and `TrashList`
 * (`features/trash/components/TrashList.tsx`, given `surfaceName`: the listed rows and the restore
 * handler — the same per-row restore the Restore bulk action uses).
 *
 * Write target: `restore_trash_items` only. NOT writable, on purpose: permanent delete (destruction is
 * the retention engine's job, never an agent's — there is no such button either), "keep everything of
 * this kind" (a bulk retention choice), and Vault credentials (they restore through their own review).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const TRASH_SURFACE_NAME = "matrx-user/trash";

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  sortOrder: number,
  description: string,
  extra: Partial<SurfaceValue> = {},
): SurfaceValue => ({
  name,
  label,
  description,
  valueType,
  alwaysAvailable: false,
  autoContext: true,
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("trash_total", "In Trash", "number", 100, "How many items are in the person's Trash, all kinds."),
  v("trash_counts", "By kind", "array", 110, "Items in Trash per kind: { kind, kind_key, count }.", { typicalCharCount: 400 }),
  v("trash_kind_filter", "Kind shown", "string", 120, "The kind the list is narrowed to; null = recent across kinds.", { autoContext: false }),
  v(
    "trash_items",
    "Listed items",
    "array",
    130,
    "The rows listed (first 50): { key (the id restore_trash_items uses), kind, title, deleted_at }.",
    { typicalCharCount: 3000, inlineUpTo: 5000 },
  ),
  v("trash_listed_count", "Listed", "number", 140, "How many rows are loaded in the list.", { autoContext: false }),
  v("trash_has_more", "More to load", "boolean", 150, "True when the list has more rows than loaded.", { autoContext: false }),
  v(
    "pending_deletion",
    "Scheduled to be deleted for good",
    "array",
    160,
    "Kinds with items the retention policy will delete: { kind, rows, wipe_on, days_left }. Empty in the common case.",
    { typicalCharCount: 200 },
  ),
  v("archived_groups", "Tucked away", "number", 170, "How many kinds have items moved to cold storage (not deleted).", { autoContext: false }),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "restore_trash_items",
    label: "Restore items",
    description:
      'Put items back where they came from. SAVED after the person approves. Value is a JSON ARRAY of 1-50 keys from trash_items (e.g. ["notes:5f1c…"]). A restore can bring an archived parent back with it. Refused (nothing restored): a key not listed, a key twice, a Vault credential (those restore through their own review on the page). Nothing here deletes anything for good.',
    valueType: "array",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "trash_items",
    sortOrder: 300,
  },
];

const declared: SurfaceManifest = {
  surfaceName: TRASH_SURFACE_NAME,
  situation:
    "They are in their Trash with {trash_total|nothing} deleted items. You can restore items; nothing here deletes anything for good.",
  inheritsFrom: "matrx-default/account",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Trash",
  description: "Everything the person deleted, when it goes away for good, and restore.",
  urlPattern: "/trash",
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const trashManifest = declared;

export function createTrashScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
