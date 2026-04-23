"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidePanelHeader } from "../SidePanelChrome";

interface SearchPanelProps {
  className?: string;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ className }) => {
  const [query, setQuery] = useState("");
  const [replace, setReplace] = useState("");

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <SidePanelHeader title="Search" />
      <div className="flex flex-col gap-2 p-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="h-7 w-full rounded-sm border border-neutral-300 bg-white pl-7 pr-2 text-xs outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <input
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          placeholder="Replace"
          className="h-7 w-full rounded-sm border border-neutral-300 bg-white px-2 text-xs outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 text-xs text-neutral-500 dark:text-neutral-400">
        {query ? (
          <div>
            Workspace search is not wired up yet. This panel is ready; the
            adapter just needs a <code className="font-mono">search</code>{" "}
            method.
          </div>
        ) : (
          <div>Type a query to search the current workspace.</div>
        )}
      </div>
    </div>
  );
};
