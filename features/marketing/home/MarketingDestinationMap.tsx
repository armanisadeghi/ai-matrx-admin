"use client";

/**
 * A grouped map of Marketing destinations — the "access to all of the things
 * that are part of marketing" band on the Marketing home (Arman, 2026-10-21)
 * and the body of the in-app SEO tools index. Callers derive the groups from
 * the shared declarations (`lib/brand-sections.ts`, `lib/marketing-nav.ts`);
 * this component only lays them out.
 */

import Link from "@/components/navigation/AppLink";
import { Card } from "@/components/ui/card";
import { IconResolver } from "@ai-matrx/icons";
import type { MarketingNavPillar } from "@/features/marketing/lib/marketing-nav";

export interface MarketingDestinationLink {
  href: string;
  label: string;
  iconName: string;
  /** A public utility outside the app shell; opens in a new tab. */
  external?: boolean;
  soon?: boolean;
}

export interface MarketingDestinationGroup {
  key: string;
  label: string;
  links: readonly MarketingDestinationLink[];
}

export function MarketingDestinationMap({
  groups,
}: {
  groups: readonly MarketingDestinationGroup[];
}) {
  return (
    <Card className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 md:grid-cols-3 xl:grid-cols-4">
      {groups
        .filter((group) => group.links.length > 0)
        .map((group) => (
          <div key={group.key} className="min-w-0">
            <div className="type-label pb-1">{group.label}</div>
            <ul className="flex flex-col">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="flex min-h-7 items-center gap-2 rounded-md px-1.5 type-body text-foreground hover:bg-accent"
                  >
                    <IconResolver
                      iconName={link.iconName}
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{link.label}</span>
                    {link.soon ? (
                      <span className="type-meta text-muted-foreground">
                        Soon
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </Card>
  );
}

/** Pillars as map groups: every built entry, the public utilities opening in a new tab. */
export function pillarDestinationGroups(
  pillars: readonly MarketingNavPillar[],
): MarketingDestinationGroup[] {
  return pillars.map((pillar) => ({
    key: pillar.key,
    label: pillar.label,
    links: pillar.entries
      .filter((entry) => entry.status !== "coming-soon")
      .map((entry) => ({
        href: entry.href,
        label: entry.label,
        iconName: entry.iconName,
        external: entry.external,
      })),
  }));
}
