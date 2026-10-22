"use client";

/**
 * useKeptTextSelection — a text view of a record puts the caret back where the
 * person left it.
 *
 * Hidden and shown (a board tile asleep and awake, React `<Activity>`) a
 * textarea keeps its DOM and so its selection; REMOUNTED (a removed tile
 * undone, a tile scrolled far away and back, a route left and re-entered) it
 * is a new element whose caret sits at 0. When a view goes away this records
 * its selection under the record's working-copy key (`workingCopies.selections`,
 * which outlives the working-copy entry); when one mounts it restores it.
 *
 * Restoring never takes focus from a field the person is typing in elsewhere
 * (`lib/dom/focus-guard`): some engines focus a field on `setSelectionRange`.
 */

import { useLayoutEffect, type RefObject } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import { personIsTypingElsewhere } from "@/lib/dom/focus-guard";
import { getKeptTextSelection, workingCopySelectionKept } from "./workingCopySlice";

/** How long a view whose field mounts a beat after it (a deferred/lazy pane) is waited for. */
const FIELD_WAIT_MS = 16;
const FIELD_WAIT_TRIES = 120;

export function useKeptTextSelection(
  key: string | null,
  ref: RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  active: boolean,
): void {
  const store = useAppStore();
  useLayoutEffect(() => {
    if (!key || !active) return undefined;
    let el: HTMLTextAreaElement | HTMLInputElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const attach = (node: HTMLTextAreaElement | HTMLInputElement) => {
      el = node;
      const kept = getKeptTextSelection(store.getState(), key);
      if (
        kept &&
        kept.end <= node.value.length &&
        (node.selectionStart !== kept.start || node.selectionEnd !== kept.end) &&
        !personIsTypingElsewhere(node)
      ) {
        node.setSelectionRange(kept.start, kept.end, kept.direction);
      }
    };
    // The field can mount after this effect runs (a pane the host renders a beat later than the
    // mode flag that turned `active` on): with no element yet, wait for it instead of keeping
    // nothing for the whole life of this view.
    const find = () => {
      const node = ref.current;
      if (node) return attach(node);
      if (++tries < FIELD_WAIT_TRIES) timer = setTimeout(find, FIELD_WAIT_MS);
    };
    find();
    return () => {
      if (timer) clearTimeout(timer);
      const node = el;
      if (!node) return;
      store.dispatch(
        workingCopySelectionKept({
          key,
          start: node.selectionStart ?? 0,
          end: node.selectionEnd ?? 0,
          direction: node.selectionDirection ?? "none",
        }),
      );
    };
  }, [key, active, ref, store]);
}
