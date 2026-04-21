"use client";

import { Sun, Moon } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { toggleMode } from "@/styles/themes/themeSlice";
import { MENU_ITEM_CLASS } from "./menuItemClass";

/**
 * Theme toggle menu entry. Dispatches `toggleMode()` — the sync engine handles
 * broadcast (cross-tab in <20ms), persistence (`matrx:theme`), and pre-paint
 * class/attribute updates. No direct DOM, cookie, or localStorage writes here
 * (PR 1.B: consumers stopped racing with the engine for the `theme` key).
 */
export function ThemeToggleMenuItem() {
  const dispatch = useAppDispatch();
  const isDark = useAppSelector((s) => s.theme.mode === "dark");

  return (
    <label htmlFor="shell-user-menu" className="block">
      <button
        className={MENU_ITEM_CLASS}
        onClick={() => dispatch(toggleMode())}
      >
        {isDark ? <Sun /> : <Moon />}
        {isDark ? "Light Mode" : "Dark Mode"}
      </button>
    </label>
  );
}
