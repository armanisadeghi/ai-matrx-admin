/**
 * The ONE emitter mapping for the search page, shared by both surfaces that
 * host `SearchExperience` (`matrx-user/search` on /search and
 * `matrx-user/scraper` on /scraper/search): the tab, the social platform and
 * what the box understood its input to be, plus the write handlers that stage
 * them. Each manifest declares these same value and target names.
 */

import type { UseScraperKeywordSearchFormReturn } from "@/features/scraper/hooks/useScraperKeywordSearchForm";
import type { UseSearchInputsReturn } from "@/features/search/hooks/useSearchInputs";
import {
  SOCIAL_SEARCH_PLATFORMS,
  type SearchInputMode,
  type SearchTab,
  type SocialSearchPlatform,
} from "@/features/search/types";
import { SEARCH_LAB_VERTICAL_VALUES } from "@/features/scraper/scrape-command";

export interface SearchExperienceValues {
  search_vertical: SearchTab;
  social_platform: SocialSearchPlatform;
  input_mode: SearchInputMode;
  /** The non-tab result on screen (profile, page read, image search), if any. */
  special_result?: Record<string, unknown>;
}

export function searchExperienceValues(
  form: UseScraperKeywordSearchFormReturn,
  inputs: UseSearchInputsReturn,
): SearchExperienceValues {
  const special = inputs.special;
  let special_result: Record<string, unknown> | undefined;
  if (special?.type === "profile" || special?.type === "image") {
    special_result = special.outcome?.result;
  } else if (special?.type === "read" && inputs.scraper.data) {
    const d = inputs.scraper.data;
    special_result = {
      url: d.url,
      title: d.overview.page_title ?? null,
      text: d.textContent,
      images: d.images,
      links: d.links,
    };
  } else if (special?.type === "handle") {
    special_result = { handle: special.handle };
  }
  return {
    search_vertical: form.vertical,
    social_platform: form.socialPlatform,
    input_mode: inputs.activeMode,
    ...(special_result ? { special_result } : {}),
  };
}

function oneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/** Write handlers for the tab and social platform (staged; the user presses). */
export function searchExperienceWriteHandlers(
  form: UseScraperKeywordSearchFormReturn,
): Record<string, (value: unknown) => void> {
  return {
    search_vertical: (value) => {
      if (form.isLoading)
        throw new Error("search_vertical is unavailable while a search is running.");
      if (!oneOf(SEARCH_LAB_VERTICAL_VALUES, value))
        throw new Error(`search_vertical expects one of: ${SEARCH_LAB_VERTICAL_VALUES.join(" | ")}.`);
      form.setVertical(value);
    },
    social_platform: (value) => {
      if (form.isLoading)
        throw new Error("social_platform is unavailable while a search is running.");
      if (!oneOf(SOCIAL_SEARCH_PLATFORMS, value))
        throw new Error(`social_platform expects one of: ${SOCIAL_SEARCH_PLATFORMS.join(" | ")}.`);
      form.setSocialPlatform(value);
    },
  };
}
