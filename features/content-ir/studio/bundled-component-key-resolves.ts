/**
 * Does a built-in (`source: "bundled"`) component key actually draw in this
 * app build? The ONE answer for the status strip's "broken reference" line.
 *
 * SHAPES-BUGS 3.2 (live 2026-10-14, `json`): the strip asked only the
 * package's block-dispatch table, which this app fills at runtime from
 * `features/rich-content-host/domain-block-dispatch.tsx` (`value_result` and
 * every other domain block live there). Asked before that module loaded, it
 * answered "missing" — so the strip said "broken reference" directly above
 * the same `value_result` component drawing the record. The check now loads
 * the host registration first, and also counts the unified artifact stage
 * (BlockRenderer draws a standalone artifact type before it ever reaches the
 * dispatch table).
 *
 * Lazy by design: both modules pull the render tree, so an always-rendered
 * strip must never import them at the top level.
 */
export async function bundledComponentKeyResolves(componentKey: string): Promise<boolean> {
  const [{ resolveBlockDispatch }, , { resolveArtifactDef }] = await Promise.all([
    import("@ai-matrx/rich-content/display/chat-markdown/block-registry/block-dispatch"),
    import("@/features/rich-content-host/domain-block-dispatch"),
    import("@/features/canvas/artifact-types/artifact-type-registry"),
  ]);
  return (
    resolveBlockDispatch(componentKey) !== null ||
    resolveArtifactDef(componentKey) !== null
  );
}
