"use client";

// components/official/structured-value/AnswerTextView.tsx
//
// The NON-STRUCTURED half of `AnswerValueView` — a settled text (or scalar)
// answer: a file URL as
// `InlineMediaRef` (durable file id, never the URL), marked kind JSON handed
// to the canonical JSON detector intact, anything else as markdown. A kind in
// the text is drawn by the markdown renderer's own lazy kind path.
//
// Split out so a surface that only ever shows TEXT (the ProTextarea agent
// action popover, in every route's shell graph) never pulls the structured
// kind stack (KindInstanceRender → the content-ir component registry) into
// first load. Keep this module free of content-ir imports.

import { KIND_KEY } from "@ai-matrx/content-ir";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { RichContent } from "@ai-matrx/rich-content/levels/RichContent";
import { fileIdFromUserFilesUrl } from "@/lib/media/durability";
import {
  StructuredValueView,
  type StructuredValueDensity,
} from "@/components/official/structured-value/StructuredValueView";

/** True when the text is a JSON object that claims a `__kind`. */
function isMarkedKindJson(text: string): boolean {
  if (!text.trim().startsWith("{")) return false;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    const kind = (parsed as Record<string, unknown>)[KIND_KEY];
    return typeof kind === "string" && kind.trim() !== "";
  } catch {
    // Ordinary or incomplete text continues through the markdown renderer.
    return false;
  }
}

export interface AnswerTextViewProps {
  /** A scalar answer (string, number, boolean). Objects belong to `AnswerValueView`. */
  value?: unknown;
  /** The text answer. */
  text?: string | null;
  /** Density for a scalar shown through the structured floor. */
  density?: StructuredValueDensity;
  /** What an empty answer says. */
  emptyText?: string;
}

export function AnswerTextView({
  value,
  text,
  density,
  emptyText = "The run finished with an empty answer.",
}: AnswerTextViewProps) {
  const raw = typeof value === "string" ? value : (text ?? "");
  const shown = raw.trim();
  const fileId = shown ? fileIdFromUserFilesUrl(shown) : null;
  if (fileId) return <InlineMediaRef ref={fileId} size="xl" fit="cover" />;
  if (!shown) {
    if (value != null)
      return <StructuredValueView value={value} density={density} />;
    return <p className="type-body text-muted-foreground">{emptyText}</p>;
  }
  // Saved inputs can carry marked JSON as a string. Give its ORIGINAL text
  // to the canonical JSON detector: parsing it into a value here would lose
  // duplicate-key diagnostics before the Shape System can examine it. Only
  // the text that IS the answer is read — never a `text` beside a scalar.
  const kindJsonText =
    (value == null || typeof value === "string") && isMarkedKindJson(raw);
  return (
    <RichContent level="full"
      imagePolicy="ai"
      source={
        kindJsonText
          ? `\u0060\u0060\u0060json\n${shown}\n\u0060\u0060\u0060`
          : shown
      }
      hideCopyButton={false}
    />
  );
}
