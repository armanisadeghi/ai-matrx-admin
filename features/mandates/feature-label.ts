// features/mandates/feature-label.ts
//
// THE FEATURE of a mandate: the part of the app it belongs to, read from its key's namespace
// ("seo.keyword_classifier" → "SEO"). Pure and light so any surface naming a mandate — the admin
// list, the record, the spend approvals board — shows the same Feature without loading the list.

import { splitMandateKey, type AnyMandateKey } from "@ai-matrx/agents/mandates";

const ACRONYMS = new Set([
  "ai",
  "crm",
  "seo",
  "ner",
  "pdf",
  "sms",
  "rag",
  "kg",
  "ir",
  "cx",
  "hr",
  "api",
  "ui",
]);

/** `content_plan` → "Content Plan", `seo` → "SEO". */
export function prettySegment(segment: string): string {
  return segment
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

/**
 * The part of the app a mandate belongs to. The key's namespace is the feature;
 * when the code declaration lives one module deeper under that same feature
 * (`aidream.services.seo.ai_visibility`) the sub-area is added.
 */
export function featureLabelOf(
  mandateKey: AnyMandateKey,
  sourceModule: string | null | undefined,
): string {
  const { feature } = splitMandateKey(mandateKey);
  if (feature === "shortcut") return "Shortcuts";
  if (feature === "app") return "Applets";
  const top = prettySegment(feature);
  if (!sourceModule) return top;
  const parts = sourceModule.split(".");
  const at = parts.indexOf(feature);
  const sub = at >= 0 ? parts[at + 1] : undefined;
  if (!sub || sub === "mandates" || sub === feature) return top;
  return `${top} › ${prettySegment(sub)}`;
}
