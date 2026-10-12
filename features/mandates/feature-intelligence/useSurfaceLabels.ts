"use client";

// features/mandates/feature-intelligence/useSurfaceLabels.ts
//
// The surface registry's human labels (`ui.ui_surface.label`, public read), keyed
// by the internal surface name. Read once per session; until it lands, or for a
// name the registry has no label for, callers fall back to the internal name.

import { useEffect, useState } from "react";
import { readAllRows } from "@ai-matrx/data/db";
import { createClient } from "@/utils/supabase/client";

let cache: Promise<ReadonlyMap<string, string>> | null = null;

function loadSurfaceLabels(): Promise<ReadonlyMap<string, string>> {
  cache ??= readAllRows<{ name: string; label: string | null }>(
    ({ from, to }) =>
      createClient()
        .schema("ui")
        .from("ui_surface")
        .select("name, label", { count: "exact" })
        .order("name", { ascending: true })
        .range(from, to)
        .returns<{ name: string; label: string | null }[]>(),
    { label: "ui.ui_surface (labels)" },
  )
    .then((rows) => {
      const map = new Map<string, string>();
      for (const row of rows) if (row.label?.trim()) map.set(row.name, row.label.trim());
      return map;
    })
    .catch((cause: unknown) => {
      cache = null;
      throw cause;
    });
  return cache;
}

const EMPTY: ReadonlyMap<string, string> = new Map();

export function useSurfaceLabels(): ReadonlyMap<string, string> {
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(EMPTY);
  useEffect(() => {
    let cancelled = false;
    loadSurfaceLabels().then(
      (next) => {
        if (!cancelled) setLabels(next);
      },
      (cause: unknown) => console.error("[intelligence] surface labels could not be read", cause),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return labels;
}
