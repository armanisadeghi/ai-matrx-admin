"use client";

// Thin shell over ONE dynamic edge (Method C, code-splitting skill): the
// admin singletons always render together for admins, so they live statically
// inside AdminFeatureProviderCore behind this single boundary instead of four
// sibling dynamics. Non-admins never fetch the chunk.

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsSuperAdmin, selectIsSuperAdminDebugger } from "@/lib/redux/slices/userSlice";
import AutoWatch from "@/features/ai-watch/AutoWatch";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { useDebugModePersistence } from "./useDebugModePersistence";

const AdminFeatureProviderCore = dynamic(
  () => import("./AdminFeatureProviderCore"),
  { ssr: false, loading: () => null },
);

export default function AdminFeatureProvider() {
  const isAdmin = useAppSelector(selectIsSuperAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);
  // The debug switch (sidebar, every page) survives reloads, tabs and devices — saved in user
  // preferences. Gated like the switch itself: `selectIsSuperAdmin` is false on user pages.
  const canDebug = useAppSelector(selectIsSuperAdminDebugger);
  useDebugModePersistence(Boolean(canDebug));

  return (
    <>
      {/* Auto-watch runs on user pages too (Smart Add); it gates itself on `useCanWatchAi`. */}
      {canDebug ? <AutoWatch /> : null}
      {isAdmin ? <AdminFeatureProviderCore isDebugMode={isDebugMode} /> : null}
    </>
  );
}
