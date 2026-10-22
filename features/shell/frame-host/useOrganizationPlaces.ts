"use client";

// The ORGANIZATION rung of the `shell.sidebar.places` knob, read beside the effective value: the
// resolver answers the nearest rung's whole map, so a person's map would otherwise hide the
// organization's choices for the products they never edited (merged per product in relatedPlaces).
import { useEffect, useState } from "react";
import { fetchKnobRungOverrides } from "@/lib/scoped-config/service";
import { SIDEBAR_PLACES_KNOB } from "@/features/shell/frame/relatedPlaces";

const cache = new Map<string, Promise<unknown>>();

/** Drop the remembered reads (a test, or after the organization's rung is edited). */
export function forgetOrganizationPlaces(): void {
  cache.clear();
}

function readOrganizationPlaces(organizationId: string): Promise<unknown> {
  let read = cache.get(organizationId);
  if (!read) {
    read = fetchKnobRungOverrides({
      feature: SIDEBAR_PLACES_KNOB.feature,
      key: SIDEBAR_PLACES_KNOB.key,
      organizationId,
      kinds: ["organization"],
    })
      .then((rows) => rows.find((r) => r.scope_id === organizationId)?.value)
      .catch((error: unknown) => {
        cache.delete(organizationId);
        console.error("[sidebar-places] the organization's sidebar choices could not be read; showing defaults for products the person did not edit:", error);
        return undefined;
      });
    cache.set(organizationId, read);
  }
  return read;
}

export function useOrganizationPlaces(organizationId: string | null): unknown {
  const [value, setValue] = useState<{ organizationId: string; value: unknown } | null>(null);
  useEffect(() => {
    if (!organizationId) return;
    let live = true;
    void readOrganizationPlaces(organizationId).then((v) => {
      if (live) setValue({ organizationId, value: v });
    });
    return () => {
      live = false;
    };
  }, [organizationId]);
  return value?.organizationId === organizationId ? value.value : undefined;
}
