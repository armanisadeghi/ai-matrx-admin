"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OfficeLook } from "./office-look";

/** The look the server read from the person's cookie (null: unknown until saved preferences load). */
const OfficeLookSeedContext = createContext<OfficeLook | null>(null);

export function OfficeLookSeedProvider({ seed, children }: { seed: OfficeLook | null; children: ReactNode }) {
  return <OfficeLookSeedContext.Provider value={seed}>{children}</OfficeLookSeedContext.Provider>;
}

export function useOfficeLookSeed(): OfficeLook | null {
  return useContext(OfficeLookSeedContext);
}
