"use client";

import dynamic from "next/dynamic";

// Dev-only island — zero production bundle cost.
// dynamic() with ssr:false must live in a Client Component.
const DevPerfOverlay =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./DevPerfOverlay"), { ssr: false })
    : () => null;

interface DevPerfOverlayIslandProps {
  show?: boolean;
}

export default function DevPerfOverlayIsland({ show = false }: DevPerfOverlayIslandProps) {
  if (!show) return null;
  return <DevPerfOverlay />;
}
