"use client";

/**
 * Smart Add — "Also linked from their bio": the links a link-in-bio page (Linktree, Beacons, Stan, …)
 * shows that are neither an account nor the brand's website. Each row is the exact address with an
 * Open button carrying our referral mark. The accounts and the website found on the same page are
 * offered in their own slots, never here. Nothing here needs an answer.
 */

import { ExternalLink } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import type { EvidenceItem } from "./evidence";
import { bioLinkGroups } from "./evidence";
import { outboundHref } from "./SmartAddExtras";

export function SmartAddBioLinks({ items }: { items: EvidenceItem[] }) {
  const groups = bioLinkGroups(items);
  if (!groups.length) return null;
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-border/70 px-3 py-2" data-testid="smart-add-bio-links">
      <header className="text-xs font-medium text-foreground/80">Also linked from their bio</header>
      {groups.map((g) => (
        <div key={g.from} className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{g.from}</span>
          <ul className="flex flex-col">
            {g.links.map((i) => (
              <li key={i.key} className="flex items-center gap-2 py-0.5" data-testid="smart-add-bio-link">
                <span className="w-44 shrink-0 truncate text-xs font-medium">{i.label ?? i.value}</span>
                <span className="min-w-0 flex-1 break-all text-[11px] leading-snug text-muted-foreground" data-testid="smart-add-bio-link-url">
                  {i.url ?? i.value}
                </span>
                <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
                  <OutboundLink href={outboundHref(i.url ?? i.value)} />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
