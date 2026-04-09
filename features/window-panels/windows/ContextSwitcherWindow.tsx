"use client";

import React from "react";
import { WindowPanel } from "../WindowPanel";
import {
  HierarchyTree,
  useHierarchyReduxBridge,
} from "@/features/agent-context/components/hierarchy-selection";

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
  const { value, onChange } = useHierarchyReduxBridge();

  if (!isOpen) return null;

  return (
    <WindowPanel
      id={`context-switcher-${instanceId}`}
      title="Context"
      onClose={onClose}
      minWidth={320}
      minHeight={400}
      width={360}
      height={480}
      position="center"
    >
      <HierarchyTree
        levels={["organization", "scope", "project", "task"]}
        value={value}
        onChange={onChange}
      />
    </WindowPanel>
  );
}
