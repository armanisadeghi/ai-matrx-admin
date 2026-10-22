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

import { useCallback, useEffect, useRef, useState } from "react";
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

  const keyRef = useRef<string | null>(key);
  keyRef.current = key;
  const userRef = useRef<string | null>(userId);
  userRef.current = userId;
  /** The key whose saved draft has been read (writes for it are allowed). */
  const restoredRef = useRef<string | null>(null);
  /** The key the person typed into before its read came back. */
  const typedBeforeRestore = useRef<string | null>(null);
  const pending = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const write = useCallback(async (p: Pending) => {
    const fail = (message: string) => {
      setStorageError(`${NOT_KEPT} (${message})`);
    };
    if (p.text.length === 0) {
      const error = await retireSurfaceState({
        userId: p.userId,
        feature: ANSWER_DRAFT_FEATURE,
        surfaceKey: p.key,
      });
      if (error) fail(error);
      else setStorageError(null);
      return;
    }
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
    else setStorageError(null);
  }, []);

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const p = pending.current;
    pending.current = null;
    if (p) void write(p);
  }, [write]);

  // Restore on question change: flush the previous question's pending words
  // first, then read this one's saved draft. A missing row is an empty box.
  useEffect(() => {
    flush();
    setTextState("");
    if (!key || !userId) return;
    let live = true;
    typedBeforeRestore.current = null;
    void readSurfaceState({
      userId,
      feature: ANSWER_DRAFT_FEATURE,
      surfaceKey: key,
    })
      .then((row) => {
        if (!live) return;
        restoredRef.current = key;
        // Words typed while the read was in flight win: they are newer.
        if (typedBeforeRestore.current === key) {
          const p = pending.current;
          if (p && p.key === key) {
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(flush, ANSWER_DRAFT_DEBOUNCE_MS);
          }
          return;
        }
        setTextState(draftTextOf(row?.state));
      })
      .catch((error: unknown) => {
        if (!live) return;
        // The saved draft could not be read; writing now could overwrite it,
        // so this question's draft stays local and the screen says so.
        setStorageError(
          `${NOT_KEPT} (${error instanceof Error ? error.message : String(error)})`,
        );
      });
    return () => {
      live = false;
    };
  }, [key, userId, flush]);

  // Unmount and a hidden page flush what is pending.
  useEffect(() => {
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
  }, [flush]);

  const setText = useCallback(
    (next: string) => {
      setTextState(next);
      const k = keyRef.current;
      const u = userRef.current;
      if (!k || !u) return;
      pending.current = { userId: u, key: k, text: next };
      if (restoredRef.current !== k) {
        typedBeforeRestore.current = k;
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, ANSWER_DRAFT_DEBOUNCE_MS);
    },
    [flush],
  );

  const clear = useCallback(() => {
    setTextState("");
    const k = keyRef.current;
    const u = userRef.current;
    if (!k || !u) return;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    pending.current = null;
    typedBeforeRestore.current = null;
    void write({ userId: u, key: k, text: "" });
  }, [write]);

  return { text, setText, clear, storageError };
}
