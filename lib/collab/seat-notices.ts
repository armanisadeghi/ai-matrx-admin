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
