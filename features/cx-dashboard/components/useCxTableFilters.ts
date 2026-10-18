"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MatrxDataTableViewFilters } from "@ai-matrx/design-system/data-table/types";
import { clearCxTableFilters, hasActiveCxSourceFilters } from "../utils/filters";

/** The CX source filters a saved view carries (the CxFiltersBar's URL params). */
const CX_VIEW_FILTER_KEYS = ["timeframe", "start_date", "end_date", "user_id", "model_id", "provider", "status"] as const;

/**
 * Declares source filters to the canonical table: global Clear (`filter`) and saved views
 * (`viewFilters` — a view stores the timeframe/status/… and choosing it puts them back).
 */
export function useCxTableFilters(tableId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = CX_VIEW_FILTER_KEYS.map((k) => `${k}=${searchParams.get(k) ?? ""}`).join("&");
  const viewFilters = useMemo<MatrxDataTableViewFilters>(() => {
    const value: Record<string, unknown> = {};
    for (const part of key.split("&")) {
      const [k, v] = part.split("=");
      if (k && v) value[k] = v;
    }
    return {
      value,
      defaultValue: {},
      apply: (next) => {
        const params = new URLSearchParams(window.location.search);
        for (const k of CX_VIEW_FILTER_KEYS) {
          const v = next[k];
          if (typeof v === "string" && v) params.set(k, v);
          else params.delete(k);
        }
        const query = params.toString();
        router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
      },
    };
  }, [key, pathname, router]);
  return {
    active: hasActiveCxSourceFilters(new URLSearchParams(searchParams)),
    onReset: () => {
      // Read current URL so an immediately preceding table clear cannot be undone.
      const params = clearCxTableFilters(new URLSearchParams(window.location.search), tableId);
      const query = params.toString();
      router.push(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    viewFilters,
  };
}
