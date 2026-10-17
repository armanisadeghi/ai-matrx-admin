"use client";

/**
 * BUSINESS GUIDELINES — its own door in the site Value area (KI-036).
 *
 * Until 2026-08-25 this document was only authored inside the retired
 * `?view=classification` workspace ("Teach classes"), which folded into the
 * Keyword Workbench once the Workbench reached parity on assignment. This
 * screen is that fold's home for the one thing the old view uniquely owned
 * here: the per-site prose document every AI classification/valuation run
 * reads first (D35). One clean screen — the document, its provenance, and
 * Save — reusing the same editor (`KwGuidelinesPanel`) and the same write
 * path (`setKwGuidelines` → `seo.gsc_set_site_kw_guidelines`) unchanged.
 *
 * SoR: common-docs/systems/marketing/seo/seo-keywords/value-system.md.
 */

import { BookOpenCheck } from "lucide-react";
import { useMarketingSite } from "@/features/marketing/components/site/MarketingSiteContext";
import { AboutPeek } from "@/features/marketing/components/shared/AboutPeek";
import { KwGuidelinesPanel } from "./KwGuidelinesPanel";

export function GuidelinesWorkbench() {
  const { site } = useMarketingSite();

  return (
    <div className="h-full overflow-y-auto bg-textured">
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-3 pb-10 pt-[calc(var(--shell-header-h)+1rem)] sm:px-4">
        <header className="mb-3 flex items-center gap-1.5">
          <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          <h1 className="text-base font-semibold text-foreground">
            Business guidelines
          </h1>
          <AboutPeek
            title="Business guidelines"
            about="What the AI must know about this business before it judges a keyword. Written once, read by every classification and valuation run for this site."
          />
        </header>
        <KwGuidelinesPanel siteId={site.id} />
      </div>
    </div>
  );
}
