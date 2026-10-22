"use client";

// features/scopes/components/pages/orgHeaderActions.tsx
//
// A PAGE ADDS ITS ACTIONS TO THE ORGANIZATION LAYOUT'S ONE HEADER. Every
// `/organizations/[orgId]/**` page shares the header the layout draws
// (`ScopesRouteHeader`); a page with an action of its own (Refresh on the
// shortcuts pages) declares it here and the header lists it with the level's
// own actions — one list, never a second control portalled beside it
// (crumb-doors law: features/shell/FEATURE.md § Every crumb is a door, rule 3).

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { HeaderAction } from "./HeaderActionGroup";

type Declare = (actions: readonly HeaderAction[]) => () => void;

// Two contexts: the declare door is stable (a page's effect never re-runs because the header
// re-rendered), the list is what the header reads.
const DeclareContext = createContext<Declare | null>(null);
const ActionsContext = createContext<readonly HeaderAction[]>([]);

/** Wraps the organization layout (header + page) so a page's actions reach the header. */
export function OrgHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<readonly HeaderAction[]>([]);
  const [declare] = useState<Declare>(() => (next: readonly HeaderAction[]) => {
    setActions(next);
    return () => setActions((now) => (now === next ? [] : now));
  });
  return (
    <DeclareContext.Provider value={declare}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </DeclareContext.Provider>
  );
}

/** The actions the current page declared (the header appends them to its own). */
export function useOrgPageHeaderActions(): readonly HeaderAction[] {
  return useContext(ActionsContext);
}

/** What a declaration re-renders on: identity, look and state — never the handler (the latest one always runs). */
function declarationKey(actions: readonly HeaderAction[]): string {
  return JSON.stringify(actions.map((a) => [a.key, a.icon, a.label, a.href, a.disabled, a.busy, a.danger]));
}

/** A page declares its own actions into the organization layout's header. */
export function useOrgHeaderActions(actions: readonly HeaderAction[]): void {
  const declare = useContext(DeclareContext);
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });
  const key = declarationKey(actions);
  useEffect(() => {
    if (!declare) return;
    return declare(
      latest.current.map((a) => ({
        ...a,
        onClick: a.onClick ? () => latest.current.find((now) => now.key === a.key)?.onClick?.() : undefined,
      })),
    );
  }, [declare, key]);
}
