import type { EditorFile } from "../../types";

/**
 * Minimal shape of the global `monaco` namespace that the environment
 * machinery actually needs. Keeping this loose lets us avoid pulling in
 * `monaco-editor` as a hard type dep — `@monaco-editor/react` doesn't
 * re-export the namespace types, and the upstream `monaco-editor` package
 * is heavy.
 */
export interface MonacoNamespaceLike {
  languages: {
    typescript: {
      typescriptDefaults: MonacoTsLikeDefaults;
      javascriptDefaults: MonacoTsLikeDefaults;
      ScriptTarget: Record<string, number>;
      ModuleKind: Record<string, number>;
      ModuleResolutionKind: Record<string, number>;
      JsxEmit: Record<string, number>;
    };
    json: {
      jsonDefaults: {
        setDiagnosticsOptions: (opts: Record<string, unknown>) => void;
      };
    };
  };
}

export interface MonacoTsLikeDefaults {
  addExtraLib: (content: string, filePath?: string) => MonacoDisposable;
  setCompilerOptions: (opts: Record<string, unknown>) => void;
  setDiagnosticsOptions: (opts: Record<string, unknown>) => void;
  getCompilerOptions?: () => Record<string, unknown>;
}

export interface MonacoDisposable {
  dispose: () => void;
}

export interface MonacoEnvironmentLib {
  /**
   * Fully qualified Monaco file path used as the key for `addExtraLib`.
   * Two environments registering the same path will collide — keep them
   * namespaced under `file:///node_modules/@types/<envId>/...`.
   */
  filePath: string;
  /** The `.d.ts` (or `.ts`) source as a plain string. */
  content: string;
}

export interface MonacoEnvironmentDescriptor {
  /** Stable, unique id (e.g. `prompt-app`, `aga-app`). */
  id: string;
  /** Human label surfaced in the status bar / settings UI. */
  label: string;
  /** Short description used in the settings UI. */
  description?: string;
  /**
   * Returns true when this environment should be activated for the given
   * tab. The first matching environment wins; envs are evaluated in
   * registration order, so register the more specific ones first.
   */
  applies: (tab: EditorFile) => boolean;
  /**
   * Optional compiler-option overrides applied for as long as this env is
   * active. The previous values are snapshotted on activate and restored
   * on full deactivate so we never permanently mutate Monaco's defaults.
   */
  compilerOptions?: Record<string, unknown>;
  /**
   * Diagnostics-options overrides (e.g. `noSemanticValidation`). Same
   * activate/restore semantics as `compilerOptions`.
   */
  diagnosticsOptions?: Record<string, unknown>;
  /**
   * Lazily loads the `.d.ts` libs. Called the first time this env is
   * activated; results are cached. Returning an empty array is fine for
   * envs that only override compiler options.
   */
  libs: () => Promise<MonacoEnvironmentLib[]>;
  /**
   * Optional JSX runtime setting. When omitted, the env inherits the
   * baseline configured in `monaco-config.ts`.
   */
  jsxRuntime?: "preserve" | "react" | "react-jsx" | "react-jsxdev";
}
