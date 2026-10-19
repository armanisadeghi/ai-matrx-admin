// features/unified-data/needsEditAccess.ts
//
// THE ONE DISABLED REASON for a control the access ladder does not let this person use on a record she may
// open but not edit (editor on the record, or admin of its organization). A control that cannot be used is drawn
// disabled with this word, never enabled and then refused. Shared by every surface that shows it
// (the record's Custom fields section, a table's automation switches).
export const NEEDS_EDIT_ACCESS = "Needs Edit access";

/**
 * Whether the store's answer for a record (`custom.entity_record_read`) says the ladder lets her edit it.
 * An answer that does not carry the fact (an older door) is read as "may edit", so nothing is hidden by a missing field.
 */
export function recordMayBeEdited(record: unknown): boolean {
  return !(record && typeof record === "object" && (record as { may_edit?: unknown }).may_edit === false);
}
