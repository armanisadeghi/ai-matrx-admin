"use client";

// The rich-content host (the Read renderer's registrations, adapters, kinds) loads lazily
// on first demand, and until it lands the engine shows a note's SOURCE as plain text.
// A note surface asks for it the moment a note is on screen (so it is ready before
// anyone presses Read) and treats "not landed" as absent, never as raw text.

import { useEffect } from "react";
import {
  requestRichContentHost,
  useRichContentHostLanded,
} from "@ai-matrx/rich-content/host";

/** Starts loading the host (idempotent) and returns whether it has landed. */
export function useNoteRenderHost(): boolean {
  useEffect(() => {
    requestRichContentHost();
  }, []);
  return useRichContentHostLanded();
}
