// features/idle-mischief/IdleMischiefProvider.tsx
//
// Single mount point for the idle-mischief subsystem. Drop into the global
// provider tree. Renders the orchestrator (no DOM) and the dev button
// (gated). Acts portal themselves into document.body when they fire.

"use client";

// Provider for the idle-mischief subsystem.
//
// What lives here:
//   - <MischiefStage /> — the orchestrator (renders no DOM; runs the
//     idle-detection loop + manual-trigger queue + snap-back lifecycle).
//   - Cmd+Shift+M / Ctrl+Shift+M global shortcut (dev/debug only) for
//     a quick "play tremor" trigger without opening the admin indicator.
//
// The user-facing dev controls (act buttons, speed slider, loop toggle,
// snap-back) live inside the admin indicator's MediumIndicator. See
// `components/MischiefControls.tsx`.

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { triggerAct } from "./state/idleMischiefSlice";
import { MischiefStage } from "./components/MischiefStage";

export function IdleMischiefProvider() {
  const dispatch = useAppDispatch();
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!isDev && !isDebugMode) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        dispatch(triggerAct("tremor"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDev, isDebugMode, dispatch]);

  return <MischiefStage />;
}
