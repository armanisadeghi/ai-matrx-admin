import type {
  MonacoDisposable,
  MonacoEnvironmentDescriptor,
  MonacoEnvironmentLib,
  MonacoNamespaceLike,
} from "./types";
import type { EditorFile } from "../../types";

const ENVIRONMENTS: MonacoEnvironmentDescriptor[] = [];
const ENV_BY_ID = new Map<string, MonacoEnvironmentDescriptor>();

interface ActivationState {
  count: number;
  /** Resolved + cached lib contents; populated on first activate. */
  libs: MonacoEnvironmentLib[] | null;
  /** Disposables we created via `addExtraLib`. */
  disposables: MonacoDisposable[];
  /** Snapshot of compilerOptions before this env applied its overrides. */
  prevCompilerOptions: Record<string, unknown> | null;
  /** Snapshot of diagnosticsOptions (what we know of) before override. */
  prevDiagnosticsOptions: Record<string, unknown> | null;
}

const ACTIVATIONS = new Map<string, ActivationState>();

let baselineSnapshot: {
  compilerOptions?: Record<string, unknown>;
  diagnosticsOptions?: Record<string, unknown>;
} | null = null;

/**
 * Register a Monaco environment. Order matters — the first env whose
 * `applies(tab)` returns true wins, so register more specific environments
 * (e.g. `prompt-app`) before catch-all ones (e.g. `library`).
 */
export function registerMonacoEnvironment(
  descriptor: MonacoEnvironmentDescriptor,
): void {
  if (ENV_BY_ID.has(descriptor.id)) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[monaco-environments] re-registering env "${descriptor.id}"`,
      );
    }
    const existing = ENV_BY_ID.get(descriptor.id);
    if (existing) {
      const idx = ENVIRONMENTS.indexOf(existing);
      if (idx >= 0) ENVIRONMENTS.splice(idx, 1);
    }
  }
  ENVIRONMENTS.push(descriptor);
  ENV_BY_ID.set(descriptor.id, descriptor);
}

export function listMonacoEnvironments(): MonacoEnvironmentDescriptor[] {
  return ENVIRONMENTS.slice();
}

export function getMonacoEnvironment(
  id: string,
): MonacoEnvironmentDescriptor | undefined {
  return ENV_BY_ID.get(id);
}

/**
 * Resolve the environment that should activate for the given editor tab.
 * Returns the descriptor or `null` if no env applies (Monaco baseline only).
 */
export function resolveEnvironmentForTab(
  tab: EditorFile | null | undefined,
): MonacoEnvironmentDescriptor | null {
  if (!tab) return null;
  for (const env of ENVIRONMENTS) {
    try {
      if (env.applies(tab)) return env;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
          `[monaco-environments] env "${env.id}" applies() threw — skipping`,
          err,
        );
      }
    }
  }
  return null;
}

function captureBaseline(monaco: MonacoNamespaceLike) {
  if (baselineSnapshot) return;
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  baselineSnapshot = {
    compilerOptions: tsDefaults.getCompilerOptions
      ? { ...tsDefaults.getCompilerOptions() }
      : undefined,
  };
}

function applyToBoth(
  monaco: MonacoNamespaceLike,
  fn: (
    defaults: MonacoNamespaceLike["languages"]["typescript"]["typescriptDefaults"],
  ) => void,
) {
  fn(monaco.languages.typescript.typescriptDefaults);
  fn(monaco.languages.typescript.javascriptDefaults);
}

/**
 * Activate (or refcount-increment) the environment with the given id.
 * Idempotent — safe to call multiple times for the same env. The first
 * call fetches and registers the env's libs; subsequent calls just bump
 * the count.
 */
export async function activateEnvironment(
  monaco: MonacoNamespaceLike,
  envId: string,
): Promise<void> {
  const env = ENV_BY_ID.get(envId);
  if (!env) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[monaco-environments] unknown env "${envId}"`);
    }
    return;
  }
  captureBaseline(monaco);
  let state = ACTIVATIONS.get(envId);
  if (state) {
    state.count += 1;
    return;
  }
  state = {
    count: 1,
    libs: null,
    disposables: [],
    prevCompilerOptions: null,
    prevDiagnosticsOptions: null,
  };
  ACTIVATIONS.set(envId, state);

  try {
    state.libs = await env.libs();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(
        `[monaco-environments] failed to load libs for env "${envId}"`,
        err,
      );
    }
    state.libs = [];
  }

  for (const lib of state.libs) {
    applyToBoth(monaco, (defaults) => {
      const disposable = defaults.addExtraLib(lib.content, lib.filePath);
      state!.disposables.push(disposable);
    });
  }
}

/**
 * Decrement (and possibly tear down) the environment with the given id.
 * The libs are disposed only when the count reaches zero — so opening
 * two prompt-app tabs and closing one keeps the env warm.
 */
export function deactivateEnvironment(
  monaco: MonacoNamespaceLike,
  envId: string,
): void {
  const state = ACTIVATIONS.get(envId);
  if (!state) return;
  state.count -= 1;
  if (state.count > 0) return;
  for (const d of state.disposables) {
    try {
      d.dispose();
    } catch {
      /* swallow — Monaco occasionally double-disposes */
    }
  }
  ACTIVATIONS.delete(envId);
  // Compiler/diagnostics overrides are managed by `applyEnvironmentOptions`
  // (per-active-env, not refcounted) — nothing to restore here.
  void monaco;
}

/**
 * Apply the env's `compilerOptions` / `diagnosticsOptions`. Unlike libs
 * (which stack additively), only one env's options are active at a time —
 * this is called when the active editor tab switches to a different env.
 *
 * Pass `null` to restore the baseline that was captured the first time
 * any env was activated.
 */
export function applyEnvironmentOptions(
  monaco: MonacoNamespaceLike,
  env: MonacoEnvironmentDescriptor | null,
): void {
  captureBaseline(monaco);
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;
  const baseCompilerOptions = baselineSnapshot?.compilerOptions ?? {};

  const merged: Record<string, unknown> = { ...baseCompilerOptions };
  if (env?.compilerOptions) Object.assign(merged, env.compilerOptions);
  if (env?.jsxRuntime) {
    const jsxMap: Record<string, string> = {
      preserve: "Preserve",
      react: "React",
      "react-jsx": "ReactJSX",
      "react-jsxdev": "ReactJSXDev",
    };
    const key = jsxMap[env.jsxRuntime] ?? "Preserve";
    const jsxValue = monaco.languages.typescript.JsxEmit[key];
    if (typeof jsxValue === "number") merged.jsx = jsxValue;
  }

  tsDefaults.setCompilerOptions(merged);
  jsDefaults.setCompilerOptions(merged);

  if (env?.diagnosticsOptions) {
    tsDefaults.setDiagnosticsOptions(env.diagnosticsOptions);
    jsDefaults.setDiagnosticsOptions(env.diagnosticsOptions);
  }
}

/**
 * Test-only helper to clear the registry between unit tests. No-op in
 * production builds.
 */
export function __resetMonacoEnvironmentsForTests(): void {
  ENVIRONMENTS.length = 0;
  ENV_BY_ID.clear();
  ACTIVATIONS.clear();
  baselineSnapshot = null;
}
