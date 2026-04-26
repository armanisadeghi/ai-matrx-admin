import type { MonacoEnvironmentDescriptor } from "../types";

const PROMPT_APP_PREFIX = "prompt-app:";

/**
 * Prompt App environment — React 19 + Lucide + ShadCN UI ambients.
 * Activates for any tab whose id starts with `prompt-app:`.
 *
 * The actual `.d.ts` strings live in `features/code-editor/config/type-definitions.ts`
 * (already curated for the legacy editor). We import them lazily so the
 * baseline workspace bundle doesn't pay for them on first paint.
 */
export const PROMPT_APP_ENVIRONMENT: MonacoEnvironmentDescriptor = {
  id: "prompt-app",
  label: "Prompt App",
  description:
    "React 19 + Lucide + ShadCN UI ambients for `prompt_apps.component_code`.",
  applies: (tab) => tab.id.startsWith(PROMPT_APP_PREFIX),
  jsxRuntime: "preserve",
  compilerOptions: {
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
  },
  diagnosticsOptions: {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  },
  libs: async () => {
    const mod = await import("@/features/code-editor/config/type-definitions");
    return [
      {
        filePath: "file:///node_modules/@types/prompt-app/react/index.d.ts",
        content: mod.reactTypes,
      },
      {
        filePath:
          "file:///node_modules/@types/prompt-app/lucide-react/index.d.ts",
        content: mod.lucideReactTypes,
      },
      {
        filePath:
          "file:///node_modules/@types/prompt-app/ui-components/index.d.ts",
        content: mod.uiComponentTypes,
      },
      {
        filePath:
          "file:///node_modules/@types/prompt-app/custom-components/index.d.ts",
        content: mod.customComponentTypes,
      },
    ];
  },
};
