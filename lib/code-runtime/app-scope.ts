/**
 * The page's full scope: @ai-matrx/rich-content's one kind component scope
 * (the same scope Matrx 2 provides: motion, date-fns, markdown, Copy-for-AI)
 * with this app's twins on top (`stored-scope.ts`), plus the heavy optional
 * libraries chat code blocks may reference. Each
 * library is a literal-specifier `import()` — its own chunk, fetched only
 * when a body references it. Never an async `import("lucide-react")`.
 */
import { provideScopeModules } from "@ai-matrx/code-runtime/scope";
import { provideKindComponentScope } from "@ai-matrx/rich-content/host/kind-component-scope";
import { provideStoredComponentScopeModules, webScopeTwins } from "./stored-scope";

let provided = false;

/** Idempotent: call before any compile in the page. */
export function provideAppScopeModules(): void {
  if (provided) return;
  provided = true;
  provideKindComponentScope(webScopeTwins());
  provideStoredComponentScopeModules();
  provideScopeModules({
    "react-katex": () => import("./react-katex-scope"),
    // pdf.js needs its worker: the app's same-origin copy (`build:pdfjs-worker`), as the PDF viewer sets it.
    "react-pdf": async () => {
      const mod = await import("react-pdf");
      mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      return mod;
    },
    // A person's code imports `xlsx`: it gets the SheetJS module Alchemy's workbook engine bundles (one copy in the app).
    xlsx: async () => (await import("@ai-matrx/alchemy/operate/formats/xlsx")).loadSheetJs(),
    "@react-three/fiber": () => import("@react-three/fiber"),
    three: () => import("three"),
    lodash: () => import("lodash"),
  });
}
