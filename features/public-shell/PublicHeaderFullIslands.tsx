"use client";

// The header's Redux islands, as they were before the light tier (feedback, theme, canvas, account).
// Reached only through PublicFullProvidersImpl.

import { Suspense } from "react";
import { CanvasToggle } from "@ai-matrx/canvas/react";
import { PublicHeaderAuth } from "@/components/matrx/PublicHeaderAuth";
import { PublicHeaderFeedback } from "@/components/matrx/PublicHeaderFeedback";
import { PublicHeaderThemeToggle } from "@/components/matrx/PublicHeaderThemeToggle";
import { PUBLIC_HEADER_ICON_BUTTON } from "@/components/matrx/publicHeaderChrome";

export function PublicHeaderFullIslands() {
  return (
    <>
      <Suspense fallback={null}>
        <PublicHeaderFeedback />
      </Suspense>
      <Suspense fallback={<div className={PUBLIC_HEADER_ICON_BUTTON} aria-hidden="true" />}>
        <PublicHeaderThemeToggle />
      </Suspense>
      <CanvasToggle />
      <Suspense fallback={<span aria-hidden="true" className={PUBLIC_HEADER_ICON_BUTTON} />}>
        <PublicHeaderAuth />
      </Suspense>
    </>
  );
}
