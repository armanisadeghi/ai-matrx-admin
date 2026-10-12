"use client";

/**
 * Provider-fallback state (UI-SPEC §1.2): a small "Backup source" chip when
 * the primary provider was skipped. Vendor names never render on a customer screen
 * (they live in the admin app only), and neither does the vendor's own reason text.
 * Renders nothing
 * when there was no fallback, and sits in a slot the caller reserves — it
 * never pushes content. A both-providers-failed state is the caller's error
 * label + Retry with the last good snapshot date (`DataFreshnessLine`).
 */

import { Badge } from "@ai-matrx/design-system/controls";

import type { SocialProviderTrace } from "../types";

/** True when the trace carries a fallback worth announcing. */
export function hasFallback(trace: Pick<SocialProviderTrace, "fallback_reason"> | null | undefined): boolean {
  return Boolean(trace?.fallback_reason);
}

export function ProviderFallbackNotice({
  trace,
}: {
  trace: Pick<SocialProviderTrace, "provider" | "fallback_reason"> | null | undefined;
}) {
  if (!trace || !trace.fallback_reason) return null;
  return (
    <span className="inline-flex">
      <Badge tone="warning">Backup source</Badge>
    </span>
  );
}

/** Where the data came from: "Backup source" only when a fallback happened. Nothing otherwise. */
export function ProviderChip({
  trace,
}: {
  provider?: string | null;
  trace?: Pick<SocialProviderTrace, "provider" | "fallback_reason"> | null;
}) {
  return <ProviderFallbackNotice trace={trace} />;
}
