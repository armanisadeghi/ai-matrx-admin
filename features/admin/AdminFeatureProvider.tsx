"use client";

// Thin shell over ONE dynamic edge (Method C, code-splitting skill): every
// admin singleton of the deferred tree lives statically inside
// AdminFeatureProviderCore behind this single boundary instead of sibling
// dynamics or static mounts in DeferredSingletonCore.
//
// THE EARLY BOOLEAN (Arman, 2026-10-15): "The admin parts absolutely must not
// ever go past an early boolean check for any non-admin user." The gate is
// ADMIN IDENTITY at any tier (`selectIsAdminDebugger`), the widest bar any
// piece inside uses; a non-admin never fetches the core chunk and runs none of
// its effects. Each piece keeps its own narrower gate inside the core.

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsAdminDebugger,
  selectIsSuperAdmin,
  selectIsSuperAdminDebugger,
} from "@/lib/redux/selectors/userSelectors";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { useDebugModePersistence } from "./useDebugModePersistence";

const AdminFeatureProviderCore = dynamic(
  () => import("./AdminFeatureProviderCore"),
  { ssr: false, loading: () => null },
);

export default function AdminFeatureProvider() {
  const isAdminPerson = useAppSelector(selectIsAdminDebugger);
  const isAdmin = useAppSelector(selectIsSuperAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);
  // The debug switch (sidebar, every page) survives reloads, tabs and devices — saved in user
  // preferences. Gated like the switch itself: `selectIsSuperAdmin` is false on user pages.
  const canDebug = useAppSelector(selectIsSuperAdminDebugger);
  useDebugModePersistence(Boolean(canDebug));
  // The page-load trace (lib/diagnostics/loadTrace.ts) installs before Redux exists, so the debug
  // switch leaves it a note for the next boot. Inline on purpose: no import edge from the shell.
  // Key = LOAD_TRACE_ADMIN_KEY in lib/diagnostics/loadTraceFlag.ts.
  const debugTrace = Boolean(canDebug && isDebugMode);
  useEffect(() => {
    if (!canDebug) return;
    try {
      if (debugTrace) window.localStorage.setItem("matrx:load-trace-admin", "1");
      else window.localStorage.removeItem("matrx:load-trace-admin");
    } catch {
      /* storage blocked */
    }
  }, [canDebug, debugTrace]);

  if (!isAdminPerson) return null;
  return (
    <AdminFeatureProviderCore
      isAdmin={isAdmin}
      canDebug={canDebug}
      isDebugMode={isDebugMode}
    />
  );
}
