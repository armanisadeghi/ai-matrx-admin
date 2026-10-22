// features/hr/shared/HrProvider.tsx
//
// Mounts ONE employer resolution for the whole `/hr` tree. Without it every shell,
// nav item, page and panel would fire its own `hr_my_context` — and worse, they
// could briefly disagree about which employer they are showing, which in a
// single-employer module is a data-integrity problem, not a performance one.
//
// Mounted in `app/(core)/hr/layout.tsx`. Nothing else should mount it.

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { registerShellValueSource } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";

import { hrShellValues } from "@/features/surfaces/utils/module-values";
import { HrRuntimeContext, useHrContextResolver } from "./useHrContext";

export function HrProvider({ children }: { children: ReactNode }) {
  const value = useHrContextResolver();
  // The HR module's values (employer, persona, scope) for every surface under it, from this one
  // resolution — no second `hr_my_context` read (surface declarations W1 §1a).
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  useEffect(() => registerShellValueSource(hrShellValues(() => latest.current)), []);
  return (
    <HrRuntimeContext.Provider value={value}>{children}</HrRuntimeContext.Provider>
  );
}
