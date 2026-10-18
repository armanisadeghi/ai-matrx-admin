/**
 * A surface binding was saved or removed. The service clears its menu-agent
 * cache, but a list that is already mounted (the "Agents for this page"
 * popover, the Surface Context window) holds its rows in component state and
 * would keep showing a removed binding until reload. Every writer announces
 * here; every mounted list refreshes.
 */
import { useEffect } from "react";

const EVENT = "matrx:surface-bindings-changed";

export function announceBindingsChanged(surfaceName?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { surfaceName } }));
}

export function useOnBindingsChanged(cb: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const h = () => cb();
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, [cb]);
}
