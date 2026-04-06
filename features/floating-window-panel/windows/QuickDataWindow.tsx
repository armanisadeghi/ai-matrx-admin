"use client";

import React from "react";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { QuickDataSheet } from "@/features/quick-actions/components/QuickDataSheet";

interface QuickDataWindowProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function QuickDataWindow({
  isOpen,
  onClose,
}: QuickDataWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Quick Data"
      width={800}
      height={600}
      urlSyncKey="quick_data"
      onClose={onClose}
    >
      <div className="flex h-full w-full relative overflow-hidden bg-background">
        <QuickDataSheet className="absolute inset-0" />
      </div>
    </WindowPanel>
  );
}
