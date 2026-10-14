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

import React from "react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import {
  Search,
  Newspaper,
  Film,
  HelpCircle,
  MessagesSquare,
  MapPin,
  Images,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isRecord,
  num,
  readWebSearchCollectionValue,
  records,
  strings,
  text,
} from "./search-kind-data";
import { SectionHeading } from "./search-kind-shared";
import { SearchKindNested } from "./SearchKindNested";
import { searchEngineLabel } from "@/features/search/types";

interface WebSearchResultsBlockProps {
  serverData?: unknown;
  className?: string;
}

/** Items are renderable once their identity fields exist (streaming gate). */
function renderable<T extends object>(list: T[], key: string): T[] {
  return list.filter((item) => text((item as Record<string, unknown>)[key]) !== null);
}

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
  const news = renderable(records(value.news), "title");
  const videos = renderable(records(value.videos), "title");
  // An image hit may arrive untitled; its identity is the picture itself.
  const images = records(value.images).filter(
    (img) => text(img.image_url) !== null || text(img.thumbnail) !== null,
  );
  const vertical = text(value.vertical);
  const imagesFirst = vertical === "images";
  const faqs = renderable(records(value.faqs), "question");
  const discussions = renderable(records(value.discussions), "title");
  const places = renderable(records(value.places), "name");
  const entity = isRecord(value.entity) ? value.entity : null;
  const aiAnswer = isRecord(value.ai_answer) ? value.ai_answer : null;
  const related = strings(value.related_searches);

  // Web results read best as one left-aligned column (Google's ~650px measure);
  // the knowledge card takes a right rail when there is room. Every other
  // result type is a grid and takes the full width.
  const webLike = vertical === null || vertical === "web";
  const railEntity = webLike ? entity : null;

  const main = (
    <div className="@container min-w-0 space-y-6">
      {/* An image search leads with its grid. */}
      {imagesFirst && images.length > 0 && <ImagesBand images={images} />}

      {/* AI answer leads, Perplexity-style. */}
      {aiAnswer && <SearchKindNested value={aiAnswer} />}

      {/* Narrow: the knowledge card follows the answer; wide: it sits in the rail. */}
      {railEntity && (
        <div className="@4xl/serp:hidden">
          <SearchKindNested value={railEntity} />
        </div>
      )}

      {/* Local places */}
      {places.length > 0 && (
        <section>
          <SectionHeading icon={MapPin} label="Places" count={places.length} />
          <div className="grid gap-3 @2xl:grid-cols-2">
            {places.map((place, i) => (
              <SearchKindNested key={i} value={place} />
            ))}
          </div>
        </section>
      )}

      {/* The main organic results list */}
      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((result, i) => (
            <SearchKindNested key={i} value={result} />
          ))}
        </div>
      )}

      {!imagesFirst && images.length > 0 && <ImagesBand images={images} />}

      {/* News band */}
      {news.length > 0 && (
        <section>
          <SectionHeading icon={Newspaper} label="News" count={news.length} />
          <div className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-5">
            {news.map((item, i) => (
              <SearchKindNested key={i} value={item} />
            ))}
          </div>
        </section>
      )}

      {/* Videos band */}
      {videos.length > 0 && (
        <section>
          <SectionHeading icon={Film} label="Videos" count={videos.length} />
          <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-4 @5xl:grid-cols-5">
            {videos.map((video, i) => (
              <SearchKindNested key={i} value={video} />
            ))}
          </div>
        </section>
      )}

      {/* People also ask — one bordered list of collapsed questions. */}
      {faqs.length > 0 && (
        <section>
          <SectionHeading icon={HelpCircle} label="People also ask" count={faqs.length} />
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {faqs.map((faq, i) => (
              <SearchKindNested
                key={i}
                value={faq}
                className="rounded-none border-0 bg-transparent"
              />
            ))}
          </div>
        </section>
      )}

      {/* Discussions */}
      {discussions.length > 0 && (
        <section>
          <SectionHeading
            icon={MessagesSquare}
            label="Discussions"
            count={discussions.length}
          />
          <div className="space-y-4">
            {discussions.map((discussion, i) => (
              <SearchKindNested key={i} value={discussion} />
            ))}
          </div>
        </section>
      )}

      {/* Related searches — each one is a search of its own (new tab). */}
      {related.length > 0 && (
        <section>
          <SectionHeading icon={Search} label="Related searches" />
          <div className="grid gap-2 @md:grid-cols-2">
            {related.map((term, i) => (
              <OutboundLink
                key={i}
                href={`/search?q=${encodeURIComponent(term)}`}
                target="_blank"
                rel="noopener"
                title={term}
                className="flex min-w-0 items-center gap-2.5 rounded-lg bg-muted/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
          and engine (the Search Lab) hide it via the data attribute. */}
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
          <span className="font-medium text-foreground">{altered}</span>
        </div>
      )}

      {railEntity ? (
        // Google's measures: a ~42rem results column, a ~22rem panel beside it.
        <div className="grid gap-6 @4xl/serp:grid-cols-[minmax(0,42rem)_minmax(18rem,22rem)] @4xl/serp:gap-10">
          <div className="min-w-0">{main}</div>
          <aside className="hidden min-w-0 self-start @4xl/serp:block">
            <SearchKindNested value={railEntity} />
          </aside>
        </div>
      ) : (
        <>
          {entity && <SearchKindNested value={entity} />}
          <div className={cn(webLike && "max-w-3xl")}>{main}</div>
        </>
      )}
    </div>
  );
}

/**
 * Images band — fixed-aspect cards (the box is sized before the picture
 * loads, so the grid never shifts), denser columns as the width grows.
 */
function ImagesBand({ images }: { images: Record<string, unknown>[] }) {
  return (
    <section>
      <SectionHeading icon={Images} label="Images" count={images.length} />
      <div className="grid grid-cols-2 gap-3 @lg:grid-cols-3 @3xl:grid-cols-4 @5xl:grid-cols-5">
        {images.map((image, i) => (
          <SearchKindNested key={i} value={image} />
        ))}
      </div>
    </section>
  );
}
