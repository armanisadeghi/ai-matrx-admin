"use client";

/**
 * AgentAppRendererSkeleton
 *
 * Tiny loading state shown while the dynamic renderer chunk is fetched.
 * Used by the shell wrappers around `AgentAppPublicRenderer` and
 * `TemplatePreviewRenderer` so that:
 *   1. The heavy `@babel/standalone` (~5.7 MB uncompressed) is NEVER pulled
 *      into the SSR bundle for `/p/[slug]` and admin preview routes.
 *   2. The user sees a polished placeholder instead of a blank flash while
 *      the client chunk streams in.
 *
 * Mirrors the shell-pattern used by `components/MarkdownStream.tsx`.
 */
export function AgentAppRendererSkeleton() {
  return (
    <div className="flex h-full min-h-[400px] w-full items-center justify-center bg-textured p-6">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        <span className="text-xs text-muted-foreground">Loading app…</span>
      </div>
    </div>
  );
}
