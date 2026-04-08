"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import { useContainerDrop } from "./useContainerDrop";
import type { ContainerDropValue, UseContainerDropConfig } from "./types";

const ContainerDropContext = createContext<ContainerDropValue | null>(null);

export function ContainerDropProvider({
  children,
  ...config
}: UseContainerDropConfig & { children: ReactNode }) {
  const value = useContainerDrop(config);

  return (
    <ContainerDropContext.Provider value={value}>
      {children}
    </ContainerDropContext.Provider>
  );
}

export function useContainerDropContext(): ContainerDropValue {
  const ctx = useContext(ContainerDropContext);
  if (!ctx) {
    throw new Error(
      "useContainerDropContext must be used within a <ContainerDropProvider>",
    );
  }
  return ctx;
}
