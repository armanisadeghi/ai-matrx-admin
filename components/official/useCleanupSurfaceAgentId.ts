"use client";

/**
 * Lazy read of the shared cleanup surface's `clean` role agent.
 *
 * ProTextarea / ProInput only need this id once their "…" menu opens, so the
 * surface-config fetch (role / pref / config / mandate / system-org reads)
 * must not fire on mount for every writing box on every page. Pass
 * `enabled = menuOpen`; nothing is fetched until it is true, and the result
 * is the same single-flight Redux cache `useSurfaceAgentRoles` uses.
 */

import { useEffect } from "react";
import {
  ensureSurfaceConfig,
  selectSurfaceConfigEntry,
} from "@ai-matrx/chat/surfaces/redux/surfaceConfigSlice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";

export function useCleanupSurfaceAgentId(
  surfaceName: string,
  enabled: boolean,
): string | null {
  const dispatch = useAppDispatch();
  const entry = useAppSelector((s) => selectSurfaceConfigEntry(s, surfaceName));

  useEffect(() => {
    if (!enabled) return;
    void dispatch(ensureSurfaceConfig({ surfaceName }));
  }, [dispatch, enabled, surfaceName]);

  return (
    entry?.resolved?.roles?.clean?.effective?.[0]?.agentId ?? null
  );
}
