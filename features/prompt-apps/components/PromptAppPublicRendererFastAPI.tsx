"use client";

/**
 * PromptAppPublicRendererFastAPI (shell)
 *
 * Lightweight client-only wrapper around `PromptAppPublicRendererFastAPIImpl`.
 * The impl statically imports `@babel/standalone` (~5.7 MB uncompressed); this
 * shell keeps that heavy module out of the SSR bundle for `/p/[slug]` and
 * defers it to a client-only chunk that loads when this renderer mounts.
 *
 * NOTE: This entire prompt-apps subsystem is scheduled for removal in
 * migration phases 16-19 (see `features/agents/migration/`). When that
 * happens, delete both this shell AND the `*Impl` file.
 *
 * See `features/agent-apps/components/AgentAppPublicRenderer.tsx` for the
 * full rationale; this is the same pattern, sans skeleton (legacy code).
 */

import dynamic from "next/dynamic";

export const PromptAppPublicRendererFastAPI = dynamic(
  () =>
    import("./PromptAppPublicRendererFastAPIImpl").then((m) => ({
      default: m.PromptAppPublicRendererFastAPI,
    })),
  { ssr: false },
);
