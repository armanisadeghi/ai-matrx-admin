"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useScraperKeywordSearchForm } from "@/features/scraper/hooks/useScraperKeywordSearchForm";
import { ScraperKeywordSearchPageBody } from "@/features/scraper/parts/ScraperKeywordSearchPanel";
import { ScraperSurfaceMount } from "@/features/scraper/agent-context/ScraperSurfaceMount";
import { RESULT_LIMIT_DEFAULT } from "@/features/scraper/scrape-command";
import {
  buildSearchLabQuery,
  parseSearchLabParams,
} from "@/features/scraper/utils/search-lab-url";

export default function ScraperSearchPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The link is read ONCE, on arrival; after that the form owns the inputs and
  // each search writes them back (a shareable test link).
  const [initial] = useState(() =>
    parseSearchLabParams(new URLSearchParams(searchParams.toString())),
  );

  const form = useScraperKeywordSearchForm({
    keywords: initial.query,
    maxResults: initial.count,
    engine: initial.engine,
    vertical: initial.vertical,
    options: initial.options,
    onSearch: (request) => {
      const qs = buildSearchLabQuery(request);
      replaceAddressWithoutNavigating(qs ? `${pathname}?${qs}` : pathname);
    },
  });

  // A Brave-only link runs on arrival. Google spends a shared allowance, so a
  // link naming it fills the form and waits for the Search click.
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (initial.query && initial.engine === "brave") {
      void form.handleSearch();
    }
  }, []);

  return (
    // `matrx-user/scraper` — the web-search mount. Nothing is scraped here, so
    // it owns the keyword, engine, result type, the result budget and which
    // hit is open; there is no single-URL input and no page budget.
    <ScraperSurfaceMount
      context={{
        mode: "web",
        selected: null,
        activeTab: "pretty",
        failureReason: form.hasError ? form.error : null,
        searchKeyword: form.keywords,
        maxResults: parseInt(form.maxResults, 10) || RESULT_LIMIT_DEFAULT,
        searchEngine: form.engine,
        searchVertical: form.vertical,
        searchHits: form.flatResults,
        selectedHitIndex: form.selectedHitIndex,
        isScraping: form.isLoading,
      }}
      write={{
        setKeyword: form.setKeywords,
        setMaxResults: (value) => form.setMaxResults(String(value)),
        setSearchEngine: form.setEngine,
        setSearchVertical: form.setVertical,
        selectSearchHit: (index) => form.setSelectedHitIndex(index),
        hitCount: form.flatResults.length,
        notHereHint:
          "This is the Search route, which searches without scraping. Open /scraper/quick for a single URL, /scraper/search-and-scrape to search and scrape, or the floating Web Scraper workspace, which owns every mode at once.",
      }}
    >
      <div
        className="h-full flex flex-col overflow-hidden bg-textured"
        style={{ paddingTop: "var(--shell-header-h)" }}
      >
        <ScraperKeywordSearchPageBody form={form} />
      </div>
    </ScraperSurfaceMount>
  );
}
