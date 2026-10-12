/**
 * The editor chrome's command model — ONE data tree per editor that the menu
 * bar, the "Menus" search and the keyboard bindings all read. A row exists
 * only when it runs a real editor command; nothing here is decorative.
 *
 * Pure (no React, no DOM beyond KeyboardEvent shape) so the command mapping is
 * testable with a fake editor port.
 */

import type { ComponentType } from "react";

/** A keyboard shortcut. `mod` is Cmd on a Mac and Ctrl elsewhere. */
export type EditorShortcut = {
  key: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /**
   * true: the chrome binds this key itself (the editor engine does not).
   * false/absent: the engine already binds it; the label only tells the truth.
   */
  bind?: boolean;
};

type IconType = ComponentType<{ className?: string }>;

export type EditorMenuAction = {
  kind: "action";
  id: string;
  label: string;
  icon?: IconType;
  shortcut?: EditorShortcut;
  /** Extra words the Menus search matches (e.g. "freeze" for "1 row"). */
  keywords?: string[];
  run: () => unknown;
  checked?: () => boolean;
  /** Only for edit gates (a viewer); never "not built". */
  disabled?: () => boolean;
};

export type EditorMenuSubmenu = {
  kind: "submenu";
  id: string;
  label: string;
  icon?: IconType;
  keywords?: string[];
  items: EditorMenuEntry[];
};

export type EditorMenuSeparator = { kind: "separator" };

export type EditorMenuEntry = EditorMenuAction | EditorMenuSubmenu | EditorMenuSeparator;

export type EditorMenu = {
  id: string;
  label: string;
  items: EditorMenuEntry[];
};

/** One runnable row as the Menus search sees it: the action plus its path. */
export type FlatEditorAction = EditorMenuAction & { path: string[] };

export function flattenMenus(menus: EditorMenu[]): FlatEditorAction[] {
  const out: FlatEditorAction[] = [];
  const walk = (entries: EditorMenuEntry[], path: string[], extraKeywords: string[]) => {
    for (const e of entries) {
      if (e.kind === "separator") continue;
      if (e.kind === "submenu") {
        walk(e.items, [...path, e.label], [...extraKeywords, ...(e.keywords ?? [])]);
        continue;
      }
      out.push({ ...e, path, keywords: [...extraKeywords, ...(e.keywords ?? [])] });
    }
  };
  for (const m of menus) walk(m.items, [m.label], []);
  return out;
}

/** Search the flattened commands: every word must hit the label, path or keywords. */
export function searchActions(actions: FlatEditorAction[], query: string, limit = 12): FlatEditorAction[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored: { a: FlatEditorAction; score: number }[] = [];
  for (const a of actions) {
    const label = a.label.toLowerCase();
    const hay = `${label} ${a.path.join(" ").toLowerCase()} ${(a.keywords ?? []).join(" ").toLowerCase()}`;
    if (!words.every((w) => hay.includes(w))) continue;
    const score = label.startsWith(words[0]!) ? 0 : label.includes(words[0]!) ? 1 : 2;
    scored.push({ a, score });
  }
  return scored.sort((x, y) => x.score - y.score).slice(0, limit).map((s) => s.a);
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

const KEY_LABEL: Record<string, string> = {
  "\\": "\\",
  "/": "/",
  Delete: "Delete",
  Backspace: "Backspace",
  "=": "+",
  "-": "-",
};

/** "⌘⇧1" on a Mac, "Ctrl+Shift+1" elsewhere — Google's notation. */
export function formatShortcut(s: EditorShortcut, mac = isMacPlatform()): string {
  const key = KEY_LABEL[s.key] ?? (s.key.length === 1 ? s.key.toUpperCase() : s.key);
  if (mac) return `${s.mod ? "⌘" : ""}${s.alt ? "⌥" : ""}${s.shift ? "⇧" : ""}${key}`;
  return [s.mod ? "Ctrl" : "", s.alt ? "Alt" : "", s.shift ? "Shift" : "", key].filter(Boolean).join("+");
}

/** The physical key of an event (layout-proof for digits and letters under Shift/Alt). */
function eventKey(e: Pick<KeyboardEvent, "key" | "code">): string {
  if (/^Digit\d$/.test(e.code)) return e.code.slice(5);
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  if (e.code === "Backslash") return "\\";
  if (e.code === "Slash") return "/";
  return e.key.length === 1 ? e.key.toLowerCase() : e.key;
}

export function matchesShortcut(
  e: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey">,
  s: EditorShortcut,
  mac = isMacPlatform(),
): boolean {
  const mod = mac ? e.metaKey : e.ctrlKey;
  if (!!s.mod !== mod) return false;
  if (!!s.shift !== e.shiftKey) return false;
  if (!!s.alt !== e.altKey) return false;
  // Named keys ("ArrowUp", "Enter", "Delete") arrive cased; letters arrive lower-cased.
  return eventKey(e).toLowerCase() === s.key.toLowerCase();
}

/** The actions whose shortcut the chrome binds itself. */
export function boundActions(menus: EditorMenu[]): FlatEditorAction[] {
  return flattenMenus(menus).filter((a) => a.shortcut?.bind);
}
