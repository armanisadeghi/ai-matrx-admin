/**
 * Where a link's prefill lands on the person name card (MKT-103). The name card has rows for name, city, email,
 * occupation and company, and one "anything else" row that takes a school or a profile link. A person link
 * `?name=…&social=…` has no handle row to fill, so its `social` rides the "anything else" row instead of being dropped.
 * Pure.
 */
import type { SmartAddPrefill } from "./smartAddUrl";

export function personExtraPrefill(person: boolean, initial: Pick<SmartAddPrefill, "name" | "social"> | undefined): string {
  return person && initial?.name && initial.social ? initial.social : "";
}
