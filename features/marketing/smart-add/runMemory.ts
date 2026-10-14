"use client";

/**
 * Smart Add run memory: the answers a person gave BEFORE Create (Preferred / Ours / Not us / Related /
 * a web result's kind, and the values they typed themselves) are saved on the server as they are given and
 * restored when the session's `?run=` address is opened again. Before Create there is no brand, so
 * web.discovered_item (the home of a decision after Create) has nothing to attach to; the person's synced
 * preferences are the server store, keyed by the session (its first run id). Nothing is kept in the browser.
 *
 * Pure helpers (`pack`, `unpack`, `prune`) + one hook; the screen only calls the hook.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
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

const MAX_SESSIONS = 30;

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

/** Keep the newest sessions; the rest are dropped (a session is only useful while its address is). */
export function prune(runs: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const keys = Object.keys(runs);
  if (keys.length <= MAX_SESSIONS) return runs;
  const newest = keys.sort((a, b) => String(runs[b].at ?? "").localeCompare(String(runs[a].at ?? ""))).slice(0, MAX_SESSIONS);
  return Object.fromEntries(newest.map((k) => [k, runs[k]]));
}

/**
 * `sessionId`: the first run id of the session (null until a round starts). `restore` is called once, when
 * the saved preferences have loaded, with what was saved for this session; after that every change to
 * `answers` is saved. Nothing is written before the restore ran, so a reload can never wipe the saved answers.
 */
export function useRunMemory(sessionId: string | null, answers: RunAnswers, restore: (saved: RunAnswers) => void) {
  const dispatch = useAppDispatch();
  const loaded = useAppSelector((s) => s.userPreferences._meta.loadStatus === "loaded");
  const allRuns = useAppSelector((s) => s.userPreferences.smartAdd.runs);
  const stored = sessionId ? allRuns[sessionId] : undefined;
  const restored = useRef<string | null>(null);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    if (!sessionId || !loaded || restored.current === sessionId) return;
    restored.current = sessionId;
    const saved = unpack(stored);
    if (saved) {
      lastSaved.current = JSON.stringify(saved);
      if (!isEmptyAnswers(saved)) restore(saved);
    }
  }, [sessionId, loaded, stored, restore]);

  const body = JSON.stringify(answers);
  useEffect(() => {
    if (!sessionId || !loaded || restored.current !== sessionId || body === lastSaved.current) return;
    if (!stored && isEmptyAnswers(answers)) return;
    lastSaved.current = body;
    const next = prune({ ...allRuns, [sessionId]: { ...answers, at: new Date().toISOString() } });
    dispatch(setPreference({ module: "smartAdd", preference: "runs", value: next }));
  }, [body, sessionId, loaded]);
}
