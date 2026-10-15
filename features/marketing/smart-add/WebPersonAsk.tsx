"use client";

/**
 * The inline "Who is this?" ask under the web step (MKT-040). A web result answered Founder / Key person is a
 * PAGE, not a person: its title ("Ritual Coffee Roasters — San Francisco… | day9.coffee") must never become the
 * person's name. Each such result gets one small name field, prefilled when the page names a person; Create
 * saves the person with the name typed here, and a result left blank is kept as a plain found page.
 */

import { Field } from "@ai-matrx/design-system/controls";
import type { EvidenceItem } from "./evidence";
import { websiteHost } from "./evidence";

export function WebPersonAsk({
  rows,
  names,
  onName,
}: {
  rows: { item: EvidenceItem; relation: string; guess: string | null }[];
  names: Record<string, string>;
  onName: (key: string, name: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-border/70 px-3 py-2" data-testid="smart-add-web-person-ask">
      {rows.map(({ item, relation, guess }) => (
        <div key={item.key} className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-xs text-foreground/80">{`${relation} · ${websiteHost(item.url ?? item.value)}`}</span>
          <Field
            aria-label={`${relation}'s name`}
            // ui-exception: a short raw value typed into one slot
            placeholder="Their name"
            value={names[item.key] ?? guess ?? ""}
            onChange={(e) => onName(item.key, e.target.value)}
            className="min-w-0 flex-1 basis-40"
            data-testid="smart-add-web-person-name"
          />
        </div>
      ))}
    </section>
  );
}
