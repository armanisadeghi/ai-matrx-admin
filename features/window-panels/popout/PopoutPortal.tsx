"use client";

/**
 * PopoutPortal — wraps `createPortal` for rendering window-panel content
 * into a popout (Document Picture-in-Picture or `window.open`) document.
 *
 * Subscribes to `popoutWindowMap` via `usePopoutWindowRef` so the portal
 * automatically un-/re-mounts when the popout window opens or closes
 * without prop drilling the `Window` reference through the tree.
 *
 * Wraps children in `PopoutShell` so descendants see the popout-scoped
 * `PopoutContext` (used by `usePopoutContainer` for Radix portal
 * retargeting).
 *
 * **React tree topology:** the children stay in the *parent* React tree
 * (their Fiber is attached upstream of this `PopoutPortal`). Only the DOM
 * is mounted into the popout document. That preservation is what gives us
 * Redux/contexts/`callbackManager` for free across the window boundary.
 */
import { createPortal } from "react-dom";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectPopoutMode } from "@/lib/redux/slices/windowManagerSlice";
import { usePopoutWindowRef } from "./popoutWindowMap";
import { PopoutShell } from "./PopoutShell";
import type { ReactNode } from "react";

export interface PopoutPortalProps {
  windowId: string;
  children: ReactNode;
}

export function PopoutPortal({ windowId, children }: PopoutPortalProps) {
  const popoutWin = usePopoutWindowRef(windowId);
  const popoutMode = useAppSelector(selectPopoutMode(windowId));

  // Don't render anything until BOTH conditions hold:
  //  - Redux says this window is popped out (popoutMode !== null)
  //  - The actual `Window` reference is registered in popoutWindowMap
  //
  // The two can briefly disagree during open/close transitions; rendering
  // requires both to avoid mounting into a closed document.
  if (!popoutWin || popoutMode === null) return null;

  return createPortal(
    <PopoutShell popoutWindow={popoutWin} mode={popoutMode}>
      {children}
    </PopoutShell>,
    popoutWin.document.body,
  );
}
