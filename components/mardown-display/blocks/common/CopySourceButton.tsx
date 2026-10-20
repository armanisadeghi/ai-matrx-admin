"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { Button } from "@ai-matrx/design-system/controls";
import { copyNotify } from "@/lib/clipboard/copy-notify";

/**
 * The one Copy in a block's header row (one frame, one button per action). A block that
 * draws its own header puts this beside Controls and the host's tools; it renders nothing
 * when the block has no source text to copy.
 */
export function CopySourceButton({ source }: { source?: string }) {
  const { copyText } = useClipboard({ notify: copyNotify });
  const [copied, setCopied] = useState(false);
  if (!source?.trim()) return null;
  const label = copied ? "Copied" : "Copy source";
  return (
    <Button
      variant="quiet"
      icon={copied ? <Check /> : <Copy />}
      aria-label={label}
      title={label}
      onClick={async () => {
        if (!(await copyText(source.trim()))) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    />
  );
}
