/**
 * useOnDemandScopeReady — the page's half of on-demand libraries for stored
 * components that compile synchronously in render (DB kind components).
 *
 * `@ai-matrx/code-runtime` decides which documented libraries a body reaches
 * for (`pendingEntriesFor`, the ONE detector the sandbox frame uses too) and
 * starts their loads; this hook re-renders once they land. Until then the
 * caller shows its loading state instead of compiling, so a body that imports
 * `motion/react`, `date-fns`, `three`… never compiles against a scope that
 * lacks them. A library that fails to load is announced by the registry and
 * renders a marked stand-in — never a silent `undefined`.
 */
import { useEffect, useState } from "react";
import { pendingEntriesFor, prepareScopeModules } from "@ai-matrx/code-runtime/scope";
import { provideAppScopeModules } from "./app-scope";

/** The libraries `code` imports that are still loading (starts their loads). */
export function pendingOnDemandLibraries(code: string | null | undefined): string[] {
  if (!code) return [];
  provideAppScopeModules();
  return pendingEntriesFor(code);
}

/** True when every library `code` imports is loaded (always true for no code). */
export function useOnDemandScopeReady(code: string | null | undefined): boolean {
  const pending = pendingOnDemandLibraries(code);
  const key = pending.join("|");
  const [, setLoaded] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    void prepareScopeModules(key.split("|")).then(() => {
      if (live) setLoaded((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [key]);
  return pending.length === 0;
}
