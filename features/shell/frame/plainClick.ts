import type { MouseEvent } from "react";

/** A plain left click goes to the host's handler; modified clicks keep the browser's link behaviour. */
export function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
