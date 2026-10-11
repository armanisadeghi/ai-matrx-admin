// features/esign/editor/fieldSizing.ts — the default box of a field that holds OPTIONS, sized to them.
// Kept beside (not inside) model.ts: the kind table there gives every kind one fixed box, which is
// right for a signature and wrong for a dropdown whose longest option is a sentence or a radio that
// is not round on the page.

import type { DraftField } from "../contract/draft";
import { clampBox } from "./model";


/** One character of the 10.5 pt value text, as a fraction of the page width. */
const CHAR_W = 0.0078;
/** Room for the chevron and the box's own padding. */
const DROPDOWN_CHROME = 0.06;
const DROPDOWN_MIN_W = 0.24;
const DROPDOWN_MAX_W = 0.55;
/** A mark box (radio, checkbox): a true square of this many points. */
const MARK_PT = 18;

/** The box a newly placed field starts with: the kind's own for most, fitted to the options for the rest. */
export function placedBox(field: DraftField): { w: number; h: number } {
  if (field.kind === "dropdown") {
    const longest = Math.max(0, ...(field.options ?? []).map((o) => o.length));
    return { w: Math.min(DROPDOWN_MAX_W, Math.max(DROPDOWN_MIN_W, longest * CHAR_W + DROPDOWN_CHROME)), h: field.h };
  }
  if (field.kind === "radio" || field.kind === "checkbox") {
    // Round on paper means square in fractions of a page that is not: the old 0.025 x 0.02 drew an oval.
    return { w: MARK_PT / 612, h: MARK_PT / 792 };
  }
  return { w: field.w, h: field.h };
}

/** `field` re-boxed by `placedBox`, centred on where it was dropped and kept on the page. */
export function withPlacedBox(field: DraftField): DraftField {
  const { w, h } = placedBox(field);
  const cx = field.x + field.w / 2;
  const cy = field.y + field.h / 2;
  return clampBox({ ...field, w, h, x: cx - w / 2, y: cy - h / 2 });
}

