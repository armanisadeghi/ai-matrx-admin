/**
 * Surface manifest — Camera Capture (`matrx-user/camera`).
 *
 * `/camera`: the media-capture surface (`features/media-capture/**`) where the
 * user photographs or records something and saves it into their files.
 *
 * Declared 2026-08-17: the capture route had no surface declaration at all.
 *
 * FILE DOCTRINE (features/files/handler/FEATURE.md): captures are identified by
 * durable `file_id` only — never a signed URL, never an S3 `storage_uri`.
 *
 * Curated groups (band 0-899):
 *   capture_session  What the user has captured in this visit
 *   capture_library  The captures list under the studio (every saved capture)
 *
 * Emitter: `features/media-capture/cameraSurfaceScope.ts` (page-pass
 * 2026-10-22), mounted by `CameraPage`.
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
    key: "capture_session",
    label: "Capture session",
    sortOrder: 100,
    description: "What the user has captured and saved during this visit.",
  },
  {
    key: "capture_library",
    label: "Captures library",
    sortOrder: 200,
    description: "Every capture the person has saved, as listed under the studio.",
  },
];

export interface CaptureRow {
  file_id: string;
  file_name: string;
  kind: "photo" | "video" | "audio";
  updated_at: string | null;
}

export interface CaptureFilterOption {
  id: "all" | "photo" | "video" | "audio";
  label: string;
}

const surfaceSpecific: SurfaceValue[] = [
  {
    name: "capture_count",
    label: "Captures saved",
    description:
      "How many captures the user has saved during this visit to the camera. Always populated — zero before the first save.",
    valueType: "number",
    alwaysAvailable: true,
    typicalCharCount: 3,
    sortOrder: 100,
    group: "capture_session",
  },
  {
    name: "last_capture_file_id",
    label: "Last capture file ID",
    description:
      "Durable `file_id` of the most recent capture saved in this visit. Empty before the first save. Bytes are always re-minted from this id, never from a stored URL.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 36,
    sortOrder: 110,
    group: "capture_session",
  },
  {
    name: "studio_open",
    label: "Studio panel open",
    description:
      "True when the post-capture studio panel is open beside the camera. Always populated — open by default.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    sortOrder: 120,
    group: "capture_session",
  },
  {
    name: "captures_status",
    label: "Captures load status",
    description:
      '"loading", "loaded" or "error". When "error" the captures list failed to load and the person sees a retry — do not report counts or rows. Always populated.',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 7,
    sortOrder: 200,
    group: "capture_library",
  },
  {
    name: "captures_overview",
    label: "Captures overview",
    description:
      "Compact XML of the captures list as shown: totals per kind and the newest captures under the current filter (file_id, name, kind, updated), capped at 40 rows with the remainder counted. Absent until the list has loaded.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 3500,
    inlineUpTo: 4000,
    sortOrder: 205,
    group: "capture_library",
  },
  {
    name: "capture_counts",
    label: "Capture counts",
    description:
      "Saved captures per kind: { all, photo, video, audio } — the numbers on the filter tabs. Absent until the list has loaded; zeros when the person has none.",
    valueType: "object",
    alwaysAvailable: false,
    typicalCharCount: 60,
    sortOrder: 210,
    group: "capture_library",
  },
  {
    name: "capture_rows",
    label: "Shown captures",
    description:
      "Every capture shown under the current filter, newest first: { file_id, file_name, kind, updated_at }. Absent until loaded; [] when none.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 4000,
    sortOrder: 220,
    group: "capture_library",
  },
  {
    name: "capture_filter",
    label: "Captures filter",
    description: 'Which kind the captures list shows: "all", "photo", "video" or "audio". Always populated.',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 5,
    sortOrder: 230,
    group: "capture_library",
  },
  {
    name: "capture_filter_options",
    label: "Captures filter options",
    description: "The filter choices as { id, label } — the values capture_filter accepts.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 120,
    sortOrder: 240,
    group: "capture_library",
  },
];

export const cameraManifest: SurfaceManifest = {
  surfaceName: "matrx-user/camera",
  situation:
    "They are on the camera page, photographing or recording something to save into their files: {capture_count} saved this visit, capture studio open: {studio_open}. The captures list shows {capture_filter} captures (list: {captures_status}); they can change that filter.",
  inheritsFrom: "matrx-default/media",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "Photograph or record something and save it into files.",
  label: "Camera",
  urlPattern: "/camera",
  intro: `<surface_intro>
You are on the Camera: where the user photographs or records something and saves it into their files.
capture_count and last_capture_file_id describe what has been saved during this visit — before the first save there is nothing to work with, and you should say so rather than assume an image exists.
A capture is always referred to by its file_id; resolve bytes from the id rather than from any URL you were handed.
Below the studio the page lists every saved capture: captures_overview summarizes it, capture_rows has the shown rows, capture_counts the totals. If captures_status is "error" the list did not load — say so. Use capture_filter to switch the list between all, photos, videos and audio. You cannot take, rename or delete a capture from here.
</surface_intro>`,
  groups: [...groups, { key: "navigation", label: "View", sortOrder: 300 }],
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
  writeTargets: [
    {
      name: "capture_filter",
      label: "Filter captures",
      description:
        'Switches the captures list to one kind. Value is one id from capture_filter_options: "all", "photo", "video" or "audio". Anything else is refused. No capture changes.',
      valueType: "string",
      mode: "ui",
      applyPolicy: "auto",
      updatesValue: "capture_filter",
      group: "navigation",
      sortOrder: 100,
    },
  ],
};

/** Type-safe payload helper — required keys mirror `alwaysAvailable: true`. */
export function createCameraScope(values: {
  capture_count: number;
  studio_open: boolean;
  captures_status: "loading" | "loaded" | "error";
  capture_filter: CaptureFilterOption["id"];
  capture_filter_options: CaptureFilterOption[];
  captures_overview?: string;
  capture_counts?: { all: number; photo: number; video: number; audio: number };
  capture_rows?: CaptureRow[];
  selection?: string;
  context?: Record<string, unknown>;
  last_capture_file_id?: string;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
