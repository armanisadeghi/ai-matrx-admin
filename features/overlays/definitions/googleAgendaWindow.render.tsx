"use client";

import { readGoogleAgendaWindowLaunchData } from "@/features/google-workspace/calendar/window-types";
import GoogleAgendaWindow from "@/features/window-panels/windows/google-calendar/GoogleAgendaWindow";
import type { OverlayRenderProps } from "@ai-matrx/summon/react";

export default function OverlayRender({ data: overlayData, instanceId, close }: OverlayRenderProps) {

        if (!true) return null;
        const data = readGoogleAgendaWindowLaunchData(overlayData);
        return (
          <GoogleAgendaWindow
            initialView={data?.initialView}
            isOpen
            onClose={() => close()}
          />
        );
}
