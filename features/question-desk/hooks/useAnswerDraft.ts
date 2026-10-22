"use client";

// features/question-desk/hooks/useAnswerDraft.ts
//
// NEVER LOSE HIS WORDS (attack F12).
//
// The own-words box holds the most expensive text in the platform: a ruling
// nobody else can write. Between typing it and saving it there is a navigation,
// a refresh, a closed tab, a crashed browser and another device, so the draft
// is persisted per INTERVIEW + QUESTION (never per screen) on the SERVER, in
// the person's own users.user_surface_state row (feature `question_desk_draft`,
// surface_key `<interview id>:<question id>`), and restored on return anywhere.
//
// The draft is NOT the answer. Saving the answer marks the question answered
// (and a story sitting's last answer starts the owner-room run), so typing only
// ever writes the draft row; the answer is written by the Save press alone, and
// a successful save retires the draft row.
//
// Writes are debounced and flushed when the question changes, the screen
// unmounts, or the page is hidden (tab switch, close, phone lock). Nothing is
// written for a question until its saved draft has been read, so a reload can
// never wipe a draft. A refused write is reported to the caller so the screen
// can say the draft is not kept; the box keeps working either way.
//
// A Save can never be undone by a late draft write (REVIEW3, 2026-10-22): every
// server write runs in order on one queue, and a draft write older than the
// last clear of its question is dropped — so an upsert still in flight when
// the person presses Save lands BEFORE the retire, never after it.
//
// The mutable state lives in one controller object created once per mount
// (React Compiler is on: no manual useCallback/useMemo, and no ref writes during
// render).

import { useEffect, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@ai-matrx/chat/host/identity";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import {
  readSurfaceState,
  retireSurfaceState,
  writeSurfaceState,
} from "@/lib/surface-state/userSurfaceState";

/** users.user_surface_state.feature for every question-desk answer draft. */
export const ANSWER_DRAFT_FEATURE = "question_desk_draft";
/** How long typing must pause before the draft is written. */
export const ANSWER_DRAFT_DEBOUNCE_MS = 800;

export function answerDraftKey(interviewId: string, questionId: string): string {
  return `${interviewId}:${questionId}`;
}

/** The stored draft text, or "" for anything that is not a draft row. */
export function draftTextOf(state: unknown): string {
  if (!state || typeof state !== "object") return "";
  const text = (state as Record<string, unknown>).text;
  return typeof text === "string" ? text : "";
}

export interface AnswerDraft {
  /** The restored (or current) draft text for this question. */
  text: string;
  /** Replace the draft. Verbatim — no trim, ever. */
  setText: (next: string) => void;
  /** Forget this question's draft (after a successful save, or a discard). */
  clear: () => void;
  /** Set when the draft could not be kept on the server, so the screen can say so. */
  storageError: string | null;
}

const NOT_KEPT = "Your draft is not saved yet. Save your answer before you leave.";

interface Pending {
  userId: string;
  key: string;
  text: string;
  /** Order of the act: a draft write older than its question's last clear is dropped. */
  gen: number;
}

interface DraftController {
  /** Point at a question: flush the previous one's words, then read this one's saved draft. Returns the cleanup. */
  open: (key: string | null, userId: string | null) => () => void;
  /** Flush on page hide / unmount. Returns the cleanup. */
  watchPage: () => () => void;
  setText: (next: string) => void;
  clear: () => void;
}

function createDraftController(
  show: (text: string) => void,
  report: (error: string | null) => void,
): DraftController {
  let key: string | null = null;
  let userId: string | null = null;
  /** The key whose saved draft has been read (writes for it are allowed). */
  let restored: string | null = null;
  /** The key the person typed into before its read came back. */
  let typedBeforeRestore: string | null = null;
  let pending: Pending | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let gen = 0;
  /** Per question: the order number of its last clear (Save). */
  const clearedAt = new Map<string, number>();
  /** Every server write, in order. */
  let queue: Promise<void> = Promise.resolve();

  const fail = (message: string) => report(`${NOT_KEPT} (${message})`);

  const run = async (p: Pending) => {
    if (p.text.length === 0) {
      const error = await retireSurfaceState({ userId: p.userId, feature: ANSWER_DRAFT_FEATURE, surfaceKey: p.key });
      if (error) fail(error);
      else report(null);
      return;
    }
    // Saved (cleared) after these words were typed: never bring the draft back.
    if ((clearedAt.get(p.key) ?? -1) > p.gen) return;
    let organizationId: string;
    try {
      organizationId = await ensureOrgId(null);
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
      return;
    }
    const error = await writeSurfaceState({
      userId: p.userId,
      organizationId,
      feature: ANSWER_DRAFT_FEATURE,
      surfaceKey: p.key,
      state: { text: p.text, at: new Date().toISOString() },
    });
    if (error) fail(error);
    else report(null);
  };

  const write = (p: Pending) => {
    queue = queue.then(() => run(p)).catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
  };

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    const p = pending;
    pending = null;
    if (p) write(p);
  };

  return {
    open(nextKey, nextUser) {
      flush();
      key = nextKey;
      userId = nextUser;
      show("");
      if (!nextKey || !nextUser) return () => {};
      let live = true;
      typedBeforeRestore = null;
      void readSurfaceState({ userId: nextUser, feature: ANSWER_DRAFT_FEATURE, surfaceKey: nextKey })
        .then((row) => {
          if (!live) return;
          restored = nextKey;
          // Words typed while the read was in flight win: they are newer.
          if (typedBeforeRestore === nextKey) {
            if (pending && pending.key === nextKey) {
              if (timer) clearTimeout(timer);
              timer = setTimeout(flush, ANSWER_DRAFT_DEBOUNCE_MS);
            }
            return;
          }
          show(draftTextOf(row?.state));
        })
        .catch((error: unknown) => {
          if (!live) return;
          // The saved draft could not be read; writing now could overwrite it,
          // so this question's draft stays local and the screen says so.
          fail(error instanceof Error ? error.message : String(error));
        });
      return () => {
        live = false;
      };
    },
    watchPage() {
      const onHide = () => {
        if (document.visibilityState === "hidden") flush();
      };
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", flush);
      return () => {
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("pagehide", flush);
        flush();
      };
    },
    setText(next) {
      show(next);
      if (!key || !userId) return;
      gen += 1;
      pending = { userId, key, text: next, gen };
      if (restored !== key) {
        typedBeforeRestore = key;
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, ANSWER_DRAFT_DEBOUNCE_MS);
    },
    clear() {
      show("");
      if (!key || !userId) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      typedBeforeRestore = null;
      gen += 1;
      clearedAt.set(key, gen);
      write({ userId, key, text: "", gen });
    },
  };
}

export function useAnswerDraft(
  interviewId: string | null,
  questionId: string | null,
): AnswerDraft {
  const userId = useAppSelector(selectUserId);
  const key =
    interviewId && questionId ? answerDraftKey(interviewId, questionId) : null;
  const [text, setTextState] = useState("");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [draft] = useState(() => createDraftController(setTextState, setStorageError));

  // Restore on question change: flush the previous question's pending words
  // first, then read this one's saved draft. A missing row is an empty box.
  useEffect(() => draft.open(key, userId), [draft, key, userId]);
  // Unmount and a hidden page flush what is pending.
  useEffect(() => draft.watchPage(), [draft]);

  return { text, setText: draft.setText, clear: draft.clear, storageError };
}
