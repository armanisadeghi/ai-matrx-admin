"use client";

// features/mandates/candidate-dialog/useMandateHomeBound.ts
//
// The organization that bounds a mandate's "Everyone" level, for the doors that
// hold only a mandate KEY (Find Usages rows, bench results, impact rows) and so
// cannot read `mandate.organization_id` off a record the way the mandate's own
// Candidates tab does. Reads the home org once per key, resolves its name from
// the person's organizations, and hands both to `mandateHomeBound` — the same
// answer the Candidates tab passes.

import { useEffect, useState } from "react";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import { createClient } from "@/utils/supabase/client";
import { mandateDefinitions } from "@/lib/supabase/mandateStorage";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";
import { useUserOrganizations } from "@/features/organizations/hooks";
import { mandateHomeBound } from "../mandate-home";

const homes = new Map<string, string | null>();

async function readHomeOrganizationId(mandateKey: AnyMandateKey): Promise<string | null> {
  const { data, error } = await mandateDefinitions(createClient())
    .select("organization_id")
    .is("deleted_at", null)
    .eq("mandate_key", mandateKey);
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.organization_id as string | null);
  // A system copy of the key means "Everyone" really is everyone.
  if (ids.some((id) => id && id.toLowerCase() === SYSTEM_ORGANIZATION_ID.toLowerCase())) {
    return SYSTEM_ORGANIZATION_ID;
  }
  return ids.find((id): id is string => Boolean(id)) ?? null;
}

/** Test seam — the cache is module state. */
export function __resetMandateHomeCache(): void {
  homes.clear();
}

/**
 * `ready` is false until the read answers; `homeName` is `mandateHomeBound`'s
 * answer (null = system-homed / no home). A failed read leaves `homeName` null
 * and is loud in the console — the label then says "Everyone", as before.
 */
export function useMandateHomeBound(mandateKey: AnyMandateKey): { ready: boolean; homeName: string | null } {
  const { organizations, loading: orgsLoading } = useUserOrganizations();
  const [homeId, setHomeId] = useState<string | null | undefined>(() => homes.get(mandateKey));

  useEffect(() => {
    if (homes.has(mandateKey)) {
      setHomeId(homes.get(mandateKey));
      return;
    }
    let cancelled = false;
    void readHomeOrganizationId(mandateKey)
      .then((id) => {
        homes.set(mandateKey, id);
        if (!cancelled) setHomeId(id);
      })
      .catch((error: unknown) => {
        console.error("[mandates] home organization read failed", mandateKey, error);
        if (!cancelled) setHomeId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [mandateKey]);

  if (homeId === undefined || orgsLoading) return { ready: false, homeName: null };
  const name = homeId ? (organizations.find((o) => o.id.toLowerCase() === homeId.toLowerCase())?.name ?? null) : null;
  return { ready: true, homeName: mandateHomeBound(homeId, name) };
}
