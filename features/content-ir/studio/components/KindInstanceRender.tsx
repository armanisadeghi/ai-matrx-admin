"use client";

/**
 * The Matrix binding of `KindInstanceRender` — render ONE canonical kind
 * instance through the REAL production path, never a lookalike.
 *
 * The component itself lives in `@ai-matrx/content-ir/react`: the routing
 * three-state lifecycle ("checking" is not "missing"), the eager targeted
 * resolve, the warm-then-refresh order, the unroutable fallback rule, and the
 * bare/card variants. Read the semantics there. This module supplies our host
 * (SafeBlockRenderer + StructuredValueView + the Error Inspector) and keeps the
 * historical import path stable for the ~15 surfaces that render an instance.
 */

import { useEffect } from "react";
import {
  KindInstanceRender as SharedKindInstanceRender,
  kindIsRoutable as kindIsRoutableShared,
  isRecordValue as isRecordValueShared,
  type KindInstanceRenderProps,
} from "@ai-matrx/content-ir/react";
import {
  requestRichContentHost,
  useRichContentHostLanded,
} from "@ai-matrx/rich-content/host";
import { captureError } from "@/lib/diagnostics/errorCaptureStore";

/** A host that has not landed after this long is a failure, not a slow network. */
const HOST_LANDING_ALARM_MS = 20_000;
import { correctKindValue } from "@ai-matrx/rich-content/kinds/registry/kind-correctors";
import { KindCorrectionsNotice } from "@/features/content-ir/react/db-component/KindCorrectionsNotice";
import {
  ContentIrHostBoundary,
  matrxContentIrHost,
} from "@/features/content-ir/host/ContentIrHostBoundary";

export const isRecordValue = isRecordValueShared;

/**
 * True when `applyIrKindRoute` has a registered render path for this kind — a
 * compiled legacy bridge OR any ACTIVE resolver row (including db-sourced user
 * components, which route to `db_kind_component`).
 */
export function kindIsRoutable(kind: string): boolean {
  return kindIsRoutableShared(kind, matrxContentIrHost);
}

/**
 * Every stored-instance render (kind-instance loads, the shape preview's "direct" path, the
 * ~15 surfaces above) passes here, and the shared component builds its envelope inside the
 * package where the host cannot reach — so the value is corrected HERE, before it goes in
 * (kind-correctors.ts), and what changed is shown above it.
 */
export default function KindInstanceRender(props: KindInstanceRenderProps) {
  // THE HOST RACE (live, 2026-10-22, every stored instance outside chat): the kind
  // registry's database tiers — the `kind_component` rows that hold every
  // db-authored component — are registered by the LAZILY loaded rich-content host.
  // An instance drawn before it lands resolves against the compiled floor only, the
  // registry announces a bare host, and the shape settles on the "no custom
  // component yet" fallback for good (a product-capture analysis showed the
  // universal viewer on /manage while the same kind drew its board in chat).
  // `AnswerValueView` gated this per surface; this binding is the one place every
  // stored-instance render passes, so the gate lives here: a render is a demand
  // for the host, and the value waits for it behind a short skeleton.
  const hostLanded = useRichContentHostLanded();
  useEffect(() => {
    requestRichContentHost();
  }, []);
  // Nothing fails silently: a skeleton that never resolves is announced once.
  useEffect(() => {
    if (hostLanded) return;
    const timer = setTimeout(() => {
      captureError({
        source: "content-ir",
        message: `The rich-content host did not land within ${HOST_LANDING_ALARM_MS / 1000}s — kind "${props.kind}" is stuck on its skeleton.`,
      });
    }, HOST_LANDING_ALARM_MS);
    return () => clearTimeout(timer);
  }, [hostLanded, props.kind]);
  const { value, corrections } = correctKindValue(props.kind, props.value);
  if (!hostLanded) {
    return (
      <div
        className="h-24 animate-pulse rounded-lg bg-muted"
        data-kind-instance-waiting-for-host=""
      />
    );
  }
  return (
    <ContentIrHostBoundary>
      <KindCorrectionsNotice corrections={corrections} />
      <SharedKindInstanceRender {...props} value={value as KindInstanceRenderProps["value"]} />
    </ContentIrHostBoundary>
  );
}
