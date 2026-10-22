/**
 * Surface manifest — Commerce intake asset (`matrx-user/commerce-intake-asset`).
 *
 * `/commerce/intake/assets/[id]`: one captured intake asset — its photos, videos and
 * voice notes, its notes, its identifiers (QR labels, serials, tags) and the editable
 * attribute rows the pipeline and people fill.
 *
 * Emitter: `AssetDetail` (`features/commerce-intake/components/`).
 * Write targets, through the page's own guarded writers:
 *   - `asset_notes` replaces (or patches) the notes (`setAssetNotes`).
 *   - `asset_attributes` sets or removes attribute rows (`setAssetAttributes`).
 * Not writable: media, identifiers (retiring one is the person's), "Mark captured"
 * (it hands the asset to the pipeline).
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

export const COMMERCE_INTAKE_ASSET_SURFACE_NAME = "matrx-user/commerce-intake-asset";

const groups: SurfaceValueGroup[] = [
  { key: "intake_asset", label: "Asset", sortOrder: 100, description: "The one intake asset on screen." },
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
  group: "intake_asset",
  sortOrder,
  ...extra,
});

const surfaceSpecific: SurfaceValue[] = [
  v("asset_id", "Asset ID", "string", 100, "UUID of the asset (from the address).", { alwaysAvailable: true, typicalCharCount: 36 }),
  v("asset_load_status", "Load status", "string", 110, '"loading", "loaded", "failed" (the read failed; the page offers a retry) or "not_found" (no access or no such asset).', {
    alwaysAvailable: true,
    typicalCharCount: 10,
  }),
  v(
    "asset",
    "Asset details",
    "object",
    120,
    "{ id, batch_id, organization_id, tracking_mode, quantity, pipeline_state, composition, qr_code, created_at }.",
    { typicalCharCount: 300 },
  ),
  v("pipeline_state", "Pipeline state", "string", 125, "Where the asset is in the pipeline (captured, extracting, …).", { typicalCharCount: 14 }),
  v("asset_notes", "Notes", "string", 130, "The asset's notes as they stand in the notes box.", { typicalCharCount: 300, inlineUpTo: 4000 }),
  v("asset_attributes", "Attributes", "object", 140, "The named attribute rows as saved: { name: value }.", { typicalCharCount: 500 }),
  v(
    "identifiers",
    "Identifiers",
    "array",
    150,
    'Its labels and numbers: { id, kind ("our_qr" | "manufacturer_serial" | "asset_tag" | "client_ref"), value, is_primary, replaced_at }.',
    { typicalCharCount: 300 },
  ),
  v("photo_count", "Photos", "number", 160, "Photos of the asset (separator shots not counted)."),
  v("video_count", "Videos", "number", 170, "Videos of the asset."),
  v("voice_note_count", "Voice notes", "number", 180, "Voice notes on the asset."),
];

const writeTargets: SurfaceWriteTarget[] = [
  {
    name: "asset_notes",
    label: "Write the notes",
    description:
      "Replace (or patch) the asset's notes. SAVED after the person approves, through the same guarded save as the notes box. Value is the full notes text. Refused: the asset not loaded.",
    valueType: "string",
    approvalComparison: "text-replacement",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "asset_notes",
    patchable: true,
    group: "intake_asset",
    sortOrder: 300,
  },
  {
    name: "asset_attributes",
    label: "Set attributes",
    description:
      'Set or remove attribute rows. SAVED after the person approves. Value is a JSON object { "<attribute name>": "value" | null }; null removes that row, names you leave out keep their value. Refused: an empty name, a value that is not text or null, the asset not loaded.',
    valueType: "object",
    mode: "entity",
    applyPolicy: "ask",
    updatesValue: "asset_attributes",
    group: "intake_asset",
    sortOrder: 310,
  },
];

const declared: SurfaceManifest = {
  surfaceName: COMMERCE_INTAKE_ASSET_SURFACE_NAME,
  situation:
    "They are looking at one intake asset ({pipeline_state|state unknown}; page: {asset_load_status}) with {photo_count|no} photos and {voice_note_count|no} voice notes. You can rewrite its notes or set its attributes.",
  inheritsFrom: "matrx-default/commerce",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  label: "Commerce intake asset",
  description: "One captured intake asset: media, notes, identifiers and attributes.",
  urlPattern: "/commerce/intake/assets/[id]",
  groups,
  values: mergeBaselineValues(pickBaseline("selection"), surfaceSpecific),
  writeTargets,
};

export const commerceIntakeAssetManifest = declared;

export function createCommerceIntakeAssetScope(values: Record<string, unknown>): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
