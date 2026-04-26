"use client";

/**
 * PopoutContext — exposes the popout `Document` / `Window` / portal target
 * to descendants of a popped-out subtree.
 *
 * The default value (`popoutDocument: null`, etc.) means "I'm rendered in
 * the parent document." Descendants that need to behave differently inside
 * a popout (e.g. Radix portals retargeting their content) call
 * `usePopout()` and branch on the values.
 *
 * **Architectural note:** because `createPortal` preserves the parent
 * React tree, every ancestor `Provider` cascades into the popout — Redux,
 * Theme, Tooltip, Router, all work without re-wrapping. This context is
 * for the *opposite* direction: telling popped-out content "you're inside
 * a popout window, here's the document/window/container you should use
 * instead of the global `document`/`window`."
 */
import { createContext, useContext } from "react";

export type PopoutMode = "pip" | "popup";

export interface PopoutContextValue {
  /**
   * The popout `Document`. `null` when this subtree is rendered in the
   * parent (the default).
   */
  popoutDocument: Document | null;
  /**
   * The popout `Window`. `null` when this subtree is rendered in the parent.
   * Use for `addEventListener`, `matchMedia`, `innerWidth`, etc., when the
   * popout-scoped answer is what you need.
   */
  popoutWindow: Window | null;
  /**
   * Element to use as the Radix `Portal.container` prop so floating UI
   * (tooltips, popovers, dropdowns) renders inside the popout instead of
   * the parent `document.body`. Returns `null` outside a popout —
   * `usePopoutContainer` coerces this to `undefined` so Radix falls back
   * to its default container automatically.
   */
  popoutContainer: HTMLElement | null;
  /**
   * Which popout mechanism is in use. `null` outside a popout.
   * Currently only used for diagnostics; downstream components may branch
   * on it later (e.g. show different chrome for `popup` vs `pip`).
   */
  mode: PopoutMode | null;
}

const DEFAULT_VALUE: PopoutContextValue = {
  popoutDocument: null,
  popoutWindow: null,
  popoutContainer: null,
  mode: null,
};

export const PopoutContext =
  createContext<PopoutContextValue>(DEFAULT_VALUE);

/** Read the current popout context. Always defined — never throws. */
export function usePopout(): PopoutContextValue {
  return useContext(PopoutContext);
}
