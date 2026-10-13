"use client";

/**
 * THE ONE ASYNC EDGE to the artifact block-printer registry (artifact-printers.ts).
 *
 * The printers carry `@ai-matrx/print/flashcards` (KaTeX) and every structured
 * print layout; the canvas host used to import them statically, which put them
 * in the first load of every route through app/Providers.tsx. They load now:
 *   - when an artifact canvas tab's body loads (artifactKinds `load`), so a
 *     canvas Print — which must open its window inside the click — always
 *     finds its printer registered;
 *   - in the background once the page is idle (CanvasHostProvider), so a
 *     message's Print (whose lookup runs after its own awaits) finds them too.
 * Every caller shares this one promise — never add a second `import()` of the
 * printers (code-splitting skill, rule 3).
 */

let loading: Promise<void> | null = null;

export function loadArtifactPrinters(): Promise<void> {
  loading ??= import("./artifact-printers").then(
    () => undefined,
    (error: unknown) => {
      loading = null;
      console.error("[canvas] the artifact print adapters failed to load — Print falls back to printing the page as drawn", error);
      throw error;
    },
  );
  return loading;
}
