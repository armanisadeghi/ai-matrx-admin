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
import { noteWorkingCopy } from "@/features/notes/utils/noteLiveContent";

const FRESH_MS = 1500;

/** The menu section for one misspelled word. Pure given its inputs. */
export function buildSpellingSection(
  pw: PointerWord,
  handlers: {
    onAdd: (word: string) => void;
    onIgnore: (word: string) => void;
    /** Runs just before a fix replaces the word (Plain: commit the typing before it as its own step). */
    beforeReplace?: (pw: PointerWord) => void;
  },
): ContextMenuExtraSection {
  const word = pw.span.word;
  const fixes = suggestionsFor(word).map((s) => matchCase(word, s));
  const items: ContextMenuExtraSection["items"] = fixes.length
    ? fixes.map((fix, i) => ({
        kind: "item" as const,
        id: `spell-fix-${i}`,
        label: fix,
        onSelect: () => {
          handlers.beforeReplace?.(pw);
          if (!replacePointerWord(pw, fix)) toast.error("Text changed");
        },
      }))
    : [{ kind: "item" as const, id: "spell-none", label: "No suggestions", disabled: true, onSelect: () => {} }];
  items.push(
    { kind: "separator", id: "spell-sep" },
    { kind: "item", id: "spell-add", label: "Add to dictionary", onSelect: () => handlers.onAdd(word) },
    { kind: "item", id: "spell-ignore", label: "Ignore", onSelect: () => handlers.onIgnore(word) },
  );
  // `lead`: the section sits at the very top of the menu, under its own "Suggestions" heading.
  const section: ContextMenuExtraSection = {
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
 * The dictionary loads quietly once the editor mounts, at idle, so the first
 * right-click opens at once; a right-click before that waits for it.
 *
 * Plain mode: the note's undo is its own record history, and typing reaches it
 * through a one-second working copy. A fix commits the typing before it first,
 * so the fix is its own undo step and ⌘Z restores the misspelled word.
 */
export function useNotesSpelling(opts: {
  rootRef: RefObject<HTMLElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  notesExtras: ContextMenuExtraSection[];
  /** The note being edited: Plain-mode fixes commit its pending typing first. */
  noteId?: string | null;
}) {
  const { rootRef, textareaRef, notesExtras, noteId } = opts;
  const userId = useAppSelector(selectUserId);
  const pending = useRef<{ pw: PointerWord; at: number } | null>(null);

  // The dictionary loads at idle once a note editor is up, so the first right-click is instant.
  useEffect(() => {
    if (isSpellerLoaded()) return undefined;
    const load = () => void loadSpeller(userId).catch(() => {});
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(load, { timeout: 4000 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = window.setTimeout(load, 1500);
    return () => window.clearTimeout(handle);
  }, [userId]);

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
          beforeReplace: (pw) => {
            if (pw.kind === "textarea" && noteId) void noteWorkingCopy.flush(noteId);
          },
        }),
        ...notesExtras,
      ];
    },
    [notesExtras, userId, noteId],
  );
}
