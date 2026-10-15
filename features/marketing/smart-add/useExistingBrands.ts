"use client";

/** Smart Add · the live duplicate check as a hook: asks once per distinct probe, keeps the last good answer. */
import { useEffect, useEffectEvent, useState } from "react";
import { useLatestRequest } from "@ai-matrx/kit/latest-request";
import { extractErrorMessage } from "@/utils/errors";
import { probeIsEmpty, probeKey, type BrandMatch, type BrandProbe } from "./brandMatch";
import { findMatchingBrands } from "./brandMatchLive";

export function useExistingBrands(probe: BrandProbe | null, ignoreBrandId: string | null = null): { matches: BrandMatch[]; error: string | null } {
  const key = probe && !probeIsEmpty(probe) ? probeKey(probe) : null;
  const [state, setState] = useState<{ key: string | null; matches: BrandMatch[]; error: string | null }>({ key: null, matches: [], error: null });
  const begin = useLatestRequest();
  const ask = useEffectEvent(() => {
    const isLive = begin();
    if (!probe || !key) return; // no probe: the result below is already empty, and `begin()` retired any earlier ask
    findMatchingBrands(probe, { ignoreBrandId }).then(
      (matches) => isLive() && setState({ key, matches, error: null }),
      (e: unknown) => isLive() && setState({ key, matches: [], error: extractErrorMessage(e) }),
    );
  });
  useEffect(() => {
    ask();
  }, [key, ignoreBrandId]);
  return key && state.key === key ? { matches: state.matches, error: state.error } : { matches: [], error: null };
}
