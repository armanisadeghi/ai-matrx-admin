"use client";

/** Smart Add · the live duplicate check as a hook: asks once per distinct probe, keeps the last good answer. */
import { useEffect, useEffectEvent, useState } from "react";
import { extractErrorMessage } from "@/utils/errors";
import { probeIsEmpty, probeKey, type BrandMatch, type BrandProbe } from "./brandMatch";
import { findMatchingBrands } from "./brandMatchLive";

export function useExistingBrands(probe: BrandProbe | null, ignoreBrandId: string | null = null): { matches: BrandMatch[]; error: string | null } {
  const key = probe && !probeIsEmpty(probe) ? probeKey(probe) : null;
  const [state, setState] = useState<{ key: string | null; matches: BrandMatch[]; error: string | null }>({ key: null, matches: [], error: null });
  const ask = useEffectEvent((isLive: () => boolean) => {
    if (!probe || !key) {
      setState({ key: null, matches: [], error: null });
      return;
    }
    findMatchingBrands(probe, { ignoreBrandId }).then(
      (matches) => isLive() && setState({ key, matches, error: null }),
      (e: unknown) => isLive() && setState({ key, matches: [], error: extractErrorMessage(e) }),
    );
  });
  useEffect(() => {
    let live = true;
    ask(() => live);
    return () => {
      live = false;
    };
  }, [key, ignoreBrandId]);
  return key && state.key === key ? { matches: state.matches, error: state.error } : { matches: [], error: null };
}
