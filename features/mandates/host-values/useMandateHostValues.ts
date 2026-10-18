"use client";

/**
 * `useMandateHostValues(mandateKey, provision, values)` — the React door to the
 * host-values channel (./host-values.ts). While the calling component is
 * mounted, the first turn of every `mandateKey` conversation carries the
 * LATEST `values` (read at submit time, never at mount) as the mandate's
 * offered provision values. `mandateKey = null` provides nothing.
 */

import { useEffect, useRef } from "react";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { ProvisionKey } from "@ai-matrx/agents/generated/provision-offers";
import { provideHostValues, type HostValuesFor } from "./host-values";

export function useMandateHostValues<P extends ProvisionKey>(
  mandateKey: AnyMandateKey | null | undefined,
  provision: P,
  values: HostValuesFor<P>,
): void {
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  });
  useEffect(() => {
    if (!mandateKey) return undefined;
    return provideHostValues(mandateKey, provision, () => latest.current);
  }, [mandateKey, provision]);
}
