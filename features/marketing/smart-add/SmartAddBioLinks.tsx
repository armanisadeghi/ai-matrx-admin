"use client";

/**
 * Smart Add — "Link pages": the brand's link-in-bio pages (Linktree, Beacons, Stan, …). A page linked from
 * their site, a profile or another link page, or carrying their handle, is THEIRS without asking (relation
 * `link_in_bio_page`): it is never a website candidate and never compared. Under each page, the links it
 * shows that are neither an account nor a site (those are offered in their own slots), each with Open.
 */

import { ExternalLink } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import type { EvidenceItem } from "./evidence";
import { linkPages } from "./evidence";
import { outboundHref } from "./SmartAddExtras";

const SITE_SOURCES = new Set(["website", "link_in_bio"]);

export function SmartAddBioLinks({ items }: { items: EvidenceItem[] }) {
  // Handles their own site or link page names: a link page found elsewhere with one of them is theirs too.
  const handles = items.filter((i) => i.field === "social" && SITE_SOURCES.has(i.source.kind) && i.handle).map((i) => i.handle as string);
  const pages = linkPages(items, handles);
  if (!pages.length) return null;
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-border/70 px-3 py-2" data-testid="smart-add-link-pages">
      <header className="text-xs font-medium text-foreground/80">Link pages</header>
      {pages.map((p) => (
        <div key={p.key} className="flex flex-col gap-0.5" data-testid="smart-add-link-page">
          <div className="flex items-center gap-2">
            <span className="w-44 shrink-0 truncate text-xs font-medium">{p.service}</span>
            <span className="min-w-0 flex-1 break-all text-[11px] leading-snug text-muted-foreground" data-testid="smart-add-link-page-url">
              {p.url}
            </span>
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {p.theirs ? "Link-in-bio page" : "Found on the web"}
            </span>
            <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
              <OutboundLink href={outboundHref(p.url)} />
            </Button>
          </div>
          {p.links.length ? (
            <ul className="flex flex-col border-l border-border/70 pl-3">
              {p.links.map((i) => (
                <li key={i.key} className="flex items-center gap-2 py-0.5" data-testid="smart-add-bio-link">
                  <span className="w-40 shrink-0 truncate text-xs">{i.label ?? i.value}</span>
                  <span className="min-w-0 flex-1 break-all text-[11px] leading-snug text-muted-foreground" data-testid="smart-add-bio-link-url">
                    {i.url ?? i.value}
                  </span>
                  <Button asChild variant="quiet" icon={<ExternalLink aria-hidden />} aria-label="Open" title="Open">
                    <OutboundLink href={outboundHref(i.url ?? i.value)} />
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}
