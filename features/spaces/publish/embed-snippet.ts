// features/spaces/publish/embed-snippet.ts — a published Space on somebody else's website (J3).
//
// The snippet is the platform's ONE embed shape for a public link: an iframe of the page in embed mode
// (`?embed=1`), built by the same function forms use (`formEmbedSnippet("inline", …)`), so a Space and a
// form go into a website the same way. The public page needs no cookie, so the frame works with
// third-party cookies blocked.

import { formEmbedSnippet } from "@ai-matrx/records/forms";

/** The height a Space's iframe starts at; the host page may change it. */
export const SPACE_EMBED_START_HEIGHT_PX = 720;

export function spaceEmbedSnippet(publicUrl: string, title: string | null): string {
  return formEmbedSnippet("inline", publicUrl, {
    label: (title ?? "").trim() || "Page",
    height: SPACE_EMBED_START_HEIGHT_PX,
  });
}

/** `?embed=1` on /site/<link>: the page is drawn inside somebody else's website. */
export function isEmbedQuery(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === "1";
}
