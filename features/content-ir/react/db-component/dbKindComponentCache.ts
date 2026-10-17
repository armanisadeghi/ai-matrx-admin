/**
 * dbKindComponentCache — this app's HOST HALF of the database-component compiler.
 *
 * The cache and the renderer are `@ai-matrx/rich-content`'s (kinds/db-component): one compile
 * cache per page, bound to the host's `dbKindComponent` capability. What stays here is genuinely
 * ours, injection only:
 *  - THE compiler, `@ai-matrx/code-runtime`'s `kindComponentCompiler` (dangerous-global stubs ON:
 *    every body here was authored by an organization), over the app's scope modules
 *    (`lib/code-runtime/app-scope`), with unresolved imports filed by row (`captureUnresolvedImports`);
 *  - the default scope (`defaultComponentEntries`) and the on-demand library loader.
 * This module statically imports Babel (through code-runtime), so it is reached only from the lazy
 * DbKindComponentImpl chunk (DbKindComponent.tsx) and authoring surfaces, never the main bundle.
 *
 * The historical export names are kept (re-exports of the package) so every call site reads the same.
 */
import { kindComponentCompiler } from "@ai-matrx/code-runtime";
import { defaultComponentEntries, prepareScopeModules } from "@ai-matrx/code-runtime/scope";
import { configureRichContent, hostCapability } from "@ai-matrx/rich-content/host";
import type { RichContentDbKindComponentHost } from "@ai-matrx/rich-content/host/types";
import { provideAppScopeModules } from "@/lib/code-runtime/app-scope";
import { pendingOnDemandLibraries } from "@/lib/code-runtime/useOnDemandScope";
import { captureUnresolvedImports } from "@/lib/diagnostics/captureUnresolvedImports";

export {
  applyPropsTransform,
  getOrCompileDbKindComponent,
  invalidateDbKindComponent,
  isDbKindComponentBodyPending,
  kindComponentConfig,
  type CompiledDbKindComponent,
  type DbKindCompileResult,
  type DbKindComponentRenderProps,
  type KindComponentUiOptions,
  type ResolveKindValue,
} from "@ai-matrx/rich-content/kinds/db-component/db-kind-component-cache";

/** The row being compiled (the package passes it per compile); unresolved imports are filed under it. */
let compilingOrigin = "kind-component";

provideAppScopeModules();

const compiler = kindComponentCompiler({
  origin: () => compilingOrigin,
  onUnresolved: captureUnresolvedImports,
});

/** The compiler half of this app's `dbKindComponent` capability (DbKindComponentImpl adds the frame). */
export const webDbKindComponentCompiler: Pick<
  RichContentDbKindComponentHost,
  "compile" | "defaultAllowedImports" | "pendingLibraries" | "prepareLibraries"
> = {
  compile: ({ code, allowedImports, origin }) => {
    const previous = compilingOrigin;
    compilingOrigin = origin;
    try {
      return compiler({ code, allowedImports });
    } finally {
      compilingOrigin = previous;
    }
  },
  defaultAllowedImports: defaultComponentEntries,
  pendingLibraries: pendingOnDemandLibraries,
  prepareLibraries: (names) => prepareScopeModules(names),
};

// A compile reached before the renderer chunk registered the full host still has its compiler.
if (!hostCapability("dbKindComponent")) configureRichContent({ dbKindComponent: webDbKindComponentCompiler });
