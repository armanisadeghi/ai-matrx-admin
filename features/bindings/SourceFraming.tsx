// features/bindings/SourceFraming.tsx
//
// READ-ONLY: how a source frames the text it delivers. The server's binding
// combiner lets an offered-value source declare `template`, `item_template`,
// `item_separator` and `separator` (aidream 3f068eaa95); this screen carries
// them through a Save untouched (see `consumptionMapForApi`) and shows them so
// nobody saves a map blind to the framing it holds. Shown only when set.

import type { ConsumptionEntry } from "@/features/mandates/provision-shapes";

export const FRAMING_FIELDS = [
  { key: "template", label: "Template" },
  { key: "item_template", label: "Each entry" },
  { key: "item_separator", label: "Between entries" },
  { key: "separator", label: "Before this part" },
] as const;

/** The framing fields a stored source declares, in display order. Reads the
 * entry by key, so it works before and after the shared type learns the names. */
export function framingFieldsOf(
  entry: ConsumptionEntry,
): { key: string; label: string; value: string }[] {
  const stored = entry as unknown as Readonly<Record<string, unknown>>;
  const out: { key: string; label: string; value: string }[] = [];
  for (const { key, label } of FRAMING_FIELDS) {
    const value = stored[key];
    if (typeof value === "string") out.push({ key, label, value });
  }
  return out;
}

/** A separator is often only whitespace; print it so it can be read. */
export function visibleText(value: string): string {
  return value.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

export function SourceFraming({ entry }: { entry: ConsumptionEntry }) {
  if (entry.mapType !== "offered_value") return null;
  const fields = framingFieldsOf(entry);
  if (fields.length === 0) return null;
  return (
    <dl
      data-testid="source-framing"
      className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-[11.5px]"
    >
      {fields.map(({ key, label, value }) => (
        <div key={key} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words font-mono text-foreground">
            {visibleText(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
