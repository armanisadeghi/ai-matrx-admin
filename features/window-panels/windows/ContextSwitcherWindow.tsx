"use client";

import React from "react";
import { WindowPanel } from "../WindowPanel";
import { ContextSwitcherCore } from "@/features/context/components/ContextSwitcherCore";

export interface ContextSwitcherWindowProps {
  isOpen: boolean;
  onClose: () => void;
  instanceId?: string;
}

export function ContextSwitcherWindow({
  isOpen,
  onClose,
  instanceId = "default",
}: ContextSwitcherWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      id={`context-switcher-${instanceId}`}
      title="Context Switcher"
      onClose={onClose}
      minWidth={320}
      minHeight={400}
      width={360}
      height={480}
      position="center"
    >
      <ContextSwitcherCore />
    </WindowPanel>
  );
}
