/**
 * Surface manifest — Product capture (`matrx-user/product-capture`).
 *
 * `/tools/product-capture` and `/tools/product-capture/instant` (same body,
 * `CaptureScreen`; instant adds the in-browser Process lane): the full-screen
 * camera that captures one product after another — photos, videos, voice notes,
 * notes and its product number (SKU).
 *
 * Emitter: `CaptureScreen` (`features/product-capture/components/`).
 * Write targets, through the capture session (`useProductCaptureSession`):
 *   - `item_notes` replaces (or patches) the notes of the item being captured;
 *     the session's guarded autosave saves them, as typing does.
 *   - `item_code` sets its product number, as the typed entry does.
 * Not writable: taking photos or video, Next item, Process (a paid run).
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

export const PRODUCT_CAPTURE_SURFACE_NAME = "matrx-user/product-capture";

const groups: SurfaceValueGroup[] = [
  { key: "capture_item", label: "Item being captured", sortOrder: 100, description: "The one product the camera is filling now." },
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
  typicalCharCount: valueType === "number" || valueType === "boolean" ? 4 : 40,
  group: "capture_item",
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("capture_lane", "Capture lane", "string", 100, '"standard", or "instant" when the page adds the in-browser Process step.', {
    alwaysAvailable: true,
    typicalCharCount: 10,
  }),
  v("item_id", "Item ID", "string", 110, "UUID of the item being captured (empty before the first shot of a new item).", {
    typicalCharCount: 36,
  }),
  v("item_label", "Item", "string", 120, 'What the screen calls the item: its product number, "Item N" or "New item".'),
  v("item_code", "Product number", "string", 130, "The item's product number / SKU (empty until scanned or typed)."),
  v(
    "item",
    "Item details",
    "object",
    140,
    '{ item_id, item_number (its label number in this session), code, code_source ("qr" | "manual"), status ("capturing" | "captured" | "processed"), folder_path, created_at }.',
    { typicalCharCount: 260 },
  ),
  v("photo_count", "Photos", "number", 150, "Photos on this item."),
  v("video_count", "Videos", "number", 160, "Videos on this item."),
  v("voice_note_count", "Voice notes", "number", 170, "Voice notes on this item."),
  v("uploading_count", "Uploading", "number", 180, "Files still uploading."),
  v("upload_error_count", "Failed uploads", "number", 190, "Files that failed to upload."),
  v("transcribing_count", "Transcribing", "number", 200, "Voice notes still being transcribed into the notes."),
  v("item_notes", "Item notes", "string", 210, "The notes on this item as typed or dictated (saved as they change).", {
    typicalCharCount: 200,
    inlineUpTo: 4000,
  }),
  v(
    "instant_status",
    "Process status",
    "string",
    220,
    'Instant lane only: "running", "done" (a result is saved), "failed" or "idle"; "off" on the standard lane.',
    { typicalCharCount: 8 },
  ),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "item_notes",
    label: "Write the item's notes",
    description:
      "Replace (or patch) the notes of the item being captured. SAVED after the person approves, by the same autosave typing uses. Value is the full notes text. Refused: no item yet (take a photo first).",
    valueType: "string",
    approvalComparison: "text-replacement",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "item_notes",
    patchable: true,
    group: "capture_item",
    sortOrder: 300,
  },
  {
    name: "item_code",
    label: "Set the product number",
    description:
      "Set the product number / SKU of the item being captured, as typing it does. SAVED after the person approves. Value is the product number text. Refused: empty text, or no item yet.",
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "item_code",
    group: "capture_item",
    sortOrder: 310,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: PRODUCT_CAPTURE_SURFACE_NAME,
  situation:
    "They are photographing products with the capture camera ({capture_lane} lane). On screen: {item_label|a new item} with {photo_count|no} photos and {voice_note_count|no} voice notes; {uploading_count|nothing} still uploading. You can write the item's notes or set its product number.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Product capture",
  description: "The product capture camera: one product after another, with photos, video, voice notes, notes and its product number.",
  urlPattern: "/tools/product-capture",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const productCaptureManifest = declared;

export function createProductCaptureScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
