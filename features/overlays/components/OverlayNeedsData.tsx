"use client";

/**
 * The honest empty state for an overlay opened without the record it shows (a bare open, a stale
 * restored session, a link whose record is gone). A window that opens blank is a defect: the store
 * says "open", the screen shows nothing, and the user cannot even close it. Every `*.render.tsx`
 * guard that used to `return null` for missing data returns this instead.
 *
 * Its window id is the overlay's own window id plus `-empty`, so this small frame never writes its
 * size or position over the real window's saved geometry.
 */
import { Button } from "@ai-matrx/design-system/controls";
import { WindowPanel } from "@ai-matrx/summon/window";
import { OVERLAY_META_INDEX } from "@/features/overlays/definitions/overlay-meta-index";

export interface OverlayNeedsDataProps {
  overlayId: string;
  onClose: () => void;
}

export function OverlayNeedsData({ overlayId, onClose }: OverlayNeedsDataProps) {
  const meta = OVERLAY_META_INDEX.find((m) => m.id === overlayId);
  const baseId = meta?.window?.windowId ?? overlayId;
  return (
    <WindowPanel
      id={`${baseId}-empty`}
      title={meta?.label ?? overlayId}
      onClose={onClose}
      width={360}
      height={180}
      minWidth={280}
      minHeight={140}
      overlayId={overlayId}
      bodyClassName="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4"
    >
      <p className="text-sm text-muted-foreground" data-overlay-empty={overlayId}>
        Nothing to show
      </p>
      <Button type="button" variant="outline" onClick={onClose}>
        Close
      </Button>
    </WindowPanel>
  );
}
