// features/media-capture/cameraSurfaceScope.ts
//
// Builds the `matrx-user/camera` scope from what /camera already holds in
// render state. Synchronous and fetch-free: the Surface Context window polls
// getScope. Library keys are OMITTED while the captures are loading, are
// empty/zero once loaded with nothing, and a failed load reports
// `captures_status: "error"` instead of counts that contradict the screen.

import { xmlElement, xmlList } from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import {
  createCameraScope,
  type CaptureFilterOption,
  type CaptureRow,
} from "@/features/surfaces/manifests/camera.manifest";
import {
  CAPTURE_FILTERS,
  type CaptureItem,
  type CaptureItemsState,
  type CaptureKindFilter,
} from "@/features/media-capture/components/CaptureLibrary";

/** Rows in the up-front overview; the rest are counted, never silently lost. */
const OVERVIEW_MAX_ROWS = 40;

export const CAPTURE_FILTER_OPTIONS: CaptureFilterOption[] = CAPTURE_FILTERS.map((f) => ({
  id: f.key,
  label: f.label,
}));

export function isCaptureKindFilter(value: unknown): value is CaptureKindFilter {
  return CAPTURE_FILTERS.some((f) => f.key === value);
}

export function toCaptureRow(item: CaptureItem): CaptureRow {
  return {
    file_id: item.file.id,
    file_name: item.file.fileName,
    kind: item.kind,
    updated_at: item.file.updatedAt ?? null,
  };
}

export interface CameraScopeInput {
  savedThisVisit: number;
  lastSavedFileId: string | null;
  studioOpen: boolean;
  filter: CaptureKindFilter;
  library: Pick<CaptureItemsState, "allCaptures" | "counts" | "status">;
}

export function buildCameraScope(input: CameraScopeInput): SurfaceScopePayload {
  const { library, filter } = input;
  const loaded = library.status === "loaded";
  const shown = loaded
    ? (filter === "all"
        ? library.allCaptures
        : library.allCaptures.filter((i) => i.kind === filter)
      ).map(toCaptureRow)
    : undefined;

  return createCameraScope({
    capture_count: input.savedThisVisit,
    studio_open: input.studioOpen,
    ...(input.lastSavedFileId ? { last_capture_file_id: input.lastSavedFileId } : {}),
    captures_status: library.status,
    capture_filter: filter,
    capture_filter_options: CAPTURE_FILTER_OPTIONS,
    ...(loaded && shown
      ? {
          capture_counts: { ...library.counts },
          capture_rows: shown,
          captures_overview: xmlElement(
            "captures",
            {
              filter,
              all: library.counts.all,
              photos: library.counts.photo,
              videos: library.counts.video,
              audio: library.counts.audio,
            },
            xmlList(
              "shown",
              shown,
              (row) =>
                xmlElement("capture", {
                  file_id: row.file_id,
                  name: row.file_name,
                  kind: row.kind,
                  updated: row.updated_at ?? "",
                }),
              { maxRows: OVERVIEW_MAX_ROWS },
            ),
          ),
        }
      : {}),
  });
}
