"use client";

import WelcomeFoundWindow from "@/features/marketing/smart-add/welcome/WelcomeFoundWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ close }: OverlayRenderProps) {
  return <WelcomeFoundWindow onClose={() => close()} />;
}
