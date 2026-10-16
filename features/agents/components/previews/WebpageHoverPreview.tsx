"use client";

/**
 * Lightweight hover preview for a webpage URL reference, drawn by THE Peek. No fetch — shows
 * the URL, parsed domain, and an optional pre-resolved preview/title from the
 * caller (e.g. ManagedResource.preview when the input pipeline already
 * scraped it).
 */

import { Peek, PeekHoverCard } from "@ai-matrx/design-system";
import { Globe } from "lucide-react";
import { peekLines } from "./peek-lines";

function parseDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface WebpagePreviewContentProps {
  url: string;
  /** Optional pre-resolved title (from scraped content). */
  title?: string | null;
  /** Optional pre-resolved snippet/preview text. */
  snippet?: string | null;
  /** `surface` when this is the card itself (a hover), `bare` inside a panel that already frames it. */
  frame?: "surface" | "bare";
}

export function WebpagePreviewContent({ url, title, snippet, frame = "bare" }: WebpagePreviewContentProps) {
  const domain = parseDomain(url);
  const trimmedTitle = title?.trim();
  const trimmedSnippet = snippet?.trim() ? (snippet.length > 400 ? snippet.slice(0, 400).trimEnd() + "…" : snippet) : "";
  const lines = peekLines(trimmedSnippet);

  return (
    <Peek
      frame={frame}
      record={{
        kind: "Webpage",
        id: url,
        // With no title the domain (or, failing that, the address) is the name — never a blank header.
        title: trimmedTitle || domain || url,
        ...(trimmedTitle && domain ? { subtitle: domain } : {}),
        glyph: Globe,
        body: [
          { property: "URL", value: url },
          ...(lines.length > 0 ? [{ section: "Preview", items: lines }] : []),
        ],
        // The old Copy URL button copied the address; Open went through the outbound door.
        copyData: url,
        href: url,
      }}
    />
  );
}

interface WebpageHoverPreviewProps {
  url: string;
  title?: string | null;
  snippet?: string | null;
  children: React.ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}

export function WebpageHoverPreview({ url, title, snippet, children, side = "top", align = "start" }: WebpageHoverPreviewProps) {
  return (
    <PeekHoverCard trigger={children} side={side} align={align} label="Webpage">
      <WebpagePreviewContent url={url} title={title} snippet={snippet} frame="surface" />
    </PeekHoverCard>
  );
}
