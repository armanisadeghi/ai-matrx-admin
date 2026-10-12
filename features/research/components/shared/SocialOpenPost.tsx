"use client";

// The one action a captured social post offers: open it on its platform.
// Stands in for the Read / fetch-odds controls, which do not apply to a post the social lane captured.

import { ExternalLink } from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export function SocialOpenPost({ url }: { url: string }) {
  return (
    <OutboundLink
      href={url}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 type-meta font-medium text-primary hover:underline whitespace-nowrap"
    >
      <ExternalLink className="h-3 w-3" />
      Open post
    </OutboundLink>
  );
}
