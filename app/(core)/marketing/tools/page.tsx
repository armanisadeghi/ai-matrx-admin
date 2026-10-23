// app/(core)/marketing/tools/page.tsx
//
// In-app index of the SEO tools and research. The public analyzers stay on
// `/seo/*` in the (public) route group — they are anonymous lead-gen surfaces
// and must render without a session; each opens in a new tab from here. Until
// 2026-10-21 this page rendered the brand list under the tools, which made it
// look like a second Brands page ("Each page should show the things that it
// includes" — Arman).

import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import {
  MarketingDestinationMap,
  pillarDestinationGroups,
} from "@/features/marketing/home/MarketingDestinationMap";
import {
  MARKETING_PILLARS,
  MARKETING_PUBLIC_TOOL_CATEGORIES,
} from "@/features/marketing/lib/marketing-nav";

export default function MarketingToolsPage() {
  const research = MARKETING_PILLARS.filter((pillar) => pillar.key === "tools").map(
    (pillar) => ({
      ...pillar,
      label: "Research",
      // The public analyzers are listed by category below; keep research here.
      entries: pillar.entries.filter(
        (entry) => entry.href !== "/marketing/tools" && !entry.navHidden,
      ),
    }),
  );
  const analyzers = MARKETING_PUBLIC_TOOL_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    iconName: "Wrench" as const,
    description: category.subtitle,
    entries: category.tools.filter((tool) => tool.external),
  }));
  return (
    <>
      <RecordPageHeader level={{ name: "SEO Tools" }} />
      <div className="h-full overflow-y-auto bg-textured">
        <div className="mx-auto w-full max-w-7xl px-3 pb-6 pt-[calc(var(--shell-header-h)+0.75rem)] sm:px-4">
          <MarketingDestinationMap
            groups={pillarDestinationGroups([...research, ...analyzers])}
          />
        </div>
      </div>
    </>
  );
}
