"use client";

// features/spaces/editor/mobile-bar.tsx — a Space on a phone (PARITY L3, L4), as Notion's app has it:
//   L3  while the page is being written, a toolbar sits right above the keyboard: Turn into, Color, indent,
//       outdent, undo, redo, the block menu, and Done (puts the keyboard away). Turn into and Color swap the
//       strip for their choices, then come back.
//   L4  a long-press on a block opens its ⋮⋮ block menu (the one in BlockMenu.tsx).
// Only on a touch screen (pointer: coarse). The bar floats over the page (fixed, above the keyboard inset the
// shell publishes as --keyboard-inset-height), so nothing on the page moves when it shows.

import { ArrowLeft, Check, IndentDecrease, IndentIncrease, MoreHorizontal, Palette, Redo2, Type, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";

import { TURN_INTO } from "./BlockMenu";
import { currentBlockId, selectedOrCurrent } from "./block-actions";
import { openBlockMenu } from "./notion-keys";
import type { SpacesEditor } from "./schema";
import { COLORS } from "./selection-format";

const COARSE = "(pointer: coarse)";
const LONG_PRESS_MS = 500;
const LONG_PRESS_SLOP_PX = 10;

function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(COARSE);
    const read = () => setCoarse(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return coarse;
}

/** True while the caret is in this page's editor (the keyboard is up on a phone). */
function useEditorFocused(): boolean {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const read = () => setFocused(!!(document.activeElement instanceof Element && document.activeElement.closest(".spaces-editor .bn-editor")));
    const onOut = () => window.setTimeout(read, 0);
    read();
    document.addEventListener("focusin", read);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", read);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return focused;
}

/** L4 — a long-press on a block (still, half a second) opens its block menu. */
export function useLongPressBlockMenu(editor: SpacesEditor, editable: boolean) {
  useEffect(() => {
    if (!editable) return;
    let timer = 0;
    let start: { x: number; y: number } | null = null;
    let opened = false;
    const cancel = () => {
      window.clearTimeout(timer);
      start = null;
    };
    const onStart = (e: TouchEvent) => {
      opened = false;
      if (e.touches.length !== 1 || !(e.target instanceof Element)) return cancel();
      // A database block, a field or a button inside a block keeps its own long-press.
      if (e.target.closest(".spaces-db-frame, input, textarea, select, button, a")) return cancel();
      const id = e.target.closest(".spaces-editor .bn-block-outer[data-id]")?.getAttribute("data-id");
      if (!id) return cancel();
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        start = null;
        opened = openBlockMenu(editor, id);
        if (opened) navigator.vibrate?.(10);
      }, LONG_PRESS_MS);
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const t = e.touches[0];
      if (Math.hypot(t.clientX - start.x, t.clientY - start.y) > LONG_PRESS_SLOP_PX) cancel();
    };
    // The press that opened the menu is not also a tap (no caret jump, no word selection callout).
    const onEnd = (e: TouchEvent) => {
      cancel();
      if (opened && e.cancelable) e.preventDefault();
    };
    const onContext = (e: Event) => {
      if (opened) e.preventDefault();
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", cancel);
    document.addEventListener("contextmenu", onContext);
    return () => {
      cancel();
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", cancel);
      document.removeEventListener("contextmenu", onContext);
    };
  }, [editor, editable]);
}

const BTN = "inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-md px-2 text-foreground active:bg-accent";

/** L3 — the toolbar above the keyboard. */
export function MobileBlockBar({ editor }: { editor: SpacesEditor }) {
  const coarse = useCoarsePointer();
  const focused = useEditorFocused();
  const [panel, setPanel] = useState<null | "turn" | "color">(null);
  useEffect(() => {
    if (!focused) setPanel(null);
  }, [focused]);
  if (!coarse || !focused) return null;
  const targets = () => {
    const id = currentBlockId(editor);
    return id ? selectedOrCurrent(editor, id) : [];
  };
  const turnInto = (type: string, props?: Record<string, unknown>) => {
    editor.transact(() => {
      for (const id of targets()) editor.updateBlock(id, { type, props } as never);
    });
    setPanel(null);
  };
  const color = (style: "textColor" | "backgroundColor", c: string) => {
    editor.transact(() => {
      for (const id of targets()) {
        try {
          editor.updateBlock(id, { props: { [style]: c } } as never);
        } catch (err) {
          // A block kind without colors (a database, a divider) keeps its look; the others still change.
          console.error("[spaces] this block takes no color", id, err);
        }
      }
    });
    setPanel(null);
  };
  // Every press keeps the caret (and the keyboard) where it is.
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();
  return (
    <div
      role="toolbar"
      aria-label="Block tools"
      data-matrx-floating-bottom=""
      className="spaces-mobile-bar fixed inset-x-0 z-50 border-t border-border bg-background"
      style={{ bottom: "var(--keyboard-inset-height, 0px)" }}
      onPointerDown={keep}
      onMouseDown={keep}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto px-1">
        {panel === "turn" ? (
          <>
            <button type="button" className={BTN} aria-label="Back" onClick={() => setPanel(null)}>
              <ArrowLeft size={18} />
            </button>
            {TURN_INTO.map((t) => (
              <button key={t.label} type="button" className={`${BTN} type-secondary`} onClick={() => turnInto(t.type, t.props)}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </>
        ) : panel === "color" ? (
          <>
            <button type="button" className={BTN} aria-label="Back" onClick={() => setPanel(null)}>
              <ArrowLeft size={18} />
            </button>
            {COLORS.map((c) => (
              <button key={`t-${c}`} type="button" className={BTN} aria-label={`Text color ${c}`} onClick={() => color("textColor", c)}>
                <span className="text-base font-semibold" style={{ color: c === "default" ? undefined : `var(--bn-colors-highlights-${c}-text, ${c})` }}>
                  A
                </span>
              </button>
            ))}
            {COLORS.map((c) => (
              <button key={`b-${c}`} type="button" className={BTN} aria-label={`Background color ${c}`} onClick={() => color("backgroundColor", c)}>
                <span
                  className="inline-block size-6 rounded border border-border"
                  style={{ background: c === "default" ? undefined : `var(--bn-colors-highlights-${c}-background, ${c})` }}
                />
              </button>
            ))}
          </>
        ) : (
          <>
            <button type="button" className={BTN} aria-label="Turn into" onClick={() => setPanel("turn")}>
              <Type size={18} />
            </button>
            <button type="button" className={BTN} aria-label="Color" onClick={() => setPanel("color")}>
              <Palette size={18} />
            </button>
            <button type="button" className={BTN} aria-label="Indent" onClick={() => editor.nestBlock()}>
              <IndentIncrease size={18} />
            </button>
            <button type="button" className={BTN} aria-label="Outdent" onClick={() => editor.unnestBlock()}>
              <IndentDecrease size={18} />
            </button>
            <button type="button" className={BTN} aria-label="Undo" onClick={() => editor.undo()}>
              <Undo2 size={18} />
            </button>
            <button type="button" className={BTN} aria-label="Redo" onClick={() => editor.redo()}>
              <Redo2 size={18} />
            </button>
            <button
              type="button"
              className={BTN}
              aria-label="Block menu"
              onClick={() => {
                const id = currentBlockId(editor);
                if (id) openBlockMenu(editor, id);
              }}
            >
              <MoreHorizontal size={18} />
            </button>
            <span className="flex-1" />
            <button type="button" className={BTN} aria-label="Done" onClick={() => editor.prosemirrorView?.dom.blur()}>
              <Check size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
