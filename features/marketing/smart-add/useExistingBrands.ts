"use client";

/** Smart Add · the live duplicate check as a hook: asks once per distinct probe, keeps the last good answer. */
import { useEffect, useEffectEvent, useState } from "react";
import { useLatestRequest } from "@ai-matrx/kit/latest-request";
import { useAppSelector } from "@/lib/redux/hooks";
import { extractErrorMessage } from "@/utils/errors";
import { probeIsEmpty, probeKey, type BrandMatch, type BrandProbe } from "./brandMatch";
import { findMatchingBrands } from "./brandMatchLive";

export function useExistingBrands(probe: BrandProbe | null, ignoreBrandId: string | null = null): { matches: BrandMatch[]; error: string | null } {
  const key = probe && !probeIsEmpty(probe) ? probeKey(probe) : null;
  const [state, setState] = useState<{ key: string | null; matches: BrandMatch[]; error: string | null }>({ key: null, matches: [], error: null });
  const begin = useLatestRequest();
  // The check reads feature knobs, which need the session's organization. A page opened straight on a prefilled
  // entry asks on mount, BEFORE the organization has resolved, and the same probe never asks again (MKT-121: the
  // screen said "Couldn't check your brands" for good). The organization landing is a reason to ask again.
  const organizationId = useAppSelector((s) => s.appContext?.organization_id ?? null);
  const orgResolved = useAppSelector((s) => s.appContext?.orgBootstrapResolved ?? false);
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
  }, [key, ignoreBrandId, organizationId, orgResolved]);
  return key && state.key === key ? { matches: state.matches, error: state.error } : { matches: [], error: null };
}
