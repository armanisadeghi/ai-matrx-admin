// features/education/memory/itemCitations.ts
//
// Per-item citations for a memory aid. A mnemonic / analogy / palace stop has no
// citation field in its kind, so the citation of each is kept beside the aid
// (`study_media.config.itemCitations`), keyed by what the item SAYS — not its
// position — so deleting or reordering items never shifts a citation onto another
// item, and an item the person edited loses its key (and so its citation) rather
// than keep claiming a passage it no longer matches.

import type { MemoryAidPayload } from "@/features/content-ir/kinds/memory-aid";
import type { SourceCitation } from "@/features/education/trust/types";
import { citationForItem } from "@/features/education/create/chunkCitations";
import type { GroundedChunk } from "@/features/education/create/groundedMaterial";

export type MemoryItemKind = "mnemonic" | "analogy" | "locus";
export type ItemCitations = Record<string, SourceCitation>;

const norm = (v: unknown): string => (typeof v === "string" ? v.toLowerCase().replace(/\s+/g, " ").trim() : "");

/** What identifies an item: its kind plus the words that make it that item. */
export function memoryItemKey(kind: MemoryItemKind, item: unknown): string {
  const i = (item ?? {}) as Record<string, unknown>;
  const parts =
    kind === "mnemonic" ? [i.target, i.device] : kind === "analogy" ? [i.concept, i.analogy] : [i.place, i.item];
  return `${kind}:${parts.map(norm).join("|")}`;
}

function itemText(kind: MemoryItemKind, item: Record<string, unknown>): string {
  const fields =
    kind === "mnemonic"
      ? [item.target, item.device, item.explanation]
      : kind === "analogy"
        ? [item.concept, item.analogy, item.mapping]
        : [item.place, item.item, item.image];
  return fields.filter((v): v is string => typeof v === "string" && v.length > 0).join(" ");
}

/** The citation of every item that traces to a passage; items matching none are left out. */
export function citeMemoryAid(aid: MemoryAidPayload, chunks: readonly GroundedChunk[]): ItemCitations {
  const out: ItemCitations = {};
  if (chunks.length === 0) return out;
  const add = (kind: MemoryItemKind, item: unknown) => {
    const rec = item as Record<string, unknown>;
    const c = citationForItem(rec, itemText(kind, rec), chunks);
    if (c) out[memoryItemKey(kind, item)] = c;
  };
  for (const m of aid.mnemonics) add("mnemonic", m);
  for (const a of aid.analogies) add("analogy", a);
  for (const l of aid.memory_palace.loci) add("locus", l);
  return out;
}

/** The stored citations from a media row's config (tolerant of anything else there). */
export function itemCitationsOf(config: unknown): ItemCitations {
  const raw = (config as { itemCitations?: unknown } | null | undefined)?.itemCitations;
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      ([, v]) => v && typeof v === "object" && typeof (v as SourceCitation).sourceId === "string",
    ),
  ) as ItemCitations;
}
