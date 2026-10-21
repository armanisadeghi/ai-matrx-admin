// features/spaces/editor/notion-keys.ts — the Notion editor keys BlockNote lacks (PARITY B7), and the
// pieces the phone toolbar and long-press share with them (L3, L4):
//   Cmd+Shift+H  the last text or highlight color used, on the selected words (default: yellow highlight)
//   Esc          selects the block the caret is in (blue); Esc again, a click or typing lets it go
//   Cmd+/        the ⋮⋮ block menu of the current block (Turn into, Color, Duplicate…)
//   Cmd+A        first the current block's text, then every block on the page
// The block menu has ONE home (BlockMenu.tsx); a shortcut or a long-press only opens it for a block.

import { TextSelection } from "@tiptap/pm/state";

import type { SpacesEditor } from "./schema";

export type ColorStyle = "textColor" | "backgroundColor";
export interface ColorPick {
  style: ColorStyle;
  color: string;
}

const LAST_COLOR_KEY = "spaces.last-color";
const DEFAULT_COLOR: ColorPick = { style: "backgroundColor", color: "yellow" };
let lastPick: ColorPick | null = null;

/** Every color the selection toolbar or the phone bar applies is remembered for Cmd+Shift+H. */
export function rememberColor(pick: ColorPick) {
  lastPick = pick;
  try {
    window.localStorage.setItem(LAST_COLOR_KEY, JSON.stringify(pick));
  } catch {
    // Storage blocked (private window): the pick still holds for this tab.
  }
}

export function lastColor(): ColorPick {
  if (lastPick) return lastPick;
  try {
    const raw = window.localStorage.getItem(LAST_COLOR_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ColorPick>) : null;
    if (parsed && (parsed.style === "textColor" || parsed.style === "backgroundColor") && typeof parsed.color === "string") {
      lastPick = { style: parsed.style, color: parsed.color };
      return lastPick;
    }
  } catch {
    // Unreadable or blocked storage: Notion's first highlight.
  }
  return DEFAULT_COLOR;
}

/** Apply a color pick to the selected words. */
export function applyColor(editor: SpacesEditor, pick: ColorPick) {
  if (pick.color === "default") editor.removeStyles({ [pick.style]: "default" } as never);
  else editor.addStyles({ [pick.style]: pick.color } as never);
  rememberColor(pick);
}

/** Cmd+Shift+H: the last color used, on the selection. False (the key stays the browser's) with no selection. */
export function applyLastColor(editor: SpacesEditor): boolean {
  const { from, to } = editor.prosemirrorState.selection;
  if (from === to) return false;
  applyColor(editor, lastColor());
  return true;
}

/**
 * Cmd+A, Notion's order: the first press selects the current block's text; when that text is already the
 * whole selection (or the selection spans blocks, or the block has no text) the answer is "page" and the
 * caller selects every block.
 */
export function selectAllStep(editor: SpacesEditor): "block" | "page" {
  const state = editor.prosemirrorState;
  const { $from, $to, from, to } = state.selection;
  if (!$from.sameParent($to) || !$from.parent.isTextblock) return "page";
  const start = $from.start();
  const end = $from.end();
  if (end <= start || (from === start && to === end)) return "page";
  editor.prosemirrorView?.dispatch(state.tr.setSelection(TextSelection.create(state.doc, start, end)));
  return "block";
}

/** The page's top-level blocks (a selected block brings its children). */
export function pageBlockIds(editor: SpacesEditor): string[] {
  return editor.document.map((b) => b.id);
}

/**
 * Open the ⋮⋮ block menu of a block, as a hover then a click on its handle would. True when the block is
 * on screen; the menu opens on the next frames (the side menu has to find the block first).
 */
export function openBlockMenu(editor: SpacesEditor, blockId: string): boolean {
  const view = editor.prosemirrorView;
  const outer = document.querySelector<HTMLElement>(`.spaces-editor .bn-block-outer[data-id="${CSS.escape(blockId)}"]`);
  const content = outer?.querySelector<HTMLElement>(":scope > .bn-block > .bn-block-content");
  if (!view || !content) return false;
  const r = content.getBoundingClientRect();
  view.dom.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: r.left + 8, clientY: r.top + Math.min(r.height / 2, 12) }));
  let tries = 0;
  const click = () => {
    const handle = document.querySelector<HTMLElement>(".bn-side-menu [draggable=true]");
    if (handle) {
      handle.click();
      return;
    }
    if (++tries < 10) window.requestAnimationFrame(click);
    else console.error("[spaces] the block menu handle never appeared for", blockId);
  };
  window.requestAnimationFrame(click);
  return true;
}
