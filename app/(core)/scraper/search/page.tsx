"use client";

import { ScraperSurfaceMount } from "@/features/scraper/agent-context/ScraperSurfaceMount";
import { RESULT_LIMIT_DEFAULT } from "@/features/scraper/scrape-command";
import { SearchExperience } from "@/features/search/components/SearchExperience";
import { useSearchRoute } from "@/features/search/hooks/useSearchRoute";
import {
  searchExperienceValues,
  searchExperienceWriteHandlers,
} from "@/features/search/agent/searchSurface";

/**
 * `/scraper/search` — the search page inside the Webscraper tabs. Same
 * `SearchExperience` as `/search`; this route keeps the `matrx-user/scraper`
 * surface (its scrape values fill when a link is read) and the scrape doors.
 */
export default function ScraperSearchPage() {
  const { form, inputs } = useSearchRoute();
  const read =
    inputs.special?.type === "read" ? inputs.scraper.data : null;

  return (
    <ScraperSurfaceMount
      context={{
        mode: "web",
        selected: read,
        results: read ? [read] : [],
        selectedIndex: read ? 0 : undefined,
        activeTab: "pretty",
        failureReason: form.hasError ? form.error : null,
        searchKeyword: form.keywords,
        maxResults: parseInt(form.maxResults, 10) || RESULT_LIMIT_DEFAULT,
        searchEngine: form.engine,
        searchVertical: form.vertical,
        useMyLocation: form.options.nearMe,
        searchHits: form.flatResults,
        selectedHitIndex: form.selectedHitIndex,
        isScraping: form.isLoading || inputs.scraper.isLoading,
      }}
      write={{
        setKeyword: form.setKeywords,
        setMaxResults: (value) => form.setMaxResults(String(value)),
        setSearchEngine: form.setEngine,
        setSearchVertical: form.setVertical,
        setUseMyLocation: (on) => void form.setNearMe(on),
        selectSearchHit: (index) => form.setSelectedHitIndex(index),
        hitCount: form.flatResults.length,
        notHereHint:
          "This is the Search route. Open /scraper/quick for a single URL, /scraper/search-and-scrape to search and scrape, or the floating Web Scraper workspace, which owns every mode at once.",
      }}
      extraScope={() => searchExperienceValues(form, inputs)}
      extraWriteHandlers={() => {
        const { social_platform } = searchExperienceWriteHandlers(form);
        return { social_platform };
      }}
    >
      <div
        className="h-full flex flex-col overflow-hidden bg-textured"
        style={{ paddingTop: "var(--shell-header-h)" }}
      >
        <SearchExperience form={form} inputs={inputs} surface="scraper" />
      </div>
    </ScraperSurfaceMount>
  );
}
