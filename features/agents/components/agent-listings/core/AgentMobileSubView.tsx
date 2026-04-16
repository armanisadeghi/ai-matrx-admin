"use client";

import { ChevronRight } from "lucide-react";
import type { UseAgentConsumerReturn } from "@/features/agents/hooks/useAgentConsumer";
import { SORT_OPTIONS } from "./types";
import { SearchInput, OptionRow, CheckRow } from "./primitives";

export interface AgentMobileSubViewProps {
  view: "sort" | "categories" | "tags";
  consumer: UseAgentConsumerReturn;
  allCategories: string[];
  allTags: string[];
  catSearch: string;
  setCatSearch: (v: string) => void;
  tagSearch: string;
  setTagSearch: (v: string) => void;
  onBack: () => void;
}

export function AgentMobileSubView({
  view,
  consumer,
  allCategories,
  allTags,
  catSearch,
  setCatSearch,
  tagSearch,
  setTagSearch,
  onBack,
}: AgentMobileSubViewProps) {
  const title =
    view === "sort" ? "Sort" : view === "categories" ? "Categories" : "Tags";

  return (
    <div className="flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted/30 transition-colors border-b border-border shrink-0"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        {title}
      </button>
      {view === "sort" &&
        SORT_OPTIONS.map((opt) => (
          <OptionRow
            key={opt.value}
            label={opt.label}
            selected={consumer.sortBy === opt.value}
            onClick={() => {
              consumer.setSortBy(opt.value);
              onBack();
            }}
          />
        ))}
      {view === "categories" && (
        <>
          <div className="px-2 pt-2 pb-1">
            <SearchInput
              value={catSearch}
              onChange={setCatSearch}
              placeholder="Filter categories..."
            />
          </div>
          {consumer.includedCats.length > 0 && (
            <button
              onClick={() =>
                consumer.includedCats.forEach(consumer.toggleCategory)
              }
              className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left"
            >
              Clear ({consumer.includedCats.length})
            </button>
          )}
          <div className="overflow-y-auto max-h-[300px]">
            {allCategories
              .filter(
                (c) =>
                  !catSearch ||
                  c.toLowerCase().includes(catSearch.toLowerCase()),
              )
              .map((cat) => (
                <CheckRow
                  key={cat}
                  label={cat}
                  checked={consumer.includedCats.includes(cat)}
                  onClick={() => consumer.toggleCategory(cat)}
                />
              ))}
          </div>
        </>
      )}
      {view === "tags" && (
        <>
          <div className="px-2 pt-2 pb-1">
            <SearchInput
              value={tagSearch}
              onChange={setTagSearch}
              placeholder="Filter tags..."
            />
          </div>
          {consumer.includedTags.length > 0 && (
            <button
              onClick={() => consumer.includedTags.forEach(consumer.toggleTag)}
              className="mx-2 mb-1 h-6 rounded text-[11px] font-medium text-primary hover:bg-muted/50 transition-colors text-left"
            >
              Clear ({consumer.includedTags.length})
            </button>
          )}
          <div className="overflow-y-auto max-h-[300px]">
            {allTags
              .filter(
                (t) =>
                  !tagSearch ||
                  t.toLowerCase().includes(tagSearch.toLowerCase()),
              )
              .map((tag) => (
                <CheckRow
                  key={tag}
                  label={tag}
                  checked={consumer.includedTags.includes(tag)}
                  onClick={() => consumer.toggleTag(tag)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
