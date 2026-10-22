"use client";

// The monthly spend-cap choices a person can bulk-set on the roster. A limit, so a feature knob
// (organizations.spend_cap_presets_points, json list of point amounts) — never a list in code, and
// no fallback: while it loads or when it cannot be read the verb says so and stays off.

import { useEffect, useState } from "react";
import { knobStringList } from "@/lib/knobs/featureKnobs";

export const SPEND_CAP_KNOB_FEATURE = "organizations";
export const SPEND_CAP_KNOB_KEY = "spend_cap_presets_points";

export interface SpendCapPresets {
  /** Point amounts as strings, in the order the knob lists them. null until read. */
  points: string[] | null;
  error: string | null;
}

export function useSpendCapPresets(): SpendCapPresets {
  const [state, setState] = useState<SpendCapPresets>({ points: null, error: null });
  useEffect(() => {
    let cancelled = false;
    knobStringList(SPEND_CAP_KNOB_FEATURE, SPEND_CAP_KNOB_KEY)
      .then((points) => {
        if (!cancelled) setState({ points, error: null });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ points: null, error: err instanceof Error ? err.message : "Could not read the cap choices" });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
