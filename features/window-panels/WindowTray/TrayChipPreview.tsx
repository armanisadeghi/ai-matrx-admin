"use client";

/**
 * TrayChipPreview — renders the body row of a minimized tray chip.
 *
 * Three rendering modes, in priority order:
 *
 *   1. **Custom**   — registry provides `renderTrayPreview` returning JSX
 *                    (best fidelity; opt-in per window-type)
 *   2. **Snapshot** — registry provides `captureTraySnapshot`; chip shows the
 *                    captured image stored in `traySnapshotMap`
 *   3. **Default**  — generic muted "label · category" line + subtle hint
 *
 * Each mode falls through gracefully — a missing snapshot or a render error
 * lands on the default text without breaking the chip.
 */

import { memo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getRegistryEntryByOverlayId,
  type TrayPreviewContext,
} from "../registry/windowRegistry";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOverlayData } from "@/lib/redux/slices/overlaySlice";
import { getTraySnapshot, subscribeTraySnapshotMap } from "./traySnapshotMap";

interface TrayChipPreviewProps {
  windowId: string;
  title: string;
}

/**
 * Stable instance id default. Multi-instance windows that need their own
 * preview should pass through the proper instance via `windowId` already
 * including any instance suffix — for v1 we look up the singleton bucket.
 */
const DEFAULT_INSTANCE_ID = "default";

export const TrayChipPreview = memo(function TrayChipPreview({
  windowId,
  title,
}: TrayChipPreviewProps) {
  const registryEntry = getRegistryEntryByOverlayId(windowId);

  // Pull the persisted overlay data so renderTrayPreview can read window-
  // specific state (last note title, file name, message preview, etc.).
  // selectOverlayData returns `data` (the JSON payload) or null when missing.
  const overlayData = useAppSelector((state) =>
    registryEntry
      ? selectOverlayData(
          state as Parameters<typeof selectOverlayData>[0],
          registryEntry.overlayId,
          DEFAULT_INSTANCE_ID,
        )
      : null,
  );

  // ── 1. Custom render mode ────────────────────────────────────────────────
  if (registryEntry?.renderTrayPreview) {
    const ctx: TrayPreviewContext = {
      data: (overlayData as Record<string, unknown> | null) ?? {},
      overlayId: registryEntry.overlayId,
      instanceId: DEFAULT_INSTANCE_ID,
      title,
    };
    try {
      return (
        <div className="flex-1 px-3 py-1 overflow-hidden text-xs text-muted-foreground">
          {registryEntry.renderTrayPreview(ctx)}
        </div>
      );
    } catch (err) {
      // Custom renderer threw — fall through to snapshot/default rather
      // than blowing up the entire tray. Log in dev for debugging.
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          `[TrayChipPreview] renderTrayPreview threw for "${windowId}":`,
          err,
        );
      }
    }
  }

  // ── 2. Snapshot mode ─────────────────────────────────────────────────────
  if (registryEntry?.captureTraySnapshot) {
    return <TraySnapshotImage windowId={windowId} title={title} />;
  }

  // ── 3. Default — muted label + subtle hint ───────────────────────────────
  return <DefaultTrayChipBody registryLabel={registryEntry?.label ?? null} />;
});

// ─── Default body ─────────────────────────────────────────────────────────────

const DefaultTrayChipBody = memo(function DefaultTrayChipBody({
  registryLabel,
}: {
  registryLabel: string | null;
}) {
  return (
    <div className="flex-1 flex items-center px-3 py-1 overflow-hidden">
      <span className="truncate text-[11px] text-muted-foreground/70">
        {registryLabel ?? "Click to restore"}
      </span>
    </div>
  );
});

// ─── Snapshot image ───────────────────────────────────────────────────────────

const TraySnapshotImage = memo(function TraySnapshotImage({
  windowId,
  title,
}: {
  windowId: string;
  title: string;
}) {
  const [snapshot, setSnapshot] = useState<string | null>(() =>
    getTraySnapshot(windowId),
  );

  // Subscribe to snapshot map changes — the snapshot is captured asynchronously
  // after the window minimizes, so the chip may render before the data url is
  // ready. The observer pattern lets us update without polling.
  useEffect(() => {
    const unsubscribe = subscribeTraySnapshotMap(() => {
      setSnapshot(getTraySnapshot(windowId));
    });
    return unsubscribe;
  }, [windowId]);

  if (!snapshot) {
    // Snapshot not yet captured (or failed) — show a quiet fallback rather
    // than nothing. Looks better than blank space during the brief async gap.
    return (
      <div className="flex-1 flex items-center px-3 py-1 overflow-hidden">
        <span className="truncate text-[11px] text-muted-foreground/60 italic">
          {title}
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden bg-muted/30 relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL, not a remote asset */}
      <img
        src={snapshot}
        alt=""
        className={cn(
          "w-full h-full object-cover",
          "opacity-90 hover:opacity-100 transition-opacity",
        )}
        draggable={false}
      />
    </div>
  );
});
