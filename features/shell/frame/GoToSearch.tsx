"use client";

// The "Go to" search icon — sits in the sidebar's top row (grid · name · search · collapse) and next
// to the grid button when the sidebar is hidden. It owns the open state and the hotkey
// (Cmd/Ctrl+Shift+K — Cmd+K is the knowledge bar's, Cmd+/ the classic menu search's) and loads the
// palette (GoToPalette: the index, the ranking, the dialog) on FIRST OPEN, never on render.
import { lazy, Suspense, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import type { GoToPaletteProps } from "./GoToPalette";

const GoToPalette = lazy(() => import("./GoToPalette"));

export type GoToSearchProps = Omit<GoToPaletteProps, "open" | "onOpenChange">;

export function isGoToHotkey(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">): boolean {
  return (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "k";
}

export function GoToSearch(props: GoToSearchProps) {
  const [open, setOpen] = useState(false);
  // Once opened the palette stays mounted (closed), so its index is built once.
  const [loaded, setLoaded] = useState(false);
  // Each open is a fresh palette (empty query).
  const [session, setSession] = useState(0);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isGoToHotkey(e) || e.defaultPrevented || e.repeat) return;
      e.preventDefault();
      setLoaded(true);
      setSession((n) => n + 1);
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="quiet"
        icon={<Search />}
        aria-label="Go to any page or feature"
        title="Go to… (⌘⇧K)"
        data-go-to-trigger=""
        onClick={() => {
          setLoaded(true);
          setSession((n) => n + 1);
          setOpen(true);
        }}
      />
      {loaded ? (
        <Suspense fallback={null}>
          <GoToPalette key={session} {...props} open={open} onOpenChange={setOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
