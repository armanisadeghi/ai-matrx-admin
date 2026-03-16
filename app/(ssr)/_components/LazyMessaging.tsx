"use client";

import dynamic from "next/dynamic";

const LazyMessagingInitializer = dynamic(
  () => import("@/features/messaging/components/LazyMessagingInitializer"),
  { ssr: false, loading: () => null }
);

const LazyMessagingSideSheet = dynamic(
  () =>
    import("@/features/messaging").then((m) => m.MessagingSideSheet),
  { ssr: false, loading: () => null }
);

export function LazyMessaging() {
  return (
    <>
      <LazyMessagingInitializer />
      <LazyMessagingSideSheet />
    </>
  );
}
