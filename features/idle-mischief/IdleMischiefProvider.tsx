"use client";

// Provider for the idle-mischief subsystem.
//
// CRITICAL: this provider gates the ENTIRE subsystem behind
// `selectIsSuperAdmin`. For non-admins it returns null synchronously, before
// any hook runs:
//   - useIdleDetection's window event listeners + setInterval are NEVER
//     attached
//   - the orchestrator's capture-phase activity listeners are NEVER attached
//   - no Redux dispatches fire for non-admins
//   - no DOM mutations, no clones, no portals
//
// This is the safety guarantee that mischief code can NEVER affect a
// non-admin user's experience under any circumstances.
//
// What lives here for admins:
//   - <MischiefStage />        — the orchestrator
//   - <MischiefDiagnostics />  — the draggable diagnostic popover
//   - Cmd+Shift+M / Ctrl+Shift+M global shortcut for "play tremor"
//
// User-facing dev controls (act buttons, speed slider, loop toggle, snap-back)
// live inside the admin indicator's MediumIndicator. See
// `components/MischiefControls.tsx`.

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdmin } from "@/lib/redux/slices/userSlice";
import { triggerAct } from "./state/idleMischiefSlice";
import { MischiefStage } from "./components/MischiefStage";
import { MischiefDiagnostics } from "./components/MischiefDiagnostics";

export function IdleMischiefProvider() {
  const isSuperAdmin = useAppSelector(selectIsSuperAdmin);

  console.log("isSuperAdmin", isSuperAdmin);

  // Hard gate — non-admins get NOTHING from this subsystem. Hook order is
  // preserved by always running this hook above the gate.
  if (!isSuperAdmin) return null;

  return <AdminMischief />;
}

function AdminMischief() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "m"
      ) {
        e.preventDefault();
        dispatch(triggerAct("tremor"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dispatch]);

  return (
    <>
      <MischiefStage />
      <MischiefDiagnostics />
    </>
  );
}
