"use client";

/**
 * The presentation lens — what an Anyone link to a presentation shows: the NAME and the deck,
 * read-only, through the same Slideshow the editor's Present uses. The deck arrives as the link's
 * `children` (`{ kind: "presentation_deck", deck }`), projected by `platform.share_link_children`;
 * a deck over the size cap arrives as `too_large` and is said, never silently cut.
 */

import Slideshow, { type PresentationData } from "@/components/mardown-display/blocks/presentations/Slideshow";
import type { ShareLensProps } from "./registry";

function textOf(resource: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  for (const key of keys) {
    const v = resource?.[key];
    if (typeof v === "string" && v) return v;
  }
  return "";
}

export function PresentationShareLens({ result }: ShareLensProps) {
  const title = textOf(result.resource, "presentation_name", "name", "title") || "Presentation";
  const children = result.children as { kind?: string; deck?: PresentationData; too_large?: boolean } | null;
  const content = children && children.kind === "presentation_deck" ? children : null;
  const slides = content?.deck?.slides ?? [];
  return (
    <article className="mx-auto w-full max-w-5xl">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">{title}</h1>
      {content?.too_large ? (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          This presentation is too large to show here. Open it in AI Matrx.
        </p>
      ) : slides.length > 0 ? (
        <Slideshow slides={slides} theme={content?.deck?.theme ?? null} slideSize={content?.deck?.slideSize ?? null} />
      ) : (
        <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          This presentation has no slides yet.
        </p>
      )}
    </article>
  );
}
