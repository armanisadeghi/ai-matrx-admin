// features/idle-mischief/IdleMischiefProvider.tsx
//
// Single mount point for the idle-mischief subsystem. Drop into the global
// provider tree. Renders the orchestrator (no DOM) and the dev button
// (gated). Acts portal themselves into document.body when they fire.

"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { triggerAct } from "./state/idleMischiefSlice";
import { MischiefStage } from "./components/MischiefStage";
import { MischiefDevButton } from "./components/MischiefDevButton";

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

  return (
    <>
      <MischiefStage />
      <MischiefDevButton />
    </>
  );
}
