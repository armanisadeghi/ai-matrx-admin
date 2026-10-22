"use client";

/**
 * `web_search_results` — THE canonical component for the merged
 * provider-agnostic search collection kind (Search Kinds Pilot, Stage B).
 *
 * Convergence target of the Inventory Law survey (2026-08-20): the
 * Google-done-right idiom from the canonical tool-viz search renderer,
 * NewsInline's thumbnail cards for the news/video bands, plus first-ever
 * renderings for FAQs, discussions, places, the entity card and the AI
 * answer. Supersedes the legacy `SearchResultsBlock` data-event display.
 *
 * Every nested kind instance renders through ITS canonical component via
 * `SearchKindNested` (db-component overrides included) — this component owns
 * only the collection chrome and section layout. Streaming: serverData is
 * `{ value, isComplete }`; every section renders whatever has arrived.
 */

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { Button } from "@ai-matrx/design-system/controls";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  entityFitsQuery,
  isNewsQuery,
  storyFitsQuery,
  isRecord,
  placesBesideEntity,
  num,
  readWebSearchCollectionValue,
  records,
  strings,
  text,
} from "./search-kind-data";
import { SectionHeading } from "./search-kind-shared";
import { SearchKindNested } from "./SearchKindNested";
import { searchEngineLabel } from "@/features/search/types";

// The ONE map (Leaflet + OSM tiles), loaded only when a local pack has pins.
const MapCanvas = dynamic(() => import("../map/MapCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-muted" />,
});

interface WebSearchResultsBlockProps {
  serverData?: unknown;
  className?: string;
}

/** Items are renderable once their identity fields exist (streaming gate). */
function renderable<T extends object>(list: T[], key: string): T[] {
  return list.filter((item) => text((item as Record<string, unknown>)[key]) !== null);
}

/** Organic results come in Google's runs: the first three, then features, then the rest. */
const FIRST_RUN = 3;
const SECOND_RUN = 6;
/** The local pack opens on three places, Google's count; "More places" shows the rest in place. */
const LOCAL_PACK_SIZE = 3;

export default function WebSearchResultsBlock({
  serverData,
  className,
}: WebSearchResultsBlockProps) {
  const { value, isComplete } = readWebSearchCollectionValue(serverData);

  const query = text(value.query);
  const source = text(value.source);
  const total = num(value.total_results);
  const altered = text(value.altered_query);

  const results = renderable(records(value.results), "title");
  const allNews = renderable(records(value.news), "title");
  const videos = renderable(records(value.videos), "title");
  // An image hit may arrive untitled; its identity is the picture itself.
  const images = records(value.images).filter(
    (img) => text(img.image_url) !== null || text(img.thumbnail) !== null,
  );
  const vertical = text(value.vertical);
  const imagesFirst = vertical === "images";
  const faqs = renderable(records(value.faqs), "question");
  const discussions = renderable(records(value.discussions), "title");
  const rawEntity = isRecord(value.entity) ? value.entity : null;
  const places = placesBesideEntity(renderable(records(value.places), "name"), rawEntity);
  const aiAnswer = isRecord(value.ai_answer) ? value.ai_answer : null;
  const related = strings(value.related_searches);

  // Web results read as one left-aligned column (Google's 652px measure); the knowledge panel
  // takes the right rail — and only when the query names it (a site that merely ranked is no panel).
  const webLike = vertical === null || vertical === "web";
  const entity =
    rawEntity && (!webLike || entityFitsQuery(text(rawEntity.name), query)) ? rawEntity : null;
  const railEntity = webLike ? entity : null;
  const newsFirst = webLike && isNewsQuery(query);
  // Top stories are about what was asked: a provider's general headlines band ("breaking" news on
  // anything) is dropped from the All page, where Google shows only stories on the query.
  const news = webLike ? allNews.filter((item) => storyFitsQuery(item, query)) : allNews;

  const topStories = news.length > 0 && (
    <section>
      <SectionHeading label={webLike ? "Top stories" : "News"} />
      {webLike ? (
        // Google's carousel: one row of story cards that scrolls sideways.
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 scrollbar-none">
          {news.map((item, i) => (
            <div key={i} className="w-[220px] shrink-0 snap-start">
              <SearchKindNested value={item} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3">
          {news.map((item, i) => (
            <SearchKindNested key={i} value={item} />
          ))}
        </div>
      )}
    </section>
  );

  const organic = (list: Record<string, unknown>[]) =>
    list.length > 0 && (
      <div className="space-y-7">
        {list.map((result, i) => (
          <SearchKindNested key={i} value={result} />
        ))}
      </div>
    );

  const main = (
    <div className="@container min-w-0 space-y-8">
      {/* An image search leads with its grid. */}
      {imagesFirst && images.length > 0 && <ImagesBand images={images} />}

      {/* The AI overview leads, Google's way. */}
      {aiAnswer && <SearchKindNested value={aiAnswer} />}

      {/* Narrow: the knowledge panel follows the overview; wide: it sits in the rail. */}
      {railEntity && (
        <div className="@4xl/serp:hidden">
          <SearchKindNested value={railEntity} />
        </div>
      )}

      {places.length > 0 &&
        (vertical === "places" ? <PlacesList places={places} /> : <LocalPack places={places} />)}

      {newsFirst && topStories}

      {organic(results.slice(0, FIRST_RUN))}

      {!newsFirst && topStories}

      {/* People also ask — one list of collapsed questions between hairlines. */}
      {faqs.length > 0 && (
        <section>
          <SectionHeading label="People also ask" />
          <div className="divide-y divide-border border-y border-border">
            {faqs.map((faq, i) => (
              <SearchKindNested
                key={i}
                value={faq}
                className="rounded-none border-0 bg-transparent px-0"
              />
            ))}
          </div>
        </section>
      )}

      {organic(results.slice(FIRST_RUN, SECOND_RUN))}

      {videos.length > 0 && (
        <section>
          <SectionHeading label="Videos" />
          <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
            {videos.map((video, i) => (
              <SearchKindNested key={i} value={video} />
            ))}
          </div>
        </section>
      )}

      {!imagesFirst && images.length > 0 && <ImagesBand images={images} />}

      {organic(results.slice(SECOND_RUN))}

      {discussions.length > 0 && (
        <section>
          <SectionHeading label="Discussions and forums" />
          <div className="space-y-4">
            {discussions.map((discussion, i) => (
              <SearchKindNested key={i} value={discussion} />
            ))}
          </div>
        </section>
      )}

      {/* People also search for — each one a search of its own (new tab). */}
      {related.length > 0 && (
        <section>
          <SectionHeading label="People also search for" />
          <div className="grid gap-2.5 @md:grid-cols-2">
            {related.map((term, i) => (
              <OutboundLink
                key={i}
                href={`/search?q=${encodeURIComponent(term)}`}
                target="_blank"
                rel="noopener"
                title={term}
                className="flex h-12 min-w-0 items-center gap-3 rounded-xl bg-muted px-4 text-sm text-foreground transition-colors hover:bg-muted-foreground/15"
              >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{term}</span>
              </OutboundLink>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  return (
    <div className={cn("@container/serp my-2 space-y-4", className)}>
      {/* Collection header — one quiet line. Hosts that already show the query
          and engine (the search page) hide it via the data attribute. */}
      <div
        data-search-collection-header=""
        className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
      >
        <Search className="h-3.5 w-3.5 shrink-0 self-center text-muted-foreground" />
        <span className="min-w-0 truncate font-medium text-foreground">
          {query ?? (isComplete ? "Search" : "Searching…")}
        </span>
        {source && (
          <span className="text-muted-foreground">· {searchEngineLabel(source)}</span>
        )}
        {total !== null && total > 0 && (
          <span className="tabular-nums text-muted-foreground">
            · About {Intl.NumberFormat().format(total)} results
          </span>
        )}
      </div>

      {altered && (
        <div className="text-sm text-muted-foreground">
          Showing results for{" "}
          <span className="font-medium italic text-primary">{altered}</span>
        </div>
      )}

      {railEntity ? (
        // Google's measures: a 652px results column, a ~370px panel beside it.
        <div className="grid gap-6 @4xl/serp:grid-cols-[minmax(0,652px)_minmax(18rem,372px)] @4xl/serp:gap-[76px]">
          <div className="min-w-0">{main}</div>
          <aside className="hidden min-w-0 self-start @4xl/serp:block">
            <SearchKindNested value={railEntity} />
          </aside>
        </div>
      ) : (
        <>
          {!webLike && entity && <SearchKindNested value={entity} />}
          <div className={cn(webLike && "max-w-[652px]")}>{main}</div>
        </>
      )}
    </div>
  );
}

function placeMarkers(places: Record<string, unknown>[]) {
  return places.flatMap((place) => {
    const coords = isRecord(place.coordinates) ? place.coordinates : null;
    const lat = coords ? num(coords.latitude) : null;
    const lng = coords ? num(coords.longitude) : null;
    return lat !== null && lng !== null ? [{ lat, lng, label: text(place.name) ?? undefined }] : [];
  });
}

/** The Places tab, Google Maps' way: every place in a list, the map beside it (above it on a phone). */
function PlacesList({ places }: { places: Record<string, unknown>[] }) {
  const markers = placeMarkers(places);
  return (
    <div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {markers.length > 0 && (
        <div className="relative z-0 h-56 overflow-hidden rounded-xl border border-border @3xl:sticky @3xl:top-2 @3xl:order-2 @3xl:h-[70vh]">
          <MapCanvas markers={markers} />
        </div>
      )}
      <div className="divide-y divide-border @3xl:order-1">
        {places.map((place, i) => (
          <SearchKindNested key={i} value={place} className="rounded-none border-0 bg-transparent px-0" />
        ))}
      </div>
    </div>
  );
}

/**
 * Google's local pack: a map with the places pinned, three places under it in one bordered list,
 * and "More places" opening the rest in place. Every place draws through its ONE component.
 */
function LocalPack({ places }: { places: Record<string, unknown>[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? places : places.slice(0, LOCAL_PACK_SIZE);
  // The map pins the places on show, Google's way: "More places" adds theirs.
  const markers = placeMarkers(shown);
  return (
    <section>
      <SectionHeading label="Places" />
      <div className="overflow-hidden rounded-xl border border-border">
        {markers.length > 0 && (
          <div className="relative z-0 h-48 border-b border-border">
            <MapCanvas key={markers.length} markers={markers} />
          </div>
        )}
        <div className="divide-y divide-border">
          {shown.map((place, i) => (
            <SearchKindNested key={i} value={place} className="rounded-none border-0 bg-transparent" />
          ))}
        </div>
        {places.length > LOCAL_PACK_SIZE && (
          <div className="flex justify-center border-t border-border py-1.5">
            <Button
              variant="quiet"
              onClick={() => setAll((v) => !v)}
              aria-expanded={all}
              iconEnd={<ChevronDown className={cn(all && "rotate-180")} />}
            >
              {all ? "Fewer places" : "More places"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Images band — fixed-aspect cards (the box is sized before the picture
 * loads, so the grid never shifts), denser columns as the width grows.
 */
function ImagesBand({ images }: { images: Record<string, unknown>[] }) {
  return (
    <section>
      <SectionHeading label="Images" />
      <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5">
        {images.map((image, i) => (
          <SearchKindNested key={i} value={image} />
        ))}
      </div>
    </section>
  );
}
