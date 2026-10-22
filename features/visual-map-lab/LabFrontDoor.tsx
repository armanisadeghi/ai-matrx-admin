"use client";

// features/visual-map-lab/LabFrontDoor.tsx — the lab's front door surface mount (feature-pages rule 5). A signed-in
// person is redirected to /all on the server; the layout shows the sign-in gate to guests, so this is the page's own face.

import type { ReactNode } from "react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createVisualMapLabScope, VISUAL_MAP_LAB_SURFACE_NAME } from "@/features/surfaces/manifests/visual-map-lab.manifest";

export function LabFrontDoor({ children }: { children?: ReactNode }) {
  return (
    <SurfaceRuntimeProvider surfaceName={VISUAL_MAP_LAB_SURFACE_NAME} getScope={() => createVisualMapLabScope({ lab_view: "front_door" })}>
      {children}
    </SurfaceRuntimeProvider>
  );
}
