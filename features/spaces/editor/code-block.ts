// features/spaces/editor/code-block.ts — Notion's code block (C10) on BlockNote's: language picker
// (BlockNote's own), and on hover Copy, Wrap and Caption; a caption line under the code.
//
// BlockNote's code block renders vanilla DOM, so this decorates that DOM. The stored `caption` is
// RichSpan[] (BLOCK-SCHEMA); on the engine it rides as a JSON string (convert.ts) and is edited here as
// plain text. `wrap` is an extra stored prop (allowed on any block).

import { createCodeBlockSpec } from "@blocknote/core";

import { toast } from "@/lib/toast";

import type { RichSpan } from "../contract";
import { copyToClipboard } from "@/lib/clipboard/copy";

type CodeSpec = ReturnType<typeof createCodeBlockSpec>;

export type CodeLanguages = Record<string, { name: string; aliases?: string[] }>;

/** The picker's languages. A stored language that is not a key here is resolved by `resolveCodeLanguage`. */
export const CODE_LANGUAGES: CodeLanguages = {
  // "" too: BlockNote's "``` " shortcut asks for the language typed after the fence (none), and a
  // language the list does not know is refused — the fence then stayed a paragraph of literal "```".
  text: { name: "Plain text", aliases: ["plaintext", "txt", ""] },
  bash: { name: "Bash", aliases: ["sh", "shell", "zsh"] },
  c: { name: "C" },
  cpp: { name: "C++", aliases: ["c++"] },
  csharp: { name: "C#", aliases: ["cs"] },
  css: { name: "CSS" },
  go: { name: "Go", aliases: ["golang"] },
  html: { name: "HTML" },
  java: { name: "Java" },
  javascript: { name: "JavaScript", aliases: ["js", "jsx"] },
  json: { name: "JSON" },
  kotlin: { name: "Kotlin" },
  markdown: { name: "Markdown", aliases: ["md"] },
  mermaid: { name: "Mermaid" },
  php: { name: "PHP" },
  python: { name: "Python", aliases: ["py"] },
  ruby: { name: "Ruby", aliases: ["rb"] },
  rust: { name: "Rust", aliases: ["rs"] },
  sql: { name: "SQL" },
  swift: { name: "Swift" },
  typescript: { name: "TypeScript", aliases: ["ts", "tsx"] },
  yaml: { name: "YAML", aliases: ["yml"] },
};

/**
 * The picker key for a stored language. BlockNote's code block THROWS ("Language py is not supported.")
 * when the stored value is not a key of the list — aliases only count when typed after "```" — so a page
 * imported or written by an agent with `py`, `ts` or an unlisted language took down every page and
 * widget that drew it (audit round 2 #1). Alias → its key; anything else → Plain text. The stored value
 * is left as it is until the person picks a language.
 */
export function resolveCodeLanguage(raw: unknown, languages: CodeLanguages = CODE_LANGUAGES): string {
  const wanted = String(raw ?? "").trim().toLowerCase();
  if (Object.hasOwn(languages, wanted)) return wanted;
  const hit = Object.entries(languages).find(
    ([key, { aliases }]) => key.toLowerCase() === wanted || aliases?.some((a) => a.toLowerCase() === wanted),
  );
  return hit ? hit[0] : Object.hasOwn(languages, "text") ? "text" : Object.keys(languages)[0] ?? "text";
}

export function captionText(raw: unknown): string {
  try {
    const spans = JSON.parse(String(raw || "[]")) as RichSpan[];
    return Array.isArray(spans) ? spans.map((s) => s.text).join("") : "";
  } catch {
    return "";
  }
}

/** Keys and clicks inside our controls never reach ProseMirror (it listens on the editor root). */
function isolate(el: HTMLElement) {
  for (const type of ["keydown", "keypress", "keyup", "beforeinput", "input", "paste", "mousedown", "mouseup", "pointerdown", "pointerup", "click", "compositionstart", "compositionend", "dragstart"]) {
    el.addEventListener(type, (e) => e.stopPropagation());
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "spaces-code-action";
  b.textContent = label;
  b.addEventListener("click", (e) => {
    e.preventDefault();
    onClick();
  });
  return b;
}

export function notionCodeBlock(base: CodeSpec, languages: CodeLanguages = CODE_LANGUAGES): CodeSpec {
  const config = {
    ...base.config,
    propSchema: { ...base.config.propSchema, wrap: { default: false }, caption: { default: "" } },
  };
  const render: CodeSpec["implementation"]["render"] = function (this: unknown, block, editor) {
    const language = resolveCodeLanguage((block.props as Record<string, unknown>).language, languages);
    const drawn = language === (block.props as Record<string, unknown>).language ? block : ({ ...block, props: { ...block.props, language } } as typeof block);
    const view = base.implementation.render.call(this as never, drawn, editor);
    const dom = view.dom as HTMLElement;
    const props = block.props as Record<string, unknown>;
    const wrap = props.wrap === true;
    const caption = captionText(props.caption);
    dom.dataset.wrap = wrap ? "true" : "false";

    const bar = document.createElement("div");
    bar.className = "spaces-code-actions";
    bar.contentEditable = "false";
    isolate(bar);
    const copy = button("Copy", () => {
      const text = (view.contentDOM as HTMLElement | undefined)?.textContent ?? "";
      // A toast, never a label change: any DOM change here makes ProseMirror redraw the block.
      void copyToClipboard(text, "Copied code");
    });
    bar.append(copy);
    if (editor.isEditable) {
      bar.append(button(wrap ? "Unwrap" : "Wrap", () => editor.updateBlock(block, { props: { wrap: !wrap } } as never)));
      if (!caption) {
        bar.append(
          // Focus only: the empty caption line is folded by CSS until it holds focus, because any DOM
          // change inside this block (an attribute, a label) makes ProseMirror redraw it.
          button("Caption", () => window.requestAnimationFrame(() => input.focus())),
        );
      }
    }
    dom.append(bar);

    const line = document.createElement("div");
    line.className = "spaces-code-caption";
    line.contentEditable = "false";
    line.dataset.empty = caption ? "false" : "true";
    isolate(line);
    const input = document.createElement("input");
    input.type = "text";
    input.value = caption;
    input.placeholder = "Write a caption";
    input.readOnly = !editor.isEditable;
    input.setAttribute("aria-label", "Code caption");
    const commit = () => {
      const next = input.value.trim();
      if (next === caption) return;
      editor.updateBlock(block, { props: { caption: next ? JSON.stringify([{ text: next }]) : "" } } as never);
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        input.blur();
      }
    });
    line.append(input);
    dom.append(line);
    return view;
  };
  return { ...base, config, implementation: { ...base.implementation, render } } as unknown as CodeSpec;
}
