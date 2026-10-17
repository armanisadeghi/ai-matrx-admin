"use client";

import { Info } from "lucide-react";
import { Peek, PeekPopover, type PeekBlock } from "@ai-matrx/design-system";

/**
 * THE explanation door for marketing surfaces: what a card, room or field is FOR lives in a Peek
 * behind a small info button — never as a paragraph on the page (interface text is layout).
 * `about` is the one-paragraph answer; `more` adds labelled sections (what feeds it, who reads it).
 */
export function AboutPeek({
  title,
  about,
  more,
  kind = "About",
  label,
}: {
  title: string;
  about: string;
  more?: ReadonlyArray<{ section: string; text?: string; items?: readonly string[] }>;
  kind?: string;
  /** Accessible name of the button; defaults to "About {title}". */
  label?: string;
}) {
  const body: PeekBlock[] = [{ section: "What it is", text: about }, ...(more ?? [])];
  return (
    <PeekPopover
      label={title}
      side="bottom"
      align="start"
      trigger={
        <button
          type="button"
          aria-label={label ?? `About ${title}`}
          title={label ?? `About ${title}`}
          className="matrx-tap-area inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      }
    >
      <Peek size="sm" record={{ kind, id: `about:${title}`, title, body, copyData: false }} />
    </PeekPopover>
  );
}
