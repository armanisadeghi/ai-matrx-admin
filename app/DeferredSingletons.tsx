"use client";

// ─── BEGIN PROBE: legacy OverlayController bundle exclusion ────────────────
// TEMPORARY — revert after Vercel build comparison.
//
// Goal: produce a Vercel build that 100% excludes the legacy
// `components/overlays/OverlayController.tsx` (2,569 LOC + 99 nested
// dynamic imports) so we can measure its real bundle/build cost.
//
// Why we comment out the `dynamic(() => import(...))` expression and not
// just the JSX: Turbopack/Webpack emit a chunk for any `import("…")`
// expression they see at build time, regardless of whether the component
// is ever rendered. Removing the JSX alone would still produce the chunk
// and fetch it on the client. The import expression itself must be gone.
//
// Trade-off accepted for this probe: any UI that dispatches to
// `promptRunnerSlice` (legacy /ai/prompts, PromptBuilder, etc.) will be
// non-functional during this build — actions dispatch, no controller
// renders the modal. Confirmed acceptable by Arman for this measurement.
//
// To revert: uncomment the four blocks below marked "PROBE-RESTORE",
// re-add the ternary in the JSX (search "PROBE-RESTORE" in this file),
// and apply the same revert to `app/(public)/PublicProviders.tsx`.
// ───────────────────────────────────────────────────────────────────────────

// PROBE-RESTORE (1/4) — `dynamic` import (only used by legacy controller)
// import dynamic from "next/dynamic";

import { useIdleReady, useIdleTask } from "@/utils/idle-scheduler";
import { PersistentDOMConnector } from "@/providers/persistance/PersistentDOMConnector";

// PROBE-RESTORE (2/4) — legacy controller dynamic import
// const OverlayController = dynamic(
//   () => import("@/components/overlays/OverlayController"),
//   { ssr: false },
// );
import UnifiedOverlayController from "@/features/window-panels/UnifiedOverlayController";

// PROBE-RESTORE (3/4) — env-flag toggle
// const USE_OVERLAYS_V2 =
//   process.env.NEXT_PUBLIC_OVERLAYS_V2 === "1" ||
//   process.env.NEXT_PUBLIC_OVERLAYS_V2 === "true";
// ─── END PROBE ─────────────────────────────────────────────────────────────
import { AudioRecoveryToast } from "@/features/audio/components/AudioRecoveryToast";
import AuthSessionWatcher from "@/components/layout/AuthSessionWatcher";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import AdminFeatureProvider from "@/features/admin/AdminFeatureProvider";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAppDispatch } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { fetchFullContext } from "@/features/agent-context/redux/hierarchyThunks";
// `loadPreferences` + `preferencesMiddleware` removed in PR 1.B. The middleware
// was never wired into the store chain (confirmed dead); client-side
// preference hydration is handled server-side via `getUserSessionData`
// today, and will be fully owned by the sync engine in Phase 2.

const SYSTEM_BROKERS = [
  {
    source: "system",
    sourceId: "global",
    mappedItemId: "user",
    brokerId: "GLOBAL_USER_OBJECT",
  },
  {
    source: "system",
    sourceId: "global",
    mappedItemId: "userId",
    brokerId: "GLOBAL_USER_ID",
  },
  {
    source: "system",
    sourceId: "global",
    mappedItemId: "userName",
    brokerId: "GLOBAL_USER_NAME",
  },
  {
    source: "system",
    sourceId: "global",
    mappedItemId: "userProfileImage",
    brokerId: "GLOBAL_USER_PROFILE_IMAGE",
  },
];

export default function DeferredSingletons() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  useIdleTask("broker-registration", 5, () => {
    dispatch(brokerActions.addOrUpdateRegisterEntries(SYSTEM_BROKERS));
  });

  useIdleTask("broker-values", 5, () => {
    if (!user?.id) return;
    dispatch(
      brokerActions.setValue({ brokerId: "GLOBAL_USER_OBJECT", value: user }),
    );
    dispatch(
      brokerActions.setValue({ brokerId: "GLOBAL_USER_ID", value: user.id }),
    );

    const userName =
      user.userMetadata?.fullName ||
      user.userMetadata?.name ||
      user.userMetadata?.preferredUsername ||
      user.email;
    dispatch(
      brokerActions.setValue({ brokerId: "GLOBAL_USER_NAME", value: userName }),
    );

    const profileImage =
      user.userMetadata?.avatarUrl || user.userMetadata?.picture || null;
    dispatch(
      brokerActions.setValue({
        brokerId: "GLOBAL_USER_PROFILE_IMAGE",
        value: profileImage,
      }),
    );
    dispatch(
      brokerActions.setValue({
        brokerId: "GLOBAL_USER_IS_ADMIN",
        value: user.isAdmin,
      }),
    );
  });

  // Pre-warm the full hierarchy (orgs, projects, tasks, scopes) once per session.
  // fetchFullContext() is idempotent — it skips the network call if data is already
  // loading or loaded. Any component that calls useNavTree() is safe to mount anywhere
  // in the app without worrying about triggering a duplicate fetch.
  useIdleTask("fetch-full-context", 1, () => {
    if (user?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(fetchFullContext() as any);
    }
  });

  const ready = useIdleReady();

  if (!ready) return null;

  return (
    <>
      <PersistentDOMConnector />
      {/* PROBE-RESTORE (4/4) — original ternary:
          {USE_OVERLAYS_V2 ? <UnifiedOverlayController /> : <OverlayController />} */}
      <UnifiedOverlayController />
      <AudioRecoveryToast />
      <AuthSessionWatcher />
      <AnnouncementProvider />
      <AdminFeatureProvider />
    </>
  );
}
