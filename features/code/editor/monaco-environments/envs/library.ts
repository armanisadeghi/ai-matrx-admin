import type { MonacoEnvironmentDescriptor } from "../types";

const LIBRARY_PREFIX = "library:";

/**
 * `code_files` (My Files) baseline — minimal ambient surface, opt-in
 * extras only. Library files are arbitrary user-authored code; we don't
 * want to fabricate React/Lucide types into a pure utility script.
 *
 * The env still applies sane TS compiler options (esModuleInterop, etc.)
 * so module imports don't show spurious errors, but it deliberately
 * registers no `extraLib`s.
 */
export const LIBRARY_ENVIRONMENT: MonacoEnvironmentDescriptor = {
  id: "library",
  label: "Library",
  description: "Minimal env for `code_files` rows — sane TS, no ambients.",
  applies: (tab) => tab.id.startsWith(LIBRARY_PREFIX),
  jsxRuntime: "preserve",
  compilerOptions: {
    strict: false,
    noImplicitAny: false,
    strictNullChecks: false,
    allowJs: true,
    checkJs: false,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
  },
  diagnosticsOptions: {
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  },
  libs: async () => [],
};
