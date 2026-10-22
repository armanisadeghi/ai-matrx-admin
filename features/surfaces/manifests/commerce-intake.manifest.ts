/**
 * Surface manifest — Commerce intake capture (`matrx-user/commerce-intake`).
 *
 * `/commerce/intake` and `/commerce/intake/instant` (same body,
 * `IntakeCaptureScreen`; instant adds the in-browser Process lane): the full-screen
 * camera that captures one item after another into an intake batch — photos,
 * videos, voice notes, typed notes, QR labels and serials.
 *
 * Emitter: `IntakeCaptureScreen` (`features/commerce-intake/components/`).
 * Write targets, through the capture session (`useIntakeSession`):
 *   - `item_notes` replaces (or patches) the notes of the item being captured;
 *     the session's guarded autosave saves them, as typing does.
 *   - `add_identifier` types a serial or asset tag onto that item.
 * Not writable: taking photos or video, finishing an item, Process (a paid run).
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

export const COMMERCE_INTAKE_SURFACE_NAME = "matrx-user/commerce-intake";

const groups: SurfaceValueGroup[] = [
  { key: "intake_session", label: "Capture session", sortOrder: 100, description: "The batch and how capture is set up." },
  { key: "intake_item", label: "Item being captured", sortOrder: 200, description: "The one item the camera is filling now." },
];

const v = (
  name: string,
  label: string,
  valueType: SurfaceValue["valueType"],
  group: string,
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
  group,
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("capture_lane", "Capture lane", "string", "intake_session", 100, '"standard", or "instant" when the page adds the in-browser Process step.', {
    alwaysAvailable: true,
    typicalCharCount: 10,
  }),
  v("capture_mode", "Capture mode", "string", "intake_session", 110, '"serialized" (each item gets its own QR label) or "untracked" (one stream of photos for the batch).'),
  v("batch", "Batch", "object", "intake_session", 120, "The intake batch being filled: { id, label, status, capture_mode, stream_kind }.", {
    typicalCharCount: 160,
  }),
  v("asset_id", "Item ID", "string", "intake_item", 200, "UUID of the intake asset being captured (empty before the first shot of a new item).", {
    typicalCharCount: 36,
  }),
  v("item_label", "Item", "string", "intake_item", 210, 'What the screen calls the item: its QR code, "Item N", "New item" or "Untracked stream".'),
  v(
    "item",
    "Item details",
    "object",
    "intake_item",
    220,
    "{ asset_id, item_number (its label number in this session), tracking_mode, quantity, pipeline_state, qr_code, attributes }.",
    { typicalCharCount: 300 },
  ),
  v("photo_count", "Photos", "number", "intake_item", 230, "Photos on this item (separator shots not counted)."),
  v("video_count", "Videos", "number", "intake_item", 240, "Videos on this item."),
  v("voice_note_count", "Voice notes", "number", "intake_item", 250, "Voice notes on this item."),
  v("uploading_count", "Uploading", "number", "intake_item", 260, "Files still uploading."),
  v("upload_error_count", "Failed uploads", "number", "intake_item", 270, "Files that failed to upload."),
  v("item_notes", "Item notes", "string", "intake_item", 280, "The notes on this item as typed or dictated (saved as they change).", {
    typicalCharCount: 200,
    inlineUpTo: 4000,
  }),
  v(
    "instant_status",
    "Process status",
    "string",
    "intake_item",
    290,
    'Instant lane only: "running" (the analysis is working), "done" (a result is saved), "failed", or "idle"; "off" on the standard lane.',
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
    group: "intake_item",
    sortOrder: 300,
  },
  {
    name: "add_identifier",
    label: "Add a serial or asset tag",
    description:
      "Type a serial number or asset tag onto the item being captured, as the keyboard entry does. SAVED after the person approves. Value is the identifier text. Refused: empty text, or no item yet.",
    valueType: "string",
    mode: "entity",
    applyPolicy: "ask",
    group: "intake_item",
    sortOrder: 310,
  },
];

const declared: SurfaceManifest = {
  readiness: "partial",
  readinessNote: "Declared and emitted (W2); not yet probed live on its route.",
  surfaceName: COMMERCE_INTAKE_SURFACE_NAME,
  situation:
    "They are capturing items with the intake camera ({capture_lane} lane, {capture_mode|serialized} mode). On screen: {item_label|a new item} with {photo_count|no} photos and {voice_note_count|no} voice notes; {uploading_count|nothing} still uploading. You can write the item's notes or add a serial or asset tag.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Commerce intake capture",
  description: "The intake camera: one item after another into a batch, with photos, video, voice notes, notes and labels.",
  urlPattern: "/commerce/intake",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const commerceIntakeManifest = declared;

export function createCommerceIntakeScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
