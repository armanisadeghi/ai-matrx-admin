"use client";

import dynamic from "next/dynamic";

const VoicePadWrapper = dynamic(
  () =>
    import("@/components/official-candidate/voice-pad/components/VoicePadWrapper"),
  { ssr: false },
);

export function DynamicVoicePad() {
  return <VoicePadWrapper />;
}
