"use client";

import React from "react";
import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { QuickDataSheet } from "@/features/quick-actions/components/QuickDataSheet";

interface QuickDataWindowProps {
  isOpen: boolean;
  onClose?: () => void;
  /**
   * Pre-selected table id. Wired up from the registry's `defaultData.selectedTable`
   * slot — `OverlaySurface` spreads the overlay data onto window props, so any
   * `dispatch(openOverlay({ overlayId: "quickDataWindow", data: { selectedTable } }))`
   * call lands here.
   */
  selectedTable?: string | null;
}

export default function QuickDataWindow({
  isOpen,
  onClose,
  selectedTable,
}: QuickDataWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Data Tables"
      width={800}
      height={600}
      urlSyncKey="quick_data"
      onClose={onClose}
      overlayId="quickDataWindow"
    >
      <div className="flex h-full w-full relative overflow-hidden bg-background">
        <QuickDataSheet
          className="absolute inset-0"
          initialTableId={selectedTable ?? null}
        />
      </div>
    </WindowPanel>
  );
}
