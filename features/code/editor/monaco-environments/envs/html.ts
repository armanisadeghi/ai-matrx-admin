import type { MonacoEnvironmentDescriptor } from "../types";

/**
 * HTML / JSON pages environment. Tabs whose Monaco language id is
 * `html` or `json` get the env. We don't register TypeScript libs here;
 * we set JSON diagnostics to validate against any schemas registered
 * via `monaco.languages.json.jsonDefaults.setDiagnosticsOptions`.
 *
 * Currently the env carries no JSON schemas of its own — the registry
 * in `monaco-config.ts` keeps schemas empty by default — but it is the
 * single point where we'd hang any future schema registration (e.g.
 * for our `tool_ui_components.config_schema_json` rows).
 */
export const HTML_ENVIRONMENT: MonacoEnvironmentDescriptor = {
  id: "html",
  label: "HTML / JSON",
  description: "Lightweight env for HTML pages and JSON config tabs.",
  applies: (tab) => tab.language === "html" || tab.language === "json",
  // No TS-specific overrides; HTML/JSON live outside of TypeScript's
  // diagnostics pipeline.
  libs: async () => [],
};
