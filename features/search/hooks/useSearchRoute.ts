"use client";

/**
 * useSearchRoute — the state behind a search route (`/search`,
 * `/scraper/search`): the link is read ONCE on arrival, the keyword form and
 * the box's input actions are created, and every search writes its inputs
 * back to the address (a shareable link) without navigating.
 *
 * On arrival only free work runs by itself: a Matrx search on an engine tab,
 * or a @handle's platform chips. A link naming Google, a Google-only tab,
 * Social, a page to read or an image fills the box and waits for a press.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { useScraperKeywordSearchForm } from "@/features/scraper/hooks/useScraperKeywordSearchForm";
import {
  buildSearchLabQuery,
  parseSearchLabParams,
} from "@/features/scraper/utils/search-lab-url";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { tabHasEngineChoice } from "@/features/search/types";
import { understandInput } from "@/features/search/input-understanding";
import { useSearchInputs } from "./useSearchInputs";

export function useSearchRoute() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initial] = useState(() =>
    parseSearchLabParams(new URLSearchParams(searchParams.toString())),
  );
  // Admin debuggers always get the raw payload, so the Inspector is complete.
  const isAdminDebugger = useAppSelector(selectIsAdminDebugger);

  const writeAddress = (qs: string) =>
    replaceAddressWithoutNavigating(qs ? `${pathname}?${qs}` : pathname);

  const form = useScraperKeywordSearchForm({
    alwaysIncludeRaw: isAdminDebugger,
    keywords: initial.query,
    maxResults: initial.count,
    engine: initial.engine,
    vertical: initial.vertical,
    socialPlatform: initial.socialPlatform,
    options: initial.options,
    onSearch: (request) => writeAddress(buildSearchLabQuery(request)),
  });

  const inputs = useSearchInputs(form, {
    // A link, handle or image keeps only the box text in the address.
    onSubmitted: (query) =>
      writeAddress(new URLSearchParams(query ? { q: query } : {}).toString()),
  });

  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (!initial.query) return;
    const understood = understandInput(initial.query);
    if (understood.mode === "handle") {
      inputs.submit();
      return;
    }
    if (
      understood.mode === "words" &&
      initial.engine === "brave" &&
      tabHasEngineChoice(initial.vertical)
    ) {
      void form.handleSearch();
    }
  }, []);

  return { form, inputs };
}
