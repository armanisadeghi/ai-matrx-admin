"use client";

import { TagPickerHostDialog } from "@/features/knowledge/hub/tags/TagPickerHostDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  return <TagPickerHostDialog data={data} close={close} />;
}
