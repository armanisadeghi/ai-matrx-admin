"use client";

import { useEffect, useState } from "react";
import { Loader2, Telescope } from "lucide-react";
import {
  getTopicPickerRows,
  type ResearchTopicPickerRow,
} from "@/features/research/service";
import { filterAndSortBySearch } from "@ai-matrx/kit/search-scoring";
import { usePickerInputFocus } from "./usePickerInputFocus";
import {
  PickerEmpty,
  PickerRow,
  PickerSearchField,
  PickerView,
  PickerViewBody,
  ResourcePickerSubViewHeader,
} from "./ResourcePickerSubViewHeader";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

interface ResearchResourcePickerProps {
  onBack: () => void;
  onSelect: (topic: ResearchTopicPickerRow) => void;
}

/** The person's research topics, across every organization they belong to. */
export function ResearchResourcePicker({
  onBack,
  onSelect,
}: ResearchResourcePickerProps) {
  const [topics, setTopics] = useState<ResearchTopicPickerRow[]>([]);
  const searchInputRef = usePickerInputFocus();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await getTopicPickerRows();
        if (cancelled) return;
        setError(null);
        setTopics(rows);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Couldn't load research topics");
        setTopics([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTopics = searchQuery.trim()
    ? filterAndSortBySearch(topics, searchQuery, [
        { get: (t) => t.name, weight: "title" },
        { get: (t) => t.description, weight: "body" },
      ])
    : topics;

  return (
    <PickerView>
      <ResourcePickerSubViewHeader
        onBack={onBack}
        search={
          <PickerSearchField
            ref={searchInputRef}
            placeholder="Search research"
            value={searchQuery}
            onChange={setSearchQuery}
          />
        }
      />
      <PickerViewBody>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="px-3 py-10 text-center text-sm text-destructive">
            {error}
            <ErrorAlchemyMenu error={error} />
          </div>
        ) : filteredTopics.length === 0 ? (
          <PickerEmpty>
            {searchQuery ? "No research found" : "No research yet"}
          </PickerEmpty>
        ) : (
          filteredTopics.map((topic) => (
            <PickerRow
              key={topic.id}
              icon={Telescope}
              iconClassName="text-primary"
              label={topic.name}
              secondary={topic.description || undefined}
              trailing={
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {new Date(topic.updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              }
              onClick={() => onSelect(topic)}
            />
          ))
        )}
      </PickerViewBody>
    </PickerView>
  );
}
