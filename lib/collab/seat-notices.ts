/**
 * What a seat without edit access is told when it tries to change a document or sheet (one source for Docs and Sheets).
 * A seat that may comment is told it can; a seat that may only look is told that. Plain words, no jargon. The thing is
 * named per product: a Doc is a "document", a Sheet is a "spreadsheet".
 */
export type SeatProduct = "document" | "spreadsheet";

export const commentOnlyNotice = (product: SeatProduct = "document") =>
  `You can comment on this ${product}, but changing it needs edit access. Ask its owner.`;
export const viewOnlyNotice = (product: SeatProduct = "document") =>
  `You have view access only. Ask the owner for edit access to change this ${product}.`;

export const COMMENT_ONLY_NOTICE = commentOnlyNotice();
export const VIEW_ONLY_NOTICE = viewOnlyNotice();

/** The refusal for a seat that cannot edit. */
export function seatRefusal(commentOnly: boolean, product: SeatProduct = "document"): string {
  return commentOnly ? commentOnlyNotice(product) : viewOnlyNotice(product);
}

/**
 * What a seat is told when its own change cannot travel to the other editors yet and was put back (`not_shared`).
 * A table is the common case, so it is named; anything else says what happened in the same plain words.
 * `mutationId` is the Univer mutation that could not travel (Sheets); Docs has none.
 */
export function notSharedNotice(mutationId?: string): { title: string; description: string } {
  if (mutationId && /table/i.test(mutationId)) {
    return { title: "Tables can't be shared yet", description: "Tables can't be shared while others are editing yet — your table was removed." };
  }
  return { title: "That change was removed", description: "It can't be shared with other editors yet, so it was taken back." };
}

/**
 * What a seat is told when its sheet disagreed with everyone else's and was reloaded to match, changing what the person
 * sees (`resynced`). One short line; the seat keeps working.
 */
export function resyncedNotice(): { title: string } {
  return { title: "Your sheet was refreshed to match everyone else" };
}
