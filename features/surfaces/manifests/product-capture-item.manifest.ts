/**
 * Surface manifest — Product capture item (`matrx-user/product-capture-item`).
 *
 * `/tools/product-capture/item/[id]`: one captured product — its photos, videos and
 * voice notes (add or delete), its product number (SKU) and notes (guarded
 * autosave), and Mark ready / Reprocess.
 *
 * Emitter: `ItemDetailView` (`features/product-capture/components/`).
 * Write targets, through the page's own writers:
 *   - `item_notes` replaces (or patches) the notes (the notes box's autosave).
 *   - `item_code` sets the product number (`setItemCode`, as typing it does).
 * Not writable: media (adding or deleting files), Mark ready / Reprocess (it hands
 * the item to the pipeline).
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const PRODUCT_CAPTURE_ITEM_SURFACE_NAME = "matrx-user/product-capture-item";

const groups: SurfaceValueGroup[] = [
  { key: "capture_item_record", label: "Item", sortOrder: 100, description: "The one captured product on screen." },
];

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
  typicalCharCount: valueType === "number" ? 3 : 40,
  group: "capture_item_record",
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("item_id", "Item ID", "string", 100, "UUID of the item (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("item_load_status", "Load status", "string", 110, '"loading", "loaded", "failed" (the read failed; the page offers a retry) or "not_found" (no access or no such item).', {
    alwaysAvailable: true,
    typicalCharCount: 10,
  }),
  v("item_code", "Product number", "string", 120, "The item's product number / SKU (empty until scanned or typed)."),
  v("item_status", "Status", "string", 130, '"capturing", "captured" (ready for processing) or "processed".', { typicalCharCount: 10 }),
  v(
    "item",
    "Item details",
    "object",
    140,
    '{ id, organization_id, code, code_source ("qr" | "manual"), status, folder_path, created_at }.',
    { typicalCharCount: 260 },
  ),
  v("item_notes", "Notes", "string", 150, "The item's notes as they stand in the notes box.", { typicalCharCount: 300, inlineUpTo: 4000 }),
  v("photo_count", "Photos", "number", 160, "Photos of the item."),
  v("video_count", "Videos", "number", 170, "Videos of the item."),
  v("voice_note_count", "Voice notes", "number", 180, "Voice notes on the item."),
  v("uploading_count", "Uploading", "number", 190, "Files still being added."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "item_notes",
    label: "Write the notes",
    description:
      "Replace (or patch) the item's notes. SAVED after the person approves, through the notes box's own autosave. Value is the full notes text. Refused: the item not loaded.",
    valueType: "string",
    approvalComparison: "text-replacement",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "item_notes",
    patchable: true,
    group: "capture_item_record",
    sortOrder: 300,
  },
  {
    name: "item_code",
    label: "Set the product number",
    description:
      "Set the item's product number / SKU, as typing it does. SAVED after the person approves. Value is the product number text. Refused: empty text, the item not loaded.",
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "item_code",
    group: "capture_item_record",
    sortOrder: 310,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: PRODUCT_CAPTURE_ITEM_SURFACE_NAME,
  situation:
    "They are looking at one captured product, {item_code|no product number yet} ({item_status|status unknown}; page: {item_load_status}), with {photo_count|no} photos and {voice_note_count|no} voice notes. You can rewrite its notes or set its product number.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Product capture item",
  description: "One captured product: media, product number, notes and its processing status.",
  urlPattern: "/tools/product-capture/item/[id]",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const productCaptureItemManifest = declared;

export function createProductCaptureItemScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
