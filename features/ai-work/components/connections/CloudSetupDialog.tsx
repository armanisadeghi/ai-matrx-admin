"use client";

/**
 * "Use AI Matrx in <app>": the steps and the address a person pastes into the app's own settings,
 * opened from its cloud-accounts table instead of sitting on the page as a card.
 */

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ai-matrx/design-system";
import { Button } from "@ai-matrx/design-system/controls";

import { toast } from "@/lib/toast";

export function CloudSetupDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  url,
  what,
  link,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  steps: string[];
  url: string;
  /** What the address is, for the copy failure ("connector URL"). */
  what: string;
  link?: { href: string; label: string };
}) {
  const { copyText } = useClipboard();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyText(url))) {
      toast.error(`Couldn't copy the ${what}`);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-xs">{url}</code>
          <Button variant="outline" icon={copied ? <Check /> : <Copy />} onClick={() => void copy()}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {link ? (
          <Button asChild variant="outline">
            <OutboundLink href={link.href}>
              <ExternalLink className="size-3.5" />
              {link.label}
            </OutboundLink>
          </Button>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
