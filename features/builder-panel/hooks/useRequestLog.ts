"use client";

import { useSyncExternalStore } from "react";
import { getRequestLog, subscribeRequestLog, type LoggedRequest } from "../requestLog";

const EMPTY: LoggedRequest[] = [];

/** The page's own requests (admin request log), live. */
export function useRequestLog(): LoggedRequest[] {
  return useSyncExternalStore(subscribeRequestLog, getRequestLog, () => EMPTY);
}
