/**
 * What the Alchemy copy menu carries for a comparison: the WHOLE result (every contender, every field)
 * or ONE contender (just that item's own values). Pure, built from the result alone, so the page, the
 * shared page and the tests read the same bytes. The menu itself is `CopyButtons` — never a private copy.
 */

import type { AgentPayloadInput } from "@ai-matrx/alchemy/operate";

import type { ComparedItem, ComparisonResult } from "./contract";
import { comparedItems, headlineOf, verdictOf, whyLine, isNumeric } from "./verdict";

/** The items a copy covers: every contender, or the one named. */
function pick(result: ComparisonResult, itemId?: string): ComparedItem[] {
  return itemId ? result.items.filter((i) => i.item_id === itemId) : result.items;
}

function shown(item: ComparedItem, key: string): string {
  const v = item.values[key];
  return v && v.display !== "—" ? v.display : "—";
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

/** The one-line reading above the table ("Beta leads on 2 of 3"), whole copy only. */
function verdictLine(result: ComparisonResult): string {
  const h = headlineOf(result);
  if (h) return `${h.lead} ${h.rest}`;
  const v = verdictOf(result);
  return v.tie ? "A tie at the top" : "";
}

/** Markdown: whole copy is one table (fields down, contenders across); a single card is its own list. */
export function comparisonMarkdown(result: ComparisonResult, itemId?: string): string {
  const items = pick(result, itemId);
  const out: string[] = [`# ${itemId && items[0] ? items[0].name : `${result.kind_label} compared`}`];
  if (itemId && items[0]) {
    out.push(`${result.kind_label} · ranked ${items[0].rank > 0 ? `#${items[0].rank}` : "—"}`);
    const it = items[0];
    if (it.error) out.push("", it.error);
    out.push("");
    for (const f of result.fields) {
      const v = it.values[f.key];
      out.push(`- **${f.label}:** ${shown(it, f.key)}${v?.basis ? ` (${v.basis})` : ""}`);
    }
    return out.join("\n");
  }
  const line = verdictLine(result);
  if (line) out.push("", line);
  out.push("", `| Field | ${items.map((i) => cell(i.name)).join(" | ")} |`, `| --- | ${items.map(() => "---").join(" | ")} |`);
  for (const f of result.fields) {
    out.push(`| ${cell(f.label)} | ${items.map((i) => cell(shown(i, f.key))).join(" | ")} |`);
  }
  for (const i of items) if (i.error) out.push("", `${i.name}: ${i.error}`);
  return out.join("\n");
}

/** The structured copy (JSON + For AI data): each contender with every field's value, number and source. */
export function comparisonData(result: ComparisonResult, itemId?: string) {
  const items = pick(result, itemId);
  return {
    kind: result.kind_label,
    ...(itemId ? {} : { verdict: verdictLine(result) || null }),
    fields: result.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, direction: f.direction, ranksBy: f.is_primary })),
    contenders: items.map((i) => ({
      name: i.name,
      rank: i.rank > 0 ? i.rank : null,
      website: i.website,
      sourceUrl: i.source_url,
      source: i.source_label ?? null,
      note: i.thin_sample ?? null,
      error: i.error,
      values: Object.fromEntries(result.fields.map((f) => {
        const v = i.values[f.key];
        return [f.key, { shown: shown(i, f.key), value: v?.value ?? null, best: Boolean(v?.is_best), source: v?.basis || null }];
      })),
    })),
    ...(itemId ? {} : {
      readings: comparedItems(result).length > 1
        ? result.fields.filter(isNumeric).map((f) => ({ field: f.label, reading: whyLine(f, result) })).filter((r) => r.reading)
        : [],
    }),
  };
}

/** Everything `CopyButtons` needs, for the whole comparison or the one contender `itemId`. */
export function comparisonCopyProps(result: ComparisonResult, itemId?: string) {
  const item = itemId ? result.items.find((i) => i.item_id === itemId) : null;
  const label = item ? item.name : `${result.kind_label} comparison`;
  return {
    label,
    contentFlavor: "markdown" as const,
    human: () => comparisonMarkdown(result, itemId),
    json: () => comparisonData(result, itemId),
    agent: (): AgentPayloadInput => ({
      kind: item ? "comparison-contender" : "comparison",
      location: "AI Matrx — Compare",
      description: item
        ? `One contender from a ${result.kind_label} comparison, with every field's value and where it came from.`
        : `A ${result.kind_label} comparison: every contender and every field, with where each value came from.`,
      data: comparisonData(result, itemId),
    }),
  };
}
