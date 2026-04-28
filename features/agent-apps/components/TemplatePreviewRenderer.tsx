"use client";

/**
 * TemplatePreviewRenderer (shell)
 *
 * Lightweight client-only wrapper around `TemplatePreviewRendererImpl`. The
 * impl statically imports `@babel/standalone` (~5.7 MB uncompressed) for
 * runtime JSX compilation; this shell ensures that heavy module is NEVER
 * pulled into the server bundle and only loads on the client when the
 * preview is actually rendered.
 *
 * See `AgentAppPublicRenderer.tsx` for the rationale; same pattern.
 */

import dynamic from "next/dynamic";
import { AgentAppRendererSkeleton } from "./AgentAppRendererSkeleton";

export const TemplatePreviewRenderer = dynamic(
  () =>
    import("./TemplatePreviewRendererImpl").then((m) => ({
      default: m.TemplatePreviewRenderer,
    })),
  {
    ssr: false,
    loading: () => <AgentAppRendererSkeleton />,
  },
);
