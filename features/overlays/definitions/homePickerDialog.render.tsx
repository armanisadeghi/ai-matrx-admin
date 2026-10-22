"use client";

import { HomePickerHostDialog } from "@/features/scopes/homes/HomePickerHostDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  return <HomePickerHostDialog data={data} close={close} />;
}
