"use client";

// The Copy-for-AI error menu, loaded on render instead of at import. `app/global-error.tsx` and
// `app/not-found.tsx` are their own entries, and Next loads both on EVERY route; a static import of
// the menu (agent-copy, chat surfaces, summon) made Turbopack put a second and third copy of that
// whole graph into every route's first load (builder-G 2026-10-18: summon's boot code 3x on
// /pricing). Same props, same place in the box (the menu reads its parent at the click); renders
// nothing until the chunk arrives, and nothing if the chunk cannot load (a chunk failure is one
// reason global-error shows at all).
import { Component, lazy, Suspense, type ReactNode } from "react";
import type { ErrorAlchemyMenuProps } from "./ErrorAlchemyMenu";

const Menu = lazy(() => import("./ErrorAlchemyMenu").then((m) => ({ default: m.ErrorAlchemyMenu })));

class Quiet extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function LazyErrorAlchemyMenu(props: ErrorAlchemyMenuProps) {
  return (
    <Quiet>
      <Suspense fallback={null}>
        <Menu {...props} />
      </Suspense>
    </Quiet>
  );
}
