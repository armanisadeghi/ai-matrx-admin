"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { ContextMenuExtraSection } from "@ai-matrx/context-menu/engine";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { toast } from "@/lib/toast";
import {
  addPersonalWord,
  ignoreWord,
  isMisspelled,
  isSpellerLoaded,
  loadSpeller,
  suggestionsFor,
} from "./speller";
import {
  replacePointerWord,
  resolvePointerWord,
  type PointerWord,
} from "./pointerWord";
import { matchCase } from "./wordAt";

const FRESH_MS = 1500;

/** The menu section for one misspelled word. Pure given its inputs. */
export function buildSpellingSection(
  pw: PointerWord,
  handlers: { onAdd: (word: string) => void; onIgnore: (word: string) => void },
): ContextMenuExtraSection {
  const word = pw.span.word;
  const fixes = suggestionsFor(word).map((s) => matchCase(word, s));
  const items: ContextMenuExtraSection["items"] = fixes.length
    ? fixes.map((fix, i) => ({
        kind: "item" as const,
        id: `spell-fix-${i}`,
        label: fix,
        onSelect: () => {
          if (!replacePointerWord(pw, fix)) toast.error("Text changed");
        },
      }))
    : [{ kind: "item" as const, id: "spell-none", label: "No suggestions", disabled: true, onSelect: () => {} }];
  items.push(
    { kind: "separator", id: "spell-sep" },
    { kind: "item", id: "spell-add", label: "Add to dictionary", onSelect: () => handlers.onAdd(word) },
    { kind: "item", id: "spell-ignore", label: "Ignore", onSelect: () => handlers.onIgnore(word) },
  );
  // `lead` is read by context-menu releases that know it (the section then sits at the very top);
  // older releases ignore it and file the rows under the page section — still working.
  const section: ContextMenuExtraSection & { lead?: boolean } = {
    id: "spelling",
    label: "Suggestions",
    lead: true,
    items,
  };
  return section;
}

/**
 * Spelling suggestions for the notes right-click menu. Returns the
 * `resolveExtraSectionsOnOpen` for the menu: undefined (menu untouched) unless
 * the pointer was on a misspelled word; then [Suggestions, ...notes sections].
 * The dictionary loads on the first right-click on a checkable word.
 */
export function useNotesSpelling(opts: {
  rootRef: RefObject<HTMLElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  notesExtras: ContextMenuExtraSection[];
}) {
  const { rootRef, textareaRef, notesExtras } = opts;
  const userId = useAppSelector(selectUserId);
  const pending = useRef<{ pw: PointerWord; at: number } | null>(null);

  useEffect(() => {
    const replayed = new WeakSet<Event>();

    const consider = (pw: PointerWord) => {
      if (isMisspelled(pw.span.word)) pending.current = { pw, at: Date.now() };
    };

    const onContextMenu = (e: MouseEvent) => {
      // The editor body mounts after the note loads, so ask for it per click.
      const root = rootRef.current;
      if (!root || replayed.has(e)) return;
      if (!(e.target instanceof Node) || !root.contains(e.target)) return;
      pending.current = null;
      const pw = resolvePointerWord({
        x: e.clientX,
        y: e.clientY,
        target: e.target,
        textarea: textareaRef.current,
        richRoot: root,
      });
      if (!pw) return;
      if (isSpellerLoaded()) {
        consider(pw);
        return;
      }
      // First right-click on a checkable word: hold the menu until the
      // dictionary is in, then replay the same click so it opens once, complete.
      const target = e.target;
      e.preventDefault();
      e.stopPropagation();
      const init: MouseEventInit = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        button: 2,
        buttons: 2,
        view: window,
      };
      const replay = () => {
        const again = new MouseEvent("contextmenu", init);
        replayed.add(again);
        (target as Element | null)?.dispatchEvent(again);
      };
      loadSpeller(userId)
        .then(() => consider(pw))
        .catch(() => toast.error("Spell check unavailable"))
        .finally(replay);
    };

    document.addEventListener("contextmenu", onContextMenu, true);
    return () => document.removeEventListener("contextmenu", onContextMenu, true);
  }, [rootRef, textareaRef, userId]);

  return useCallback(
    (): ContextMenuExtraSection[] | undefined => {
      const p = pending.current;
      pending.current = null;
      if (!p || Date.now() - p.at > FRESH_MS) return undefined;
      return [
        buildSpellingSection(p.pw, {
          onAdd: (w) => addPersonalWord(w, userId),
          onIgnore: ignoreWord,
        }),
        ...notesExtras,
      ];
    },
    [notesExtras, userId],
  );
}
