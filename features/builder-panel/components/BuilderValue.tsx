"use client";

/**
 * One value, rendered the smart way — the platform's canonical renderers, never a new one:
 *  - a registered `__kind` (in the data or declared by the publisher) → its kind component
 *    (`KindValueFrontDoor`, the one front door to the kind registry);
 *  - an image or web address → a preview / a new-tab link;
 *  - anything else → `StructuredValueView` (arrays of objects become a sortable table, small
 *    objects key/value lines, prose through markdown);
 *  - Raw → `JsonTreeViewer`.
 */

import { ExternalLink } from "lucide-react";
import { KindValueFrontDoor } from "@/components/official/structured-value/KindValueFrontDoor";
import { kindOfValue } from "@/components/official/structured-value/AnswerValueView";
import { StructuredValueView } from "@/components/official/structured-value/StructuredValueView";
import { JsonTreeViewer } from "@/components/official/json-explorer/JsonTreeViewer";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg|avif|ico)(\?|#|$)/i;

function asUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^https?:\/\/\S+$/i.test(text)) return null;
  try {
    return new URL(text).toString();
  } catch {
    return null;
  }
}

export function BuilderValue({ value, kind, raw }: { value: unknown; kind?: string | null; raw: boolean }) {
  if (raw) {
    return (
      <div className="min-w-0 text-xs">
        <JsonTreeViewer data={value} />
      </div>
    );
  }
  const url = asUrl(value);
  if (url) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        {IMAGE_RE.test(url) ? (
          <img src={url} alt="" className="max-h-64 max-w-full self-start rounded-md border border-border object-contain" />
        ) : null}
        <OutboundLink
          href={url}
          className="inline-flex min-w-0 items-center gap-1 text-sm text-primary hover:underline"
        >
          <span className="truncate">{url}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </OutboundLink>
      </div>
    );
  }
  if (value === null || value === undefined || value === "") {
    return <p className="text-sm text-muted-foreground">Empty</p>;
  }
  if (typeof value !== "object") {
    return <p className="whitespace-pre-wrap break-words text-sm">{String(value)}</p>;
  }
  const ownKind = kindOfValue(value);
  if (ownKind || kind) {
    return <KindValueFrontDoor value={value} kind={ownKind ?? kind ?? null} />;
  }
  return <StructuredValueView value={value} footer={false} />;
}
