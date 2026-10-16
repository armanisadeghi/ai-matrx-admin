/** The pages of a `web_read` result that really failed AND carry a `coverage` list (a paid reader covers them). */

import type { ToolLifecycleEntry } from "@ai-matrx/chat/agents/types/request.types";
import { resultAsObject } from "@ai-matrx/chat/tool-call-visualization/renderers/_shared";

export interface FailedCoveredPage {
  url: string;
  coverage: unknown[];
}

export function failedCoveredPages(entry: ToolLifecycleEntry): FailedCoveredPage[] {
  const pages = resultAsObject(entry)?.pages;
  if (!Array.isArray(pages)) return [];
  const out: FailedCoveredPage[] = [];
  for (const p of pages) {
    if (!p || typeof p !== "object") continue;
    const page = p as Record<string, unknown>;
    const advanced = page.advanced_read && typeof page.advanced_read === "object" ? (page.advanced_read as Record<string, unknown>) : null;
    if (page.success !== false || typeof page.url !== "string" || !Array.isArray(page.coverage) || page.coverage.length === 0) continue;
    if (advanced?.ok === true) continue;
    out.push({ url: page.url, coverage: page.coverage });
  }
  return out;
}
