"use client";

/**
 * The editable preview of the text a screen will use from the picked Sources.
 *
 * The reading is the SERVER's (`POST /sources/resolve`, through `set.resolve`);
 * this hook only fetches it once the picks have settled, hands it to a text box
 * the person may correct, and says so when the server cut or left something out.
 * Nothing is read, scraped or cleaned in the browser. A change to the picks reads
 * again and replaces the box (a correction applies to the picks it was made on).
 */

import { useEffect, useRef, useState } from "react";

import type { ResolvedSourceSet } from "@ai-matrx/agents/sources";

import type { useSourceSet } from "./useSourceSet";

type SourceSetHandle = ReturnType<typeof useSourceSet>;

export interface ResolvedSourceText {
  text: string;
  setText: (next: string) => void;
  /** The person changed the server's text. */
  edited: boolean;
  loading: boolean;
  error: string | null;
  /** A Source was cut to the size chosen for it (the server's `truncated`). */
  truncated: boolean;
  /** Sources the server left out, in its own words. */
  droppedNotes: string[];
  /** Labels of the Sources whose text is in the box. */
  labels: string[];
  /** The server's resolved answer behind the box (null until read). */
  resolved: ResolvedSourceSet | null;
}

/** The Sources' texts joined in pick order — exactly how the server joins them for a generator. */
export function joinResolvedText(resolved: ResolvedSourceSet): string {
  return resolved.sources
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function useResolvedSourceText(
  set: SourceSetHandle,
  options: { enabled?: boolean; targetModelId?: string } = {},
): ResolvedSourceText {
  const { enabled = true, targetModelId } = options;
  const setRef = useRef(set);
  setRef.current = set;

  const landing = set.sources.some((s) => s.status === "pending" || s.status === "resolving");
  const anyReady = set.sources.some((s) => s.status === "ready" && s.draft.ref);
  let key = "";
  if (enabled && anyReady && !landing && !set.restoring) {
    try {
      key = JSON.stringify(set.toSourceSet({ targetModelId }));
    } catch {
      key = "";
    }
  }

  const [state, setState] = useState<{
    key: string;
    text: string;
    edited: boolean;
    loading: boolean;
    error: string | null;
    resolved: ResolvedSourceSet | null;
  }>({ key: "", text: "", edited: false, loading: false, error: null, resolved: null });

  useEffect(() => {
    if (!key) {
      setState({ key: "", text: "", edited: false, loading: false, error: null, resolved: null });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, key, loading: true, error: null }));
    setRef.current
      .resolve({ targetModelId })
      .then((resolved) => {
        if (!alive) return;
        setState({ key, text: joinResolvedText(resolved), edited: false, loading: false, error: null, resolved });
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setState({
          key,
          text: "",
          edited: false,
          loading: false,
          error: e instanceof Error ? e.message : "Your sources could not be read.",
          resolved: null,
        });
      });
    return () => {
      alive = false;
    };
    // `key` is the whole input: the settled picks as the server will read them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const readable = state.resolved?.sources.filter((s) => s.text.trim()) ?? [];
  return {
    text: state.text,
    setText: (next) => setState((s) => ({ ...s, text: next, edited: true })),
    edited: state.edited,
    loading: Boolean(key) && (state.loading || state.key !== key),
    error: state.error,
    truncated: readable.some((s) => s.truncated),
    droppedNotes: (state.resolved?.dropped ?? []).map(
      (d) => d.detail ?? `One source was left out (${d.reason.replace("_", " ")}).`,
    ),
    labels: readable.map((s) => s.label),
    resolved: state.resolved,
  };
}
