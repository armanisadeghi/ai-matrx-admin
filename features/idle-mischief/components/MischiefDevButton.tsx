// features/idle-mischief/components/MischiefDevButton.tsx
//
// Dev-only floating button. Click → start Act 1. Shift-click → open the
// dev panel. Hidden unless NODE_ENV is "development" or debug-mode is on.

"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import {
  selectMischiefCurrentAct,
  triggerAct,
} from "../state/idleMischiefSlice";
import { MischiefDevPanel } from "./MischiefDevPanel";

export function MischiefDevButton() {
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const currentAct = useAppSelector(selectMischiefCurrentAct);
  const dispatch = useAppDispatch();
  const [panelOpen, setPanelOpen] = useState(false);

  const isDev = process.env.NODE_ENV === "development";
  if (!isDev && !isDebugMode) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          if (e.shiftKey) {
            setPanelOpen((v) => !v);
            return;
          }
          dispatch(triggerAct("tremor"));
        }}
        title="Idle mischief — click to play, shift-click for panel"
        aria-label="Idle mischief dev trigger"
        className={`fixed bottom-4 right-4 z-[2147483647] h-9 w-9 rounded-full bg-card/90 backdrop-blur-md border shadow-lg flex items-center justify-center text-foreground/80 hover:text-foreground hover:bg-accent transition-colors ${currentAct ? "border-primary animate-pulse" : "border-border"}`}
      >
        <Wand2 className="h-4 w-4" />
      </button>
      <MischiefDevPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
    </>
  );
}
