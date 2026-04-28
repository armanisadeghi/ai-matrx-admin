"use client";

/**
 * AgentAppPublicRenderer (shell)
 *
 * Lightweight client-only wrapper around `AgentAppPublicRendererImpl`. The
 * impl statically imports `@babel/standalone` (~5.7 MB uncompressed), which
 * we must keep out of the SSR bundle. Wrapping with `dynamic({ ssr: false })`
 * means:
 *   - The impl module + all its transitive deps (including babel) are split
 *     into a client-only chunk that downloads ONLY when this component is
 *     actually rendered in the browser.
 *   - The server renders nothing for this island (literally `null`), so the
 *     `/p/[slug]` route's HTML stays small and fast, and Vercel's build
 *     never has to bundle babel into a server chunk.
 *
 * Mirrors the pattern in `components/MarkdownStream.tsx`. All consumers
 * import this exactly as before:
 *   import { AgentAppPublicRenderer } from "@/features/agent-apps/components/AgentAppPublicRenderer"
 */

import dynamic from "next/dynamic";
import { AgentAppRendererSkeleton } from "./AgentAppRendererSkeleton";

export const AgentAppPublicRenderer = dynamic(
  () =>
    import("./AgentAppPublicRendererImpl").then((m) => ({
      default: m.AgentAppPublicRenderer,
    })),
  {
    ssr: false,
    loading: () => <AgentAppRendererSkeleton />,
  },
);
