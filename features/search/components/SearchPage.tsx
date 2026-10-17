"use client";

/**
 * `/search` for a signed-in person — the one `SearchExperience`, on the `matrx-user/search` surface
 * (the scraper's Search Lab hosts the same experience on `matrx-user/scraper`). Guests never reach it:
 * the route layout serves them the landing.
 */

import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createSearchScope } from "@/features/surfaces/manifests/search.manifest";
import { searchExperienceValues } from "@/features/search/agent/searchSurface";
import { useSearchRoute } from "@/features/search/hooks/useSearchRoute";
import { SearchExperience } from "./SearchExperience";

const SEARCH_SURFACE_NAME = "matrx-user/search";

export function SearchPage() {
  const { form, inputs } = useSearchRoute();

  // Assembled when an agent is launched from here, from what is on screen right now.
  const getScope = () => {
    const done = form.runs.find((run) => run.outcome);
    return createSearchScope({
      search_query: form.keywords,
      search_status: form.isLoading ? "searching" : form.hasError ? "error" : done ? "done" : "idle",
      search_engine: form.engine,
      ...searchExperienceValues(form, inputs),
      ...(done?.outcome ? { search_results: done.outcome.result } : {}),
    });
  };

  return (
    <SurfaceRuntimeProvider surfaceName={SEARCH_SURFACE_NAME} getScope={getScope}>
      <div
        className="h-full flex flex-col overflow-hidden bg-textured"
        style={{ paddingTop: "var(--shell-header-h)" }}
      >
        <SearchExperience form={form} inputs={inputs} surface="search" />
      </div>
    </SurfaceRuntimeProvider>
  );
}
