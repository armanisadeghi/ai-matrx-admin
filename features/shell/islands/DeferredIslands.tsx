"use client";

import dynamic from "next/dynamic";
import { useIdleReady } from "@/utils/idle-scheduler";

const VoicePadWrapper = dynamic(
  () =>
    import("@/components/official-candidate/voice-pad/components/VoicePadWrapper"),
  { ssr: false, loading: () => null },
);

const CanvasSideSheetInner = dynamic(
  () =>
    import("@/features/canvas/core/CanvasSideSheetInner").then(
      (m) => m.CanvasSideSheetInner,
    ),
  { ssr: false, loading: () => null },
);

const LazyMessagingInitializer = dynamic(
  () => import("@/features/messaging/components/LazyMessagingInitializer"),
  { ssr: false, loading: () => null },
);

const LazyMessagingSideSheet = dynamic(
  () => import("@/features/messaging").then((m) => m.MessagingSideSheet),
  { ssr: false, loading: () => null },
);

const WindowTraySync = dynamic(
  () => import("@/features/floating-window-panel/WindowTraySync"),
  { ssr: false, loading: () => null },
);

export default function DeferredIslands() {
  const ready = useIdleReady();

  if (!ready) return null;

  return (
    <>
      <VoicePadWrapper />
      <CanvasSideSheetInner />
      <LazyMessagingInitializer />
      <LazyMessagingSideSheet />
      <WindowTraySync />
    </>
  );
}
