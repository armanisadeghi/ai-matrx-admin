"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type WADataMode = "mock" | "live";

interface WADataModeValue {
  mode: WADataMode;
  setMode: (mode: WADataMode) => void;
}

const WADataModeContext = createContext<WADataModeValue | null>(null);

interface ProviderProps {
  initialMode?: WADataMode;
  children: ReactNode;
}

export function WhatsAppDataModeProvider({
  initialMode = "mock",
  children,
}: ProviderProps) {
  const [mode, setMode] = useState<WADataMode>(initialMode);
  return (
    <WADataModeContext.Provider value={{ mode, setMode }}>
      {children}
    </WADataModeContext.Provider>
  );
}

export function useWhatsAppDataMode(): WADataModeValue {
  const ctx = useContext(WADataModeContext);
  if (!ctx) {
    return {
      mode: "mock",
      setMode: () => {},
    };
  }
  return ctx;
}
