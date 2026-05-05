"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ModalKey = "settings" | "media" | null;

interface ModalContextValue {
  open: ModalKey;
  openSettings: () => void;
  openMedia: () => void;
  close: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<ModalKey>(null);
  return (
    <ModalContext.Provider
      value={{
        open,
        openSettings: () => setOpen("settings"),
        openMedia: () => setOpen("media"),
        close: () => setOpen(null),
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useWAModals(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    return {
      open: null,
      openSettings: () => {},
      openMedia: () => {},
      close: () => {},
    };
  }
  return ctx;
}
