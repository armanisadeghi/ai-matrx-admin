"use client";

// features/visual-map-lab/useLabInspect.ts — "Inspect again": Alchemy's inspect() on the picture on screen, with the
// diagram engine's measure() injected, so the picture and the numbers describe the same moment.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { inspect, type InspectResult } from "@ai-matrx/alchemy/operate/inspect";

export interface FreshInspection extends InspectResult {
  url: string;
  at: number;
}

export function useLabInspect(containerRef: RefObject<HTMLElement | null>) {
  const [fresh, setFresh] = useState<FreshInspection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const freshRef = useRef<FreshInspection | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const run = useCallback(async (): Promise<FreshInspection | null> => {
    const host = containerRef.current;
    const target = host?.querySelector("svg") ?? host;
    if (!target) {
      setError("The picture is not on screen yet.");
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const { measure } = await import("@ai-matrx/diagrams/measure");
      const result = await inspect(target, { measure });
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(result.png);
      urlRef.current = url;
      const next = { ...result, url, at: Date.now() };
      freshRef.current = next;
      setFresh(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "The inspection failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [containerRef]);

  return { fresh, freshRef, busy, error, run };
}
