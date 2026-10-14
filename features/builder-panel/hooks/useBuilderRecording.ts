"use client";

/**
 * THE Builder recording switch: an admin with debug mode on. While true, pages publish to the
 * Builder feed and the request log records; when it turns false the request log stops and drops
 * what it kept (the feeds are dropped by the debug-mode reducer). The request-log chunk is never
 * downloaded until recording first turns on. FEATURE: ../FEATURE.md.
 */

import { useEffect } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import type { RootState } from "@/lib/redux/store";

type RequestLogModule = typeof import("../requestLog");
let requestLog: RequestLogModule | null = null;

export const selectBuilderRecording = (state: RootState): boolean =>
  Boolean(selectIsAdminDebugger(state)) && Boolean(selectIsDebugMode(state));

export function useBuilderRecording(): boolean {
  const on = useAppSelector(selectBuilderRecording);
  useEffect(() => {
    if (on) {
      void import("../requestLog").then((m) => {
        requestLog = m;
        m.setRequestRecording(true);
      });
    } else {
      requestLog?.setRequestRecording(false);
    }
  }, [on]);
  return on;
}
