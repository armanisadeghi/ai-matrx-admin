"use client";

import { useIdleReady, useIdleTask } from "@/utils/idle-scheduler";
import { PersistentDOMConnector } from "@/providers/persistance/PersistentDOMConnector";
import OverlayController from "@/components/overlays/OverlayController";
import { AudioRecoveryToast } from "@/features/audio/components/AudioRecoveryToast";
import AuthSessionWatcher from "@/components/layout/AuthSessionWatcher";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import AdminFeatureProvider from "@/features/admin/AdminFeatureProvider";
import { useAppSelector } from "@/lib/redux/hooks";
import { useAppDispatch } from "@/lib/redux/hooks";
import { brokerActions } from "@/lib/redux/brokerSlice";
import { identifyUser } from "@/providers/PostHogProvider";
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

  useIdleTask("posthog-identify", 3, () => {
    if (user?.id) {
      identifyUser(user.id, { email: user.email });
    }
  });

  const ready = useIdleReady();

  if (!ready) return null;

  return (
    <>
      <PersistentDOMConnector />
      <OverlayController />
      <AudioRecoveryToast />
      <AuthSessionWatcher />
      <AnnouncementProvider />
      <AdminFeatureProvider />
    </>
  );
}
