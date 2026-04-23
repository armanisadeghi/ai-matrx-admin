/**
 * Monaco Editor configuration for features/code.
 *
 * Simplified / self-contained version of
 * features/code-editor/config/monaco-config.ts. We deliberately don't pull in
 * the extra type-definitions bundle — the workspace opens files from arbitrary
 * adapters (sandbox, AWS, mock) where those global type defs would be more
 * misleading than helpful. Individual editor instances can still register
 * extra libs via `loader.init()` if a feature wants to.
 *
 * IMPORTANT: `loader.config()` MUST run before any `<Editor />` mounts. The
 * `MonacoEditor` wrapper calls `configureMonaco()` lazily on first mount.
 */

import { loader } from "@monaco-editor/react";

let configurationPromise: Promise<void> | null = null;

export function configureMonaco(): Promise<void> {
  if (configurationPromise) return configurationPromise;

  configurationPromise = (async () => {
    loader.config({
      paths: {
        vs: "https://cdn.jsdelivr.net/npm/monaco-editor@latest/min/vs",
      },
    });

    const monaco = await loader.init();

    // ── TypeScript / JavaScript baseline ────────────────────────────────────
    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    const jsDefaults = monaco.languages.typescript.javascriptDefaults;

    const baseCompilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.Preserve,
      reactNamespace: "React",
      allowJs: true,
      checkJs: false,
      typeRoots: ["node_modules/@types"],
    };

    tsDefaults.setCompilerOptions(baseCompilerOptions);
    jsDefaults.setCompilerOptions(baseCompilerOptions);

    // Quieter diagnostics — for an arbitrary-file editor it's noisier than helpful.
    tsDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });
    jsDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
      noSuggestionDiagnostics: true,
    });

    tsDefaults.setEagerModelSync(true);
    jsDefaults.setEagerModelSync(true);

    // ── JSON ────────────────────────────────────────────────────────────────
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      schemas: [],
      enableSchemaRequest: true,
    });
  })();

  return configurationPromise;
}
