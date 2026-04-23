"use client";

import { createContext, useContext } from "react";
import type { Scope } from "../types";

export interface ScopeContextValue {
  scope: Scope;
  scopeId: string | null;
  setScope: (scope: Scope, scopeId: string | null) => void;
}

export const ScopeContext = createContext<ScopeContextValue | null>(null);

export function useScope(): ScopeContextValue {
  const ctx = useContext(ScopeContext);
  if (!ctx) {
    throw new Error(
      "useScope must be used inside an AgentConnectionsWindow ScopeContext.Provider",
    );
  }
  return ctx;
}
