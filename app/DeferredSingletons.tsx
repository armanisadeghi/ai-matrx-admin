"use client";

// `DeferredSingletons` mounts inside `app/Providers.tsx` and only renders
// after `useIdleReady()` resolves true (post page-idle). It is a thin
// client-component wrapper — every leaf widget below is responsible for
// dynamic-loading its own heavy body internally. Wrapping leaf widgets
// in `next/dynamic` from THIS file is the wrong layer (every consumer of
// the widget would have to repeat the dance) and, when the parent is a
// Server Component, is invalid. The right pattern lives in each leaf
// widget's own file: a tiny `"use client"` shell that `dynamic()`s an
// `*Impl.tsx` sibling with the heavy body.
//
// Build-time rule: this file is in the static dep graph of every
// authenticated route, so every static import here is parsed for every
// page entry. Keep it minimal:
//   - Type-only imports use `import type` (erased at compile).
//   - Never import from a barrel `index.ts` — go to the source file.
//   - Anything used only inside an idle callback must be `await import()`
//     inside that callback so its module is not in this file's static
//     graph at all (`brokerActions`, `fetchFullContext` below).

import { useIdleReady, useIdleTask } from "@/utils/idle-scheduler";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUser } from "@/lib/redux/selectors/userSelectors";
import { PersistentDOMConnector } from "@/providers/persistance/PersistentDOMConnector";
import UnifiedOverlayController from "@/features/window-panels/UnifiedOverlayController";
import LegacyPromptOverlaysController from "@/features/prompts/components/results-display/LegacyPromptOverlaysController";
import { AudioRecoveryToast } from "@/features/audio/components/AudioRecoveryToast";
import AuthSessionWatcher from "@/components/layout/AuthSessionWatcher";
import AnnouncementProvider from "@/components/layout/AnnouncementProvider";
import AdminFeatureProvider from "@/features/admin/AdminFeatureProvider";

// ─── Static system broker descriptors (data only) ─────────────────────────

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

  // Broker registration + initial values. The broker slice (and its
  // reducer barrel) is part of the root reducer's compile unit anyway,
  // so lazy-importing here keeps it out of *this* entry's static graph
  // without adding meaningful runtime cost.
  // Note the direct `/slice` path — `@/lib/redux/brokerSlice` is a
  // barrel-of-barrels (re-exports selectors/hooks/thunks/utils) and must
  // not be used in this file's compile graph.
  useIdleTask("broker-registration", 5, async () => {
    const { brokerActions } = await import("@/lib/redux/brokerSlice/slice");
    dispatch(brokerActions.addOrUpdateRegisterEntries(SYSTEM_BROKERS));
  });

  useIdleTask("broker-values", 5, async () => {
    if (!user?.id) return;
    const { brokerActions } = await import("@/lib/redux/brokerSlice/slice");

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

  // Pre-warm the full hierarchy (orgs, projects, tasks, scopes) once per
  // session. `fetchFullContext()` is idempotent — it short-circuits if
  // data is already loading or loaded. Lazy-imported so the thunk's dep
  // graph (supabase client, 5 hierarchy/scope slice action creators,
  // error utils) stays out of this file's per-entry compile graph.
  useIdleTask("fetch-full-context", 1, async () => {
    if (!user?.id) return;
    const { fetchFullContext } =
      await import("@/features/agent-context/redux/hierarchyThunks");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch(fetchFullContext() as any);
  });

  const ready = useIdleReady();

  if (!ready) return null;

  return (
    <>
      <PersistentDOMConnector />
      <UnifiedOverlayController />
      <LegacyPromptOverlaysController />
      <AudioRecoveryToast />
      <AuthSessionWatcher />
      <AnnouncementProvider />
      <AdminFeatureProvider />
    </>
  );
}
