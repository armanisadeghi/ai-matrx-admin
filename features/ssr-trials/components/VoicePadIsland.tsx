"use client";

import dynamic from "next/dynamic";

const VoicePadWrapper = dynamic(
  () => import("@/features/voice-pad/components/VoicePadWrapper"),
  { ssr: false, loading: () => null },
);

export default function VoicePadIsland() {
  return <VoicePadWrapper />;
}
