/**
 * Board — is a tile's content READY to be measured? (auto-height, grow-to-fit)
 *
 * A tile that lays out at its content's height writes that height to the board, and in page layout at the
 * full column that height is SAVED for everyone. A measurement taken while the body is still a skeleton, a
 * lazy chunk that rendered nothing yet, a table still loading its rows, or a page that is hidden or not laid
 * out is not the content's height: saving it collapsed every section of a board to 154px (2026-10-18).
 *
 * Ready means, all at once:
 *  - the document is visible and the card is laid out (it has a box and a height);
 *  - the body rendered something a person can see (text, or a media / control / table element);
 *  - nothing inside says it is still loading: no `aria-busy="true"` (records-ui `RecordsSkeleton` and the
 *    SectionCard's loading rows), no `data-tile-skeleton` (the board's own placeholder), no
 *    `data-records-skeleton`.
 * A body that is still loading announces it with one of those; a new loading state must do the same.
 */

/** What marks content still loading. */
export const LOADING_SELECTOR = '[aria-busy="true"],[data-tile-skeleton],[data-records-skeleton]';

/** Elements that are content even without text. */
const VISIBLE_CONTENT_SELECTOR = "img,svg,canvas,video,iframe,input,textarea,select,[role=table],[role=img]";

export function tileContentReady(card: HTMLElement, doc: Pick<Document, "visibilityState"> = document): boolean {
  if (doc.visibilityState === "hidden") return false;
  if (!card.isConnected || card.offsetHeight <= 0 || card.getClientRects().length === 0) return false;
  const body = card.querySelector<HTMLElement>("[data-board-body]");
  if (!body || !body.firstElementChild) return false;
  if (body.querySelector(LOADING_SELECTOR)) return false;
  return (body.textContent ?? "").trim() !== "" || body.querySelector(VISIBLE_CONTENT_SELECTOR) !== null;
}
