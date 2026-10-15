"use client";

// useAppFlag("name") — read one ops flag of the web app (`config.flags.<name>` on the `ai-matrx`
// app_config row) through the one app-config door, so the read is counted for attestation.
//
// ALWAYS pass a string literal: the release manifest finds flags by scanning for the literal call
// `useAppFlag("name")` (scripts/config-attestation/lib.ts). A computed name is listed as unresolved.
//
// An absent flag is `value: undefined` with `ready: true` — the CALLER states what absent means
// (it must mean today's behaviour). A failed read is `error`, never a quiet default; this hook
// logs it once per mount.
import { useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { readAppFlag } from "@/lib/config-attestation/appConfig";

export interface AppFlagState {
  value: boolean | undefined;
  /** The read finished (value may still be undefined = flag not set, or the read failed). */
  ready: boolean;
  error: PostgrestError | null;
}

export function useAppFlag(name: string): AppFlagState {
  const [state, setState] = useState<AppFlagState>({ value: undefined, ready: false, error: null });
  useEffect(() => {
    let cancelled = false;
    void readAppFlag(name).then(({ value, error }) => {
      if (cancelled) return;
      if (error) console.error(`[app-flag] flag "${name}" could not be read; its caller keeps current behaviour`, error);
      setState({ value, ready: true, error });
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return state;
}
