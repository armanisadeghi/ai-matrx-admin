"use client";

// Method-C core (see code-splitting skill): every admin singleton of the
// deferred tree, compiled as ONE piece behind the single dynamic edge in
// AdminFeatureProvider — no per-component boundaries. That shell mounts this
// core only for an admin (any tier); each piece below keeps its own gate:
//   - isAdmin (admin POWER, super admin, admin section only): the indicator,
//     credential notifier, debug indicators.
//   - canDebug (super admin, every page): Auto-watch (Smart Add runs on user
//     pages too; it also gates itself on `useCanWatchAi`).
//   - ErrorInspectorBadge gates itself on `selectIsAdminDebugger` (any tier).
//   - AdminAttentionDock gates itself on `selectIsSuperAdmin` and issues no
//     request without it.
// DevPerfOverlay is the exception: dev-only + debug-gated, so it keeps an
// in-gate React.lazy boundary (build-cheap) and never enters the production
// chunk.

import { lazy, Suspense } from "react";
import AdminIndicatorWrapper from "@/components/admin/controls/AdminIndicatorWrapper";
import CredentialExpiryNotifier from "@/components/admin/CredentialExpiryNotifier";
import { DebugIndicatorManager } from "@/components/debug/DebugIndicatorManager";
import AutoWatch from "@/features/ai-watch/AutoWatch";
import FollowedWorkSync from "@/features/ai-watch/FollowedWorkSync";
import ErrorInspectorBadge from "@/features/admin/error-inspector/ErrorInspectorBadge";
import AdminAttentionDock from "@/features/admin/attention/AdminAttentionDock";

const DevPerfOverlay =
  process.env.NODE_ENV === "development"
    ? lazy(() => import("@/features/shell/components/dev/DevPerfOverlay"))
    : null;

export default function AdminFeatureProviderCore({
  isAdmin,
  canDebug,
  isDebugMode,
}: {
  isAdmin: boolean;
  canDebug: boolean;
  isDebugMode: boolean;
}) {
  return (
    <>
      {canDebug ? <AutoWatch /> : null}
      {canDebug ? <FollowedWorkSync /> : null}
      {isAdmin ? (
        <>
          <AdminIndicatorWrapper />
          <CredentialExpiryNotifier />
          <DebugIndicatorManager />
          {isDebugMode && DevPerfOverlay && (
            <Suspense fallback={null}>
              <DevPerfOverlay />
            </Suspense>
          )}
        </>
      ) : null}
      <ErrorInspectorBadge />
      {/* ONE floating card for every concern (schedule alarms, provider
          outages) with a per-item mute and a whole-dock snooze; renders
          nothing while nothing needs a person. It FLOATS: see the component
          header and styles/shell.css. */}
      <AdminAttentionDock />
    </>
  );
}
