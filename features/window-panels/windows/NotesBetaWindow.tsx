"use client";

// NotesBetaWindow — Improved floating notes panel.
//
// Key improvements over NotesWindow:
//  1. Sidebar uses WindowPanel's built-in ResizablePanelGroup → collapsible + draggable
//  2. View mode controls are rendered inline (not portaled to shell PageHeader)
//  3. Context menus are portaled to document.body → always above the window stacking context
//  4. Empty state shows a folder quick-pick grid for fast note creation
//  5. Supports multiple simultaneous instances (windowInstanceId per instance)

import React, { useEffect, useRef, useState } from "react";
import {
  WindowPanel,
  type WindowPanelProps,
} from "@/features/window-panels/WindowPanel";
import { NoteSidebar } from "@/features/notes/components/NoteSidebar";
import { NotesWindowView } from "@/features/notes/components/NotesWindowView";

export interface NotesBetaWindowProps extends Omit<
  WindowPanelProps,
  "children" | "title" | "sidebar"
> {
  title?: string;
  /** Unique overlay instance ID — used to derive stable notes instance + window IDs. */
  windowInstanceId?: string;
}

export function NotesBetaWindow({
  title = "Notes Beta",
  id,
  windowInstanceId,
  ...windowProps
}: NotesBetaWindowProps) {
  // Derive stable IDs from the overlay instance ID so multiple windows don't collide.
  const stableKey = windowInstanceId ?? "default";
  const windowId = id ?? `notes-beta-window-${stableKey}`;
  const notesInstanceId = `notes-beta-${stableKey}`;

  // document.body as portal target — avoids SSR and resolves context menu stacking.
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  return (
    <WindowPanel
      title={title}
      minWidth={700}
      minHeight={600}
      urlSyncKey={`notes-beta-${stableKey}`}
      urlSyncId={stableKey}
      id={windowId}
      overlayId="notesBetaWindow"
      sidebar={
        <NoteSidebar
          instanceId={notesInstanceId}
          contextMenuPortalTarget={portalTarget}
        />
      }
      sidebarDefaultSize={200}
      sidebarMinSize={140}
      sidebarExpandsWindow
      {...windowProps}
    >
      <NotesWindowView
        config={{
          showTabs: true,
          instanceId: notesInstanceId,
        }}
        className="h-full"
      />
    </WindowPanel>
  );
}
