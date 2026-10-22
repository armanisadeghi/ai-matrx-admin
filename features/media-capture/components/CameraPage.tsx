"use client";

/**
 * features/media-capture/components/CameraPage.tsx — the /camera route body.
 *
 * Capture Studio (photo / video / audio) + the full capture management lens
 * (`CaptureLibrary`): kind filters, upload-state chips with failed-upload
 * retry, TUS resume-pending indicator, journal recovery, and the canonical
 * file context menu / viewer links — all over the EXISTING files data layer
 * (no second query stack). Body stays `h-full overflow-hidden` with the
 * internal scroll on the content column (core-route rules).
 */

import { useState } from "react";
import { Camera, Filter } from "lucide-react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { Button } from "@/components/ui/button";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { CaptureStudio } from "@/features/media-capture/components/CaptureStudio";
import {
  CAPTURE_FILTERS,
  CaptureLibrary,
  useCaptureItems,
  type CaptureKindFilter,
} from "@/features/media-capture/components/CaptureLibrary";
import {
  buildCameraScope,
  isCaptureKindFilter,
} from "@/features/media-capture/cameraSurfaceScope";

const SURFACE_NAME = "matrx-user/camera";

export default function CameraPage() {
  const [studioOpen, setStudioOpen] = useState(true);
  // Bumped on save so the lens reflects the new row even if realtime lags.
  const [saveCount, setSaveCount] = useState(0);
  const [lastSavedFileId, setLastSavedFileId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CaptureKindFilter>("all");
  // Same files-layer read the library makes; the tree loads once.
  const library = useCaptureItems();

  const getScope = () =>
    buildCameraScope({
      savedThisVisit: saveCount,
      lastSavedFileId,
      studioOpen,
      filter,
      library,
    });

  return (
    <SurfaceRuntimeProvider
      surfaceName={SURFACE_NAME}
      getScope={getScope}
      getWriteHandlers={() => ({
        capture_filter: {
          validate: (value) => {
            if (!isCaptureKindFilter(value)) {
              throw new Error(
                'capture_filter must be one of "all", "photo", "video", "audio". Nothing was changed.',
              );
            }
          },
          apply: (value) => {
            if (!isCaptureKindFilter(value)) {
              throw new Error("Unknown capture filter. Nothing was changed.");
            }
            setFilter(value);
            return { summary: `Showing ${value === "all" ? "all captures" : value}.`, data: { filter: value } };
          },
        },
      })}
    >
      <RouteHeader
        left={
          <>
            <Camera className="mr-2 h-4 w-4 shrink-0 text-primary" />
            <h1 className="shrink-0 text-sm font-semibold">Camera</h1>
          </>
        }
        right={
          !studioOpen ? (
            <Button
              icon={<Camera />}
              variant="primary"
              onClick={() => setStudioOpen(true)}
              aria-label="New capture"
            >
              New capture
            </Button>
          ) : undefined
        }
      />

      <NonEditableContextMenu
        sourceFeature="files"
        surfaceName={SURFACE_NAME}
        menuVersion={2}
        getApplicationScope={getScope}
        contentSource={{ type: "raw" }}
        extraSections={[
          {
            id: "camera-capture-filter",
            label: "Show captures",
            anchor: "after-clipboard",
            items: CAPTURE_FILTERS.map((f) => ({
              kind: "item" as const,
              id: f.key,
              label: f.label,
              icon: Filter,
              onSelect: () => setFilter(f.key),
            })),
          },
        ]}
      >
      <div className="matrx-touch-targets h-full overflow-hidden bg-textured">
        {/*
          The studio must FIT the viewport — never grow to the camera's
          intrinsic size and push the library off-screen (a real feed made the
          stage taller than the page). On desktop the column does not scroll:
          studio and library split the available height (≈60/40) and each is
          `min-h-0` so the stage is bounded and the library scrolls INSIDE its
          own region. On mobile a bounded split would crush the stage, so the
          column falls back to a normal vertical scroll with min-height floors.
        */}
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 pt-[var(--shell-header-h)] md:overflow-hidden">
          {studioOpen && (
            <div className="min-h-[360px] shrink-0 md:min-h-0 md:flex-[3] md:basis-0">
              <CaptureStudio
                sourceFeature="camera"
                onSaved={(fileId) => {
                  setSaveCount((n) => n + 1);
                  setLastSavedFileId(fileId);
                }}
              />
            </div>
          )}
          <div className="min-h-[280px] shrink-0 md:min-h-0 md:flex-[2] md:basis-0 md:overflow-y-auto">
            <CaptureLibrary
              refreshToken={saveCount}
              filter={filter}
              onFilterChange={setFilter}
            />
          </div>
        </div>
      </div>
      </NonEditableContextMenu>
    </SurfaceRuntimeProvider>
  );
}
