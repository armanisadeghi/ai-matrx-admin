"use client";

import { ShareWithPeopleHostDialog } from "@/features/sharing/bulk/ShareWithPeopleHostDialog";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data, close }: OverlayRenderProps) {
  return <ShareWithPeopleHostDialog data={data} close={close} />;
}
