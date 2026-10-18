// features/spaces/sidebar/row-link.tsx — a sidebar page row is a real link under its icon and title, so
// middle-click, cmd-click, right-click "Open in new tab" and the hover URL all work. A plain click is the row's
// own: the page opens in place, with no reload.

import { spaceHref } from "../nav/page-databases";

/** True for the plain left click the app handles in place; false for one the browser must handle (new tab / window). */
export function rowClickIsPlain(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function RowLink({ id, title }: { id: string; title: string }) {
  return (
    <a
      className="spaces-row-link"
      href={spaceHref(id)}
      draggable={false}
      tabIndex={-1}
      aria-label={title || "Untitled"}
      onClick={(e) => {
        if (rowClickIsPlain(e)) {
          e.preventDefault(); // the row's own onClick opens the page in place
        } else {
          e.stopPropagation(); // the browser opens the new tab / window; the row must not also navigate here
        }
      }}
    />
  );
}
