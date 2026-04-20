"use client";

import dynamic from "next/dynamic";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOpenInstances } from "@/lib/redux/slices/overlaySlice";

const VoicePad = dynamic(() => import("./VoicePad"), { ssr: false });
const VoicePadAdvanced = dynamic(() => import("./VoicePadAdvanced"), {
  ssr: false,
});
const VoicePadAi = dynamic(() => import("./VoicePadAi"), { ssr: false });

export default function VoicePadWrapper() {
  const simpleInstances = useAppSelector((s) =>
    selectOpenInstances(s, "voicePad"),
  );
  const advancedInstances = useAppSelector((s) =>
    selectOpenInstances(s, "voicePadAdvanced"),
  );
  const aiInstances = useAppSelector((s) =>
    selectOpenInstances(s, "voicePadAi"),
  );

  return (
    <>
      {simpleInstances.map(({ instanceId }) => (
        <VoicePad key={`voicePad:${instanceId}`} instanceId={instanceId} />
      ))}
      {advancedInstances.map(({ instanceId }) => (
        <VoicePadAdvanced
          key={`voicePadAdvanced:${instanceId}`}
          instanceId={instanceId}
        />
      ))}
      {aiInstances.map(({ instanceId }) => (
        <VoicePadAi key={`voicePadAi:${instanceId}`} instanceId={instanceId} />
      ))}
    </>
  );
}
