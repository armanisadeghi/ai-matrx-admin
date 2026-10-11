"use client";

import { useComposerPasteDataOffer } from "./usePasteDataOffer";

/** Mounted once in the /chat layout: a pasted address a data source covers gets the "Get as data table" offer. */
export function ChatPasteOffer() {
  useComposerPasteDataOffer();
  return null;
}
