"use client";

// SidebarMenuSearch — the "Search menu" row at the top of the main nav, above
// Favorites. Expanded it reads as a search field; collapsed it is the Search
// icon with the rail tooltip. Either way it opens the same centered palette
// (MenuSearchPalette), so the narrow rail never has to host results.
//
// Typing a character while the row is focused opens the palette with that
// character already in it. ⌘/ (Ctrl+/ elsewhere) opens it from anywhere —
// ⌘K belongs to "Search your knowledge", and bare "/" to page-level search.
//
// BUILD-GRAPH: this file is shell-reachable from every route, so it imports
// only ShellIcon and React; the palette (and the admin catalog it indexes)
// loads through ONE dynamic edge, on first open.

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import dynamic from "next/dynamic";
import { useIsMounted } from "@/hooks/use-is-mounted";
import ShellIcon from "../ShellIcon";

const MenuSearchPalette = dynamic(() => import("./MenuSearchPalette"), {
  ssr: false,
  loading: () => null,
});

/** Code editors own ⌘/ (toggle comment); everywhere else — composers included — it opens the palette. */
function isCodeEditorTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(".monaco-editor, .cm-editor"));
}

export function isMenuSearchHotkey(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">): boolean {
  return (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key === "/";
}

export default function SidebarMenuSearch() {
  const mounted = useIsMounted();
  const [open, setOpen] = useState(false);
  // Each open is a fresh palette (empty query, top of the list).
  const [session, setSession] = useState(0);
  // The query lives here so keys typed on the row before the palette has focus
  // all land in it.
  const [query, setQuery] = useState("");
  const [isMac, setIsMac] = useState(true);
  // Where focus was when the palette opened; it goes back there on close.
  const returnFocus = useRef<HTMLElement | null>(null);
  // Read by key handlers that fire in one burst, before `open` re-renders.
  const openRef = useRef(false);

  const openPalette = (seed = "") => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openRef.current = true;
    setQuery(seed);
    setSession((n) => n + 1);
    setOpen(true);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    openRef.current = next;
    if (next) return;
    const target = returnFocus.current;
    returnFocus.current = null;
    // After Radix finishes its own close focus handling.
    window.setTimeout(() => {
      if (target?.isConnected) target.focus();
    }, 0);
  };

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent));
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isMenuSearchHotkey(e) || e.defaultPrevented || e.repeat) return;
      if (isCodeEditorTarget(e.target)) return;
      e.preventDefault();
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      openRef.current = true;
      setQuery("");
      setSession((n) => n + 1);
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key.length === 1 && e.key !== " " && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      // Keys typed before the palette chunk arrives (focus is still on this
      // row) extend the seed instead of restarting it.
      if (openRef.current) setQuery((q) => q + e.key);
      else openPalette(e.key);
    }
  };

  return (
    <>
      <button
        type="button"
        className="shell-nav-item shell-nav-search shell-tactile-subtle"
        title="Search menu"
        aria-label="Search menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-keyshortcuts="Meta+/ Control+/"
        onClick={() => openPalette()}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="shell-nav-icon">
          <ShellIcon name="Search" size={18} strokeWidth={1.75} />
        </span>
        <span className="shell-nav-label shell-nav-search-placeholder">Search menu</span>
        <kbd className="shell-nav-search-kbd" aria-hidden>
          {mounted ? (isMac ? "⌘/" : "Ctrl /") : null}
        </kbd>
      </button>
      {session > 0 ? (
        <MenuSearchPalette key={session} open={open} onOpenChange={onOpenChange} query={query} onQueryChange={setQuery} />
      ) : null}
    </>
  );
}
