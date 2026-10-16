"use client";

/**
 * The app's half of the canonical contact values (@ai-matrx/design-system): the address check the
 * peek's Validate action calls — the server's POST /geo/validate-address. Mounted once in Providers.
 */
import type { ReactNode } from "react";

import { ContactValuesHostProvider, type AddressValidation } from "@ai-matrx/design-system";

import { postJson } from "@/lib/python-client";

async function validateAddress(address: string): Promise<AddressValidation> {
  const { data } = await postJson<AddressValidation & { reachable?: boolean }>("/geo/validate-address", { address });
  if (data.reachable === false) throw new Error("The address check is unreachable right now");
  return data;
}

export function ContactValuesHost({ children }: { children: ReactNode }) {
  return <ContactValuesHostProvider validateAddress={validateAddress}>{children}</ContactValuesHostProvider>;
}
