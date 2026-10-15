import React from "react";

import { PublicHeader } from "@/components/matrx/PublicHeader";
import { PublicFooter } from "@/components/matrx/PublicFooter";
import { ShellCanvasColumn } from "@/features/canvas/host/ShellCanvasColumn";
import { Providers } from "@/app/Providers";
import { GoogleOneTapMount } from "@/features/auth/one-tap/GoogleOneTapMount";

const ONE_TAP_SKIP_PREFIXES = [
  "/unsubscribe",
  "/appointment-reminder",
  "/app_callback",
  "/l/",
  "/r/",
  "/sms",
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div data-public-layout className="flex min-h-dvh flex-col">
        <PublicHeader />
        <main data-public-main className="min-h-0 flex-1 overflow-x-hidden">
          {children}
        </main>
        <PublicFooter />
      </div>
      {/* THE canvas column — same as every layout: the public layout gives up
          --shell-canvas-w on the right, so the canvas never covers the page.
          Tab bodies load lazily per kind. */}
      <ShellCanvasColumn />
      {/* Google One Tap for signed-out visitors — marketing and shared pages alike. Links that
          answer one errand (unsubscribe, a reminder, a short link) never prompt. */}
      <GoogleOneTapMount skipPrefixes={ONE_TAP_SKIP_PREFIXES} />
    </Providers>
  );
}
