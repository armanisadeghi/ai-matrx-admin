"use client";

// components/official/structured-value/AnswerValueView.tsx
//
// THE ONE VIEW OF A SETTLED ANSWER — whatever a run handed back (an agent, a
// mandate, a workflow, a test bench), drawn by the platform's real renderers
// and never as a JSON dump (Arman, 2026-09-25: results always in the canonical
// viewer, never raw).
//
//   structured value + kind → the kind's own component (`KindInstanceRender`),
//                             whose floor is `StructuredValueView`. The kind is
//                             the caller's, else the value's own `__kind`.
//   structured value         → `StructuredValueView`;
//   text that is a file URL  → `InlineMediaRef` (durable file id, never the URL);
//   text                     → `MarkdownStream` (settled content).
//
// A surface with too little room bounds this in a scroll box and hands the
// whole answer to `structuredValueWindow` (`useOpenStructuredValueWindow`),
// which renders through this same view.

import { KIND_KEY } from "@ai-matrx/content-ir";
import { AnswerTextView } from "@/components/official/structured-value/AnswerTextView";
import KindInstanceRender from "@/features/content-ir/studio/components/KindInstanceRender";
import { KindFixItBar } from "@/features/content-ir/react/fixit/KindFixItBar";
import {
  StructuredValueView,
  type StructuredValueDensity,
} from "@/components/official/structured-value/StructuredValueView";

/** The kind a structured value claims for itself, when it carries one. */
export function kindOfValue(value: unknown): string | null {
  if (value == null || typeof value !== "object" || Array.isArray(value))
    return null;
  const kind = (value as Record<string, unknown>)[KIND_KEY];
  return typeof kind === "string" && kind.trim() ? kind : null;
}

export interface AnswerValueViewProps {
  /** The structured answer, when there is one. Wins over `text`. */
  value?: unknown;
  /** The text answer. */
  text?: string | null;
  /** The kind the answer is declared as. Default: the value's own `__kind`. */
  kind?: string | null;
  /** Density for the structured floor. */
  density?: StructuredValueDensity;
  /** What an empty answer says. */
  emptyText?: string;
}

export function AnswerValueView({
  value,
  text,
  kind,
  density,
  emptyText = "The run finished with an empty answer.",
}: AnswerValueViewProps) {
  if (value != null && typeof value === "object") {
    const routeKind = kind ?? kindOfValue(value);
    return routeKind ? (
      <KindInstanceRender
        kind={routeKind}
        value={value}
        showRoutingNote={false}
        variant="bare"
        unroutableFallback={
          // A kind that fell back explains itself and offers the one-click repair (build its component).
          <div className="min-w-0 space-y-2">
            <KindFixItBar kind={routeKind} value={value} />
            <StructuredValueView
              value={value}
              kind={routeKind}
              density={density}
            />
          </div>
        }
      />
    ) : (
      <StructuredValueView value={value} density={density} />
    );
  }
  // Text, a scalar, a file URL, marked kind JSON (AnswerTextView).
  return (
    <AnswerTextView
      value={value}
      text={text}
      density={density}
      emptyText={emptyText}
    />
  );
}
