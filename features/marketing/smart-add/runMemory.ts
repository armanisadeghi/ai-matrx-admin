"use client";

/**
 * Smart Add run memory: the answers a person gave BEFORE Create (Preferred / Ours / Not us / Related /
 * a web result's kind, and the values they typed themselves) are saved on the server as they are given and
 * restored when the session's `?run=` address is opened again. Before Create there is no brand, so
 * web.discovered_item (the home of a decision after Create) has nothing to attach to; the person's
 * own row in users.user_surface_state (one per session, keyed by its first run id) is the server store. It is
 * NOT a preference: it never rides the boot seed. Nothing is kept in the browser.
 *
 * Pure helpers (`pack`, `unpack`, `prune`) + one hook; the screen only calls the hook.
 */

import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@ai-matrx/chat/host/identity";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";
import type { Decision, EvidenceItem } from "./evidence";
import type { RelatedCandidate } from "./relations";
import type { WebChoice } from "./webKinds";

export interface RunAnswers {
  decisions: Record<string, Decision>;
  webChoices: Record<string, WebChoice>;
  relations: Record<string, RelatedCandidate>;
  namesakes: string[];
  /** Findings the person typed themselves (their decisions point at these; the run does not return them). */
  typed: EvidenceItem[];
  /** "Other → Skip for now": the finding keys (and compare candidate ids) the person set aside. */
  skipped: string[];
  /** "Other → Tagline or slogan": name finding key → the tagline finding it became (it is not a typed one). */
  taglines: Record<string, EvidenceItem>;
  /** The web review's "Ask me later" / "Ignore" marks. */
  webMarks: Record<string, WebMark>;
  /** Logo sources the person split out of their automatic group (each is a tile of its own); absent = grouped. */
  separated: string[];
  /** The validation page's "Ask me later" pile, oldest first (kept per brand: session `validate:<brand id>`). */
  later: string[];
}

export type WebMark = "later" | "ignored";

/**
 * EVERY kind of answer the screen keeps. A new kind must be added to `RunAnswers`, and TypeScript then forces
 * a line here; the test (`runMemory.test.ts`) fails until `emptyAnswers`, `unpack` and `isEmptyAnswers` carry it.
 */
export const ANSWER_KINDS = {
  decisions: true,
  webChoices: true,
  relations: true,
  namesakes: true,
  typed: true,
  skipped: true,
  taglines: true,
  webMarks: true,
  separated: true,
  later: true,
} as const satisfies Record<keyof RunAnswers, true>;

interface Stored extends RunAnswers {
  at: string;
}

/** users.user_surface_state.feature for every Smart Add session (surface_key = the session id). */
export const SMART_ADD_FEATURE = "smart_add";

const surfaceTable = () => supabase.schema("users").from("user_surface_state");

export const emptyAnswers = (): RunAnswers => ({ decisions: {}, webChoices: {}, relations: {}, namesakes: [], typed: [], skipped: [], taglines: {}, webMarks: {}, separated: [], later: [] });

export function isEmptyAnswers(a: RunAnswers): boolean {
  return (
    !Object.keys(a.decisions).length &&
    !Object.keys(a.webChoices).length &&
    !Object.keys(a.relations).length &&
    !a.namesakes.length &&
    !a.typed.length &&
    !a.skipped.length &&
    !Object.keys(a.taglines).length &&
    !Object.keys(a.webMarks).length &&
    !a.separated.length &&
    !a.later.length
  );
}

/** The typed findings that carry an answer (anything else comes back from the run). */
export function typedItems(items: Map<string, EvidenceItem>): EvidenceItem[] {
  return [...items.values()].filter((i) => i.source.kind === "typed");
}

function rec<T>(v: unknown): Record<string, T> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {};
}

export function unpack(raw: unknown): RunAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    decisions: rec<Decision>(r.decisions),
    webChoices: rec<WebChoice>(r.webChoices),
    relations: rec<RelatedCandidate>(r.relations),
    namesakes: Array.isArray(r.namesakes) ? r.namesakes.filter((x): x is string => typeof x === "string") : [],
    typed: Array.isArray(r.typed) ? (r.typed as EvidenceItem[]) : [],
    skipped: Array.isArray(r.skipped) ? r.skipped.filter((x): x is string => typeof x === "string") : [],
    taglines: rec<EvidenceItem>(r.taglines),
    webMarks: rec<WebMark>(r.webMarks),
    separated: Array.isArray(r.separated) ? r.separated.filter((x): x is string => typeof x === "string") : [],
    later: Array.isArray(r.later) ? r.later.filter((x): x is string => typeof x === "string") : [],
  };
}

/**
 * `sessionId`: the first run id of the session (null until a round starts). When the session opens, its saved
 * answers are read ONCE from the person's own row in users.user_surface_state (feature `smart_add`, surface_key
 * = the session); `restore` is called with them. After that every change to `answers` is saved to that row.
 * Nothing is written before the restore ran, so a reload can never wipe the saved answers. Nothing rides the
 * preferences boot seed: the state loads only when this screen engages with a session.
 */
export function useRunMemory(sessionId: string | null, answers: RunAnswers, restore: (saved: RunAnswers) => void) {
  const userId = useAppSelector(selectUserId);
  const restored = useRef<string | null>(null);
  const lastSaved = useRef<string>("");
  const hasRow = useRef(false);

  useEffect(() => {
    if (!sessionId || !userId || restored.current === sessionId) return;
    restored.current = sessionId;
    void (async () => {
      const { data } = await surfaceTable().select("state").eq("user_id", userId).eq("feature", SMART_ADD_FEATURE).eq("surface_key", sessionId).is("deleted_at", null).maybeSingle();
      const saved = unpack(data?.state);
      hasRow.current = !!data;
      if (saved) {
        lastSaved.current = JSON.stringify(saved);
        if (!isEmptyAnswers(saved)) restore(saved);
      }
      setReady(sessionId);
    })();
  }, [sessionId, userId, restore]);

  const [readyFor, setReady] = useState<string | null>(null);
  const body = JSON.stringify(answers);
  useEffect(() => {
    if (!sessionId || !userId || readyFor !== sessionId || body === lastSaved.current) return;
    if (!hasRow.current && isEmptyAnswers(answers)) return;
    lastSaved.current = body;
    void (async () => {
      const organizationId = await ensureOrgId(null);
      const { error } = await surfaceTable().upsert(
        { user_id: userId, created_by: userId, updated_by: userId, organization_id: organizationId, feature: SMART_ADD_FEATURE, surface_key: sessionId, state: { ...answers, at: new Date().toISOString() } as unknown as Json },
        { onConflict: "user_id,feature,surface_key" },
      );
      if (error) {
        lastSaved.current = "";
        console.error("Smart Add: could not save this session's answers", error.message);
      } else hasRow.current = true;
    })();
  }, [body, sessionId, userId, readyFor]);
}
