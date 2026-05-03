"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveSessionId,
  selectFetchStatus,
} from "../redux/selectors";
import { activeSessionIdSet } from "../redux/slice";
import { fetchSessionsThunk } from "../redux/thunks";
import type { StudioViewConfig } from "../types";
import { StudioLayout } from "./StudioLayout";

interface StudioViewProps {
  config: StudioViewConfig;
}

/**
 * Core entry for the Transcript Studio.
 *
 * The route (app/(authenticated)/transcript-studio/page.tsx) and the window
 * panel (features/window-panels/windows/transcript-studio/...) both mount
 * this component with different config so the same UI can render full-page
 * or inside a floating window.
 */
export function StudioView({ config }: StudioViewProps) {
  const dispatch = useAppDispatch();
  const fetchStatus = useAppSelector(selectFetchStatus);
  const activeSessionId = useAppSelector(selectActiveSessionId);
  const initialAppliedRef = useRef(false);

  // First-render hydration of the session list. The route hydrator may have
  // already populated Redux from SSR; we only fetch when no fetch has run.
  useEffect(() => {
    if (fetchStatus === "idle") {
      void dispatch(fetchSessionsThunk());
    }
  }, [fetchStatus, dispatch]);

  // Apply initialSessionId once on mount when present and not yet active.
  useEffect(() => {
    if (initialAppliedRef.current) return;
    initialAppliedRef.current = true;
    if (
      config.initialSessionId &&
      config.initialSessionId !== activeSessionId
    ) {
      dispatch(activeSessionIdSet(config.initialSessionId));
    }
  }, [config.initialSessionId, activeSessionId, dispatch]);

  return (
    <StudioLayout
      showSidebar={config.showSidebar ?? true}
      defaultColumnLayout={config.defaultColumnLayout}
    />
  );
}
