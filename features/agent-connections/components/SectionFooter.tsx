"use client";

import React from "react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

interface SectionFooterProps {
  description: string;
  learnMoreLabel?: string;
  learnMoreHref?: string;
}

export function SectionFooter({
  description,
  learnMoreLabel,
  learnMoreHref,
}: SectionFooterProps) {
  return (
    <div className="border-t border-border/50 px-4 py-3 shrink-0">
      <p className="text-sm text-muted-foreground">{description}</p>
      {/* "#" is a placeholder, not a destination — never render a dead link. */}
      {learnMoreLabel && learnMoreHref && learnMoreHref !== "#" && (
        <OutboundLink
          href={learnMoreHref}
          className="mt-1 inline-block text-sm text-sky-500 hover:text-sky-400 hover:underline"
        >
          {learnMoreLabel}
        </OutboundLink>
      )}
    </div>
  );
}

export default SectionFooter;
