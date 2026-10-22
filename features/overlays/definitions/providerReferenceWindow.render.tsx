"use client";

import ProviderReferenceModal from "@/features/ai-models/components/ProviderReferenceModal";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ close }: OverlayRenderProps) {
  return <ProviderReferenceModal onClose={() => close()} />;
}
