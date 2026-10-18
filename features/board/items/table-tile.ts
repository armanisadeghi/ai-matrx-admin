/**
 * THE TABLE TILE'S NAMES (pure, no UI): the item type key and the section layout word, kept on the tile as
 * `source.entity` and `source.meta.layout`. One home for the Add menu (`data-items.tsx`), Get data
 * (`data-fetch/GetDataBody.tsx`) and the board template packs (`templates/board-pack-plan.ts`).
 */

export const TABLE_ENTITY = "data-table";

/** `meta.layout` of a table tile drawn as a section (records-ui `SectionCard`) rather than the table page. */
export const TABLE_LAYOUT_SECTION = "section";

/** The plug-in looks that name what a section holds, most telling first (a colour table's name column is plain text). */
const LOOK_ORDER = ["color_pair", "color", "type_style", "measure", "shadow", "opacity", "motion", "html_sample", "attachment"] as const;

/** A column's look id and options, read defensively (the field document carries it as `display_format`). */
function lookOf(field: unknown): { id: string; options: Record<string, unknown> } | null {
  if (!field || typeof field !== "object") return null;
  const f = field as Record<string, unknown>;
  const df = f.display_format;
  if (df && typeof df === "object" && typeof (df as Record<string, unknown>).id === "string") {
    const o = (df as Record<string, unknown>).options;
    return { id: (df as { id: string }).id, options: o && typeof o === "object" ? (o as Record<string, unknown>) : {} };
  }
  if (typeof df === "string") return { id: df, options: {} };
  if (typeof f.format === "string") return { id: f.format, options: {} };
  return null;
}

/**
 * What a table holds, as the outline's icon hint (`engine/tile-chrome.ts` `LOOK_ICON` keys): the most
 * telling plug-in look its columns wear — a measure says spacing or radius by its preview. Null = none.
 */
export function tableLookHint(fields: readonly unknown[]): string | null {
  const looks = fields.map(lookOf).filter((l): l is { id: string; options: Record<string, unknown> } => l !== null);
  for (const id of LOOK_ORDER) {
    const hit = looks.find((l) => l.id === id);
    if (!hit) continue;
    if (id === "measure") {
      const preview = hit.options.measurePreview;
      return preview === "radius" ? "measure_radius" : preview === "spacing" ? "measure_spacing" : "measure";
    }
    return id;
  }
  return null;
}
