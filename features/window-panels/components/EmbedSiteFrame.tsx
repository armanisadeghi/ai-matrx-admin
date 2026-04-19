"use client";

import { cn } from "@/lib/utils";

/** Matches IconInputWithValidation / Lucide embed — clipboard + fullscreen where allowed. */
const EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";
const EMBED_ALLOW = "clipboard-read; clipboard-write; fullscreen";

export interface EmbedSiteFrameProps {
  src: string;
  title: string;
  className?: string;
}

export function EmbedSiteFrame({ src, title, className }: EmbedSiteFrameProps) {
  return (
    <iframe
      title={title}
      src={src}
      className={cn(
        "h-full min-h-0 w-full flex-1 border-0 bg-background",
        className,
      )}
      sandbox={EMBED_SANDBOX}
      allow={EMBED_ALLOW}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
