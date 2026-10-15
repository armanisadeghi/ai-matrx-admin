"use client";

// VisualViewportSync — tracks the Visual Viewport API and writes two CSS
// custom properties onto <html>:
//
//   --visual-viewport-height  : current visible viewport height in px
//                               (shrinks when the virtual keyboard opens)
//   --keyboard-inset-height   : keyboard height in px (0 when closed)
//   --visual-viewport-offset-top : how far the browser panned the visible area
//                               down the page (iOS pans instead of resizing)
//
// and `data-keyboard-open` on <html> while a software keyboard covers the page.
// 🚨 THE APP FRAME FOLLOWS THE KEYBOARD (Arman, 2026-10-15): iOS Safari never
// resizes the layout viewport for its keyboard (`interactive-widget` is a
// Chrome-only hint), so the fixed `.shell-root` kept its full height and the
// keyboard covered the composer and the newest messages. While the keyboard is
// open, `styles/shell.css` pins `.shell-root` to exactly the visible area (top =
// the pan offset, height = the visible height), so every page's bottom-anchored
// composer sits right above the keyboard and its scroller keeps the newest
// content in view.
//
// These allow layout rules that need to respond to the keyboard to use pure
// CSS without JS re-renders:
//
//   height: calc(var(--visual-viewport-height, 100dvh) - var(--shell-header-h))
//
// Active on narrow OR touch-primary devices. Width alone is not sufficient:
// large tablets and vehicle browsers can expose a desktop-width layout while
// their virtual keyboard still overlays the page. Falls back to 100dvh when
// the API is unavailable (SSR, older browsers).
//
// Pattern mirrors NavActiveSync — mounts once, zero re-renders.

import { useEffect } from "react";

const VIEWPORT_TRACKING_QUERY =
  "(max-width: 1023px), (pointer: coarse), (any-pointer: coarse)";
const MIN_KEYBOARD_INSET = 80;
/** On <html> while a software keyboard covers the page (styles/shell.css). */
export const KEYBOARD_OPEN_ATTR = "data-keyboard-open";

/** Distinguish a real overlay keyboard from browser chrome and pinch zoom. */
export function calculateKeyboardInset({
  innerHeight,
  viewportHeight,
  viewportOffsetTop,
  viewportScale,
  textEntryFocused,
}: {
  innerHeight: number;
  viewportHeight: number;
  viewportOffsetTop: number;
  viewportScale: number;
  textEntryFocused: boolean;
}): number {
  const coveredBottom = Math.max(
    0,
    Math.round(innerHeight - viewportHeight - viewportOffsetTop),
  );
  return textEntryFocused &&
    viewportScale <= 1.05 &&
    coveredBottom >= MIN_KEYBOARD_INSET
    ? coveredBottom
    : 0;
}

/**
 * A software keyboard is up: a text field has focus and the visible area is
 * shorter than the layout viewport by at least a keyboard. Unlike the inset,
 * this ignores WHERE the browser panned the visible area — iOS often pans it
 * down to the focused field, which uncovers the bottom but still hides the
 * top of the frame. Either way the frame must shrink to what is visible.
 */
export function isSoftwareKeyboardOpen({
  innerHeight,
  viewportHeight,
  viewportScale,
  textEntryFocused,
}: {
  innerHeight: number;
  viewportHeight: number;
  viewportScale: number;
  textEntryFocused: boolean;
}): boolean {
  return (
    textEntryFocused &&
    viewportScale <= 1.05 &&
    innerHeight - viewportHeight >= MIN_KEYBOARD_INSET
  );
}

function isTextEntryElement(element: Element | null): boolean {
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }
  if (element instanceof HTMLInputElement) {
    return (
      !element.disabled &&
      !element.readOnly &&
      ![
        "button",
        "checkbox",
        "color",
        "file",
        "hidden",
        "image",
        "radio",
        "range",
        "reset",
        "submit",
      ].includes(element.type)
    );
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

function updateViewportVars() {
  const vv = window.visualViewport;
  if (!vv) return;

  const height = Math.round(vv.height);
  // Browser chrome and pinch zoom also change the visual viewport. Only a
  // focused text-entry control may promote that delta to "keyboard" space,
  // and the floor filters small toolbar movements.
  const textEntryFocused = isTextEntryElement(document.activeElement);
  const keyboardHeight = calculateKeyboardInset({
    innerHeight: window.innerHeight,
    viewportHeight: vv.height,
    viewportOffsetTop: vv.offsetTop,
    viewportScale: vv.scale,
    textEntryFocused,
  });
  const keyboardOpen = isSoftwareKeyboardOpen({
    innerHeight: window.innerHeight,
    viewportHeight: vv.height,
    viewportScale: vv.scale,
    textEntryFocused,
  });

  document.documentElement.style.setProperty(
    "--visual-viewport-height",
    `${height}px`,
  );
  document.documentElement.style.setProperty(
    "--keyboard-inset-height",
    `${keyboardHeight}px`,
  );
  document.documentElement.style.setProperty(
    "--visual-viewport-offset-top",
    `${Math.max(0, Math.round(vv.offsetTop))}px`,
  );
  document.documentElement.toggleAttribute(KEYBOARD_OPEN_ATTR, keyboardOpen);
}

function clearViewportVars() {
  document.documentElement.style.removeProperty("--visual-viewport-height");
  document.documentElement.style.removeProperty("--keyboard-inset-height");
  document.documentElement.style.removeProperty("--visual-viewport-offset-top");
  document.documentElement.removeAttribute(KEYBOARD_OPEN_ATTR);
}

export default function VisualViewportSync() {
  useEffect(() => {
    if (!window.visualViewport) return undefined;

    const mq = window.matchMedia(VIEWPORT_TRACKING_QUERY);
    const shouldTrack = () => mq.matches || navigator.maxTouchPoints > 0;
    if (!shouldTrack()) return undefined;

    // Initial value
    updateViewportVars();

    window.visualViewport.addEventListener("resize", updateViewportVars);
    window.visualViewport.addEventListener("scroll", updateViewportVars);

    // Also handle responsive/pointer changes (e.g. rotation or a touch display
    // being attached). Focus events reset the keyboard inset even when a
    // browser delays its visualViewport resize until after focus/blur.
    const handleMqChange = (e: MediaQueryListEvent) => {
      if (e.matches || navigator.maxTouchPoints > 0) {
        updateViewportVars();
        window.visualViewport?.addEventListener("resize", updateViewportVars);
        window.visualViewport?.addEventListener("scroll", updateViewportVars);
      } else {
        clearViewportVars();
        window.visualViewport?.removeEventListener(
          "resize",
          updateViewportVars,
        );
        window.visualViewport?.removeEventListener(
          "scroll",
          updateViewportVars,
        );
      }
    };
    mq.addEventListener("change", handleMqChange);
    document.addEventListener("focusin", updateViewportVars);
    document.addEventListener("focusout", updateViewportVars);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportVars);
      window.visualViewport?.removeEventListener("scroll", updateViewportVars);
      mq.removeEventListener("change", handleMqChange);
      document.removeEventListener("focusin", updateViewportVars);
      document.removeEventListener("focusout", updateViewportVars);
      clearViewportVars();
    };
  }, []);

  return null;
}
