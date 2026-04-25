"use client";

import dynamic from "next/dynamic";
import { useIdleReady, useIdleTask } from "@/utils/idle-scheduler";
import { PersistentDOMConnector } from "@/providers/persistance/PersistentDOMConnector";

// Bundle dedup (Phase 6): the legacy ~2,500-line OverlayController is
// chunked off the initial bundle so its weight only ships when V2 is OFF
// at runtime. UnifiedOverlayController stays static — it's tiny (~60 LOC)
// and uses `componentImport` per registry entry to lazy-load each window.
const OverlayController = dynamic(
  () => import("@/components/overlays/OverlayController"),
  { ssr: false },
);
import UnifiedOverlayController from "@/features/window-panels/UnifiedOverlayController";

// Opt-in switch to the registry-driven controller. Default off until the
// remaining non-window overlays (agent widgets, prompt runners, quick sheets,
// etc.) are absorbed into the registry in sub-phase 2b. Flip via
// `NEXT_PUBLIC_OVERLAYS_V2=1` in .env.local for smoke testing.
const USE_OVERLAYS_V2 =
  process.env.NEXT_PUBLIC_OVERLAYS_V2 === "1" ||
  process.env.NEXT_PUBLIC_OVERLAYS_V2 === "true";
import { AudioRecoveryToast } from "@/features/audio/components/AudioRecoveryToast";
import AuthSessionWatcher from "@/components/layout/AuthSessionWatcher";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import AdminFeatureProvider from "@/features/admin/AdminFeatureProvider";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAppDispatch } from "@/lib/redux/hooks";
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
  const user = useAppSelector((state) => state.user);

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
      {USE_OVERLAYS_V2 ? <UnifiedOverlayController /> : <OverlayController />}
      <AudioRecoveryToast />
      <AuthSessionWatcher />
      <AnnouncementProvider />
      <AdminFeatureProvider />
    </>
  );
}
