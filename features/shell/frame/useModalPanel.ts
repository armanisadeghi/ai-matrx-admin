"use client";

// THE FOCUS CONTRACT for a panel that covers part of the frame (the drawer, the
// phone companion): focus moves in when it opens, Tab stays inside, Esc closes it
// from anywhere (unless a popover is open and takes Esc first), and focus returns
// to the control that opened it. The caller makes whatever is behind it inert.
import { useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalPanel({
  open,
  panelRef,
  onClose,
  root,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  root: HTMLElement | null;
}) {
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
      if (!openerRef.current && document.activeElement instanceof HTMLElement) {
        openerRef.current = document.activeElement;
      }
      // After the frame's own commit and any menu's focus return: an inert subtree refuses focus.
      requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus());
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      const opener = openerRef.current;
      openerRef.current = null;
      requestAnimationFrame(() => {
        // The opener may have been a menu item that no longer exists: fall back to the header's first control.
        if (opener?.isConnected && !opener.closest("[inert]")) opener.focus();
        else root?.querySelector<HTMLElement>("header button")?.focus();
      });
    }
  }, [open, panelRef, root]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (root?.querySelector("[data-radix-popper-content-wrapper]")) return;
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, root]);

  /** Call before opening, so focus can return to the control that asked (or to `el`, e.g. a menu's trigger). */
  function rememberOpener(el?: HTMLElement | null) {
    openerRef.current = el ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  }

  /** Tab stays inside the panel. A portalled popover handles its own Tab. */
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const panel = panelRef.current;
    if (e.key !== "Tab" || !panel || !panel.contains(e.target as Node)) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return { rememberOpener, onKeyDown };
}
