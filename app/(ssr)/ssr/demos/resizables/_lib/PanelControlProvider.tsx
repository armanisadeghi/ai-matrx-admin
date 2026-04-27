"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type RefObject,
} from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";

// Bridge for cross-portal panel control: header lives in PageHeader (portaled
// into the shell header), panels live in the page body. Both subtrees read
// the same React Context (portals propagate context through the React tree).
//
// Holds:
//   - refs    — registry of panelImperativeHandles keyed by name
//   - collapsed — boolean intent state (for toggle-icon flips), kept in sync
//                 with the panel via RegisteredPanel's onResize
//
// Library still owns SIZE. We only own intent + ref bookkeeping.

interface ContextValue {
  register: (name: string, ref: RefObject<PanelImperativeHandle | null>) => void;
  setCollapsed: (name: string, collapsed: boolean) => void;
  toggle: (name: string) => void;
  isCollapsed: (name: string) => boolean;
}

const Ctx = createContext<ContextValue | null>(null);

export function PanelControlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const refs = useRef<Record<string, RefObject<PanelImperativeHandle | null>>>({});
  const [collapsed, setCollapsedState] = useState<Record<string, boolean>>({});

  const register = useCallback(
    (name: string, ref: RefObject<PanelImperativeHandle | null>) => {
      refs.current[name] = ref;
    },
    [],
  );

  const setCollapsed = useCallback((name: string, value: boolean) => {
    setCollapsedState((s) => (s[name] === value ? s : { ...s, [name]: value }));
  }, []);

  const toggle = useCallback((name: string) => {
    const p = refs.current[name]?.current;
    if (!p) return;
    p.isCollapsed() ? p.expand() : p.collapse();
  }, []);

  const isCollapsed = useCallback(
    (name: string) => !!collapsed[name],
    [collapsed],
  );

  return (
    <Ctx.Provider value={{ register, setCollapsed, toggle, isCollapsed }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePanelControls() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("usePanelControls() must be used inside <PanelControlProvider>");
  }
  return ctx;
}
