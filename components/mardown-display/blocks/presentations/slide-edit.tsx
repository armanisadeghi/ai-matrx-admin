"use client";

/**
 * In-place slide editing for SlideView. With no `SlideEditContext` provider a field renders as
 * plain read-only text (chat, canvas, Present, exports); inside one (the presentation editor) the
 * SAME layout renders every text as an editable field at its real position — Google Slides' "click
 * the text box and type", with no second renderer.
 *
 * A field is addressed by a path into the slide ("title", "bullets.2", "extra.stats.1.value",
 * "extra.columns.0.bullets.3"); the editor's reducer owns what a change means.
 */

import { createContext, useContext, useEffect, useRef, type CSSProperties } from "react";

export interface SlideEditPort {
  onChange: (path: string, value: string) => void;
  /** Enter in a list item: add an item after it. */
  onEnter: (path: string) => void;
  /** Backspace in an empty list item: remove it. */
  onRemoveEmpty: (path: string) => void;
  /** The field that should take the caret next (after Enter added it). */
  focusPath: string | null;
  onFocused: () => void;
}

export const SlideEditContext = createContext<SlideEditPort | null>(null);

export function useSlideEditing(): boolean {
  return useContext(SlideEditContext) !== null;
}

/** Bold-aware read-only text (the renderer's original). */
export function RichText({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-bold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

function EditableText({
  port,
  path,
  text,
  placeholder,
  list,
}: {
  port: SlideEditPort;
  path: string;
  text: string;
  placeholder: string;
  list: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  /** The last text this field typed into the model: an echo of it never rewrites the DOM. */
  const emitted = useRef<string | null>(null);
  // Uncontrolled while typing (the caret never jumps); rewritten when the model changes from
  // elsewhere (undo, another slide's paste, a reload) even while focused.
  useEffect(() => {
    const el = ref.current;
    if (!el || el.textContent === text) return;
    if (document.activeElement === el && emitted.current === text) return;
    el.textContent = text;
  }, [text]);
  useEffect(() => {
    const el = ref.current;
    if (!el || port.focusPath !== path) return;
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.selectAllChildren(el);
      sel.collapseToEnd();
    }
    port.onFocused();
  }, [port, path]);
  const style: CSSProperties = { caretColor: "#0f172a", outline: "none" };
  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={placeholder}
      tabIndex={0}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      data-slide-field={path}
      data-placeholder={placeholder}
      spellCheck
      style={style}
      className="inline-block min-w-[1ch] cursor-text rounded-sm decoration-transparent outline-dashed outline-1 outline-transparent hover:outline-sky-400/60 focus:outline-sky-500 empty:before:pointer-events-none empty:before:text-slate-400 empty:before:[-webkit-text-fill-color:#94a3b8] empty:before:content-[attr(data-placeholder)]"
      onInput={(e) => {
        const next = e.currentTarget.textContent ?? "";
        emitted.current = next;
        port.onChange(path, next);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (list) port.onEnter(path);
          else e.currentTarget.blur();
          return;
        }
        if (e.key === "Backspace" && list && !(e.currentTarget.textContent ?? "")) {
          e.preventDefault();
          port.onRemoveEmpty(path);
          return;
        }
        if (e.key === "Escape") e.currentTarget.blur();
      }}
    />
  );
}

/**
 * One text on a slide: read-only `RichText`, or (inside the editor) an editable field at the same
 * spot. `list` marks a list item (Enter adds the next one, Backspace on empty removes it).
 */
export function SlideField({
  path,
  text,
  placeholder,
  list = false,
  className,
}: {
  path: string;
  text?: string;
  placeholder: string;
  list?: boolean;
  className?: string;
}) {
  const port = useContext(SlideEditContext);
  if (!port) return <RichText text={text} className={className} />;
  return (
    <span className={className}>
      <EditableText port={port} path={path} text={text ?? ""} placeholder={placeholder} list={list} />
    </span>
  );
}
