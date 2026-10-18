"use client";

import MeetMatrxWindow from "@/features/onboarding/meet-matrx/MeetMatrxWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ close }: OverlayRenderProps) {
  return <MeetMatrxWindow onClose={() => close()} />;
}
