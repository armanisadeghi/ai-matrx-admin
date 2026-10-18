"use client";

/**
 * Sign-up welcome — the shell's background found search (SIGNUP-WELCOME.md § The flow). Renders nothing and never
 * blocks: once the page is idle it reads the session it already holds (no request) and, only when there is work
 * (start the first round, watch a running one, or try again with new information), loads foundSearchBackground.ts.
 * An account whose search is told or settled loads nothing at all.
 */

import { useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { foundSearchNext, foundSearchState } from "./foundSearchState";

const idle = (fn: () => void): (() => void) => {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout: 5000 });
    return () => window.cancelIdleCallback(id);
  }
  const t = window.setTimeout(fn, 1500);
  return () => window.clearTimeout(t);
};

export function FoundSearchIsland() {
  useEffect(() => {
    let stop: (() => void) | null = null;
    let live = true;
    const cancel = idle(() => {
      void (async () => {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user || !live) return;
        const next = foundSearchNext(user);
        if (!next) return;
        try {
          const m = await import("./foundSearchBackground");
          if (!live) return;
          if (next !== "watch") await m.startFoundSearch();
          if (!live) return;
          const { data: after } = await supabase.auth.getSession();
          stop = m.watchFoundSearch(after.session?.user ? foundSearchState(after.session.user).startedAt : null);
        } catch (error) {
          // Never in the person's way (they did not ask for it): filed loudly (console-error capture), retried on the
          // next load.
          console.error("[found-search] The background search could not run; the next load tries again.", error);
        }
      })();
    });
    return () => {
      live = false;
      cancel();
      stop?.();
    };
  }, []);
  return null;
}
