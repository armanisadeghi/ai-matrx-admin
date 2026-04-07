"use client";

// NotesWindow — Floating notes panel using the 6-layer architecture.
// Wraps NotesView inside a WindowPanel. No prop drilling.
// Each layer reads its own Redux selectors.

import React from "react";
import {
  WindowPanel,
  type WindowPanelProps,
} from "@/features/window-panels/WindowPanel";
import { NotesView } from "@/features/notes/components/NotesView";

export interface NotesWindowProps
  extends Omit<
    WindowPanelProps,
    "children" | "title"
  > {
  title?: string;
}

export function NotesWindow({
  title = "Notes",
  id = "notes-window",
  ...windowProps
}: NotesWindowProps) {
  return (
    <WindowPanel
      title={title}
      minWidth={340}
      minHeight={220}
      urlSyncKey="notes"
      urlSyncId="default"
      id={id}
      {...windowProps}
    >
      <NotesView
        config={{
          showSidebar: true,
          showTabs: true,
          instanceId: `window-${id}`,
        }}
        className="h-full"
      />
    </WindowPanel>
  );
}
