"use client";

/**
 * The build list's change hints: `GET /runs/stream`, the caller's run announcements (one frame per new
 * run and per status change). A frame is only a hint to read the list again, so a burst settles into
 * one read. No clock: the feed is the only trigger, plus coming back to the tab.
 */

import { useEffect, useRef } from "react";
import { streamRunAnnouncements } from "@ai-matrx/api/workflows";
import { serverApi } from "@/lib/api/server-api";

const SETTLE_MS = 600;

export function useBuildRunAnnouncements(onChange: () => void): void {
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const hint = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        latest.current();
      }, SETTLE_MS);
    };
    const onReturn = () => {
      if (document.visibilityState === "visible") hint();
    };
    document.addEventListener("visibilitychange", onReturn);
    void (async () => {
      try {
        const stream = await streamRunAnnouncements(serverApi, {}, { signal: controller.signal });
        for await (const frame of stream) {
          if (frame && typeof frame === "object" && "data" in frame) hint();
        }
      } catch (e) {
        if (!controller.signal.aborted) console.error("[agent builds] the run announcements feed ended", e);
      }
    })();
    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, []);
}
