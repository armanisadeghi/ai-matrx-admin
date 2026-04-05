"use client";

import { useState } from "react";
import { Search, Loader2, ExternalLink, Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useScraperApi } from "@/features/scraper/hooks/useScraperApi";
import { ScraperHookErrorDetails } from "@/features/scraper/parts/ScraperHookErrorDetails";
import type { SearchResult } from "@/features/scraper/types/scraper-api";

interface SearchResultItem {
  title?: string;
  url?: string;
  snippet?: string;
  rank?: number;
}

export default function ScraperSearchPage() {
  const [keywords, setKeywords] = useState("");
  const [maxResults, setMaxResults] = useState("10");
  const {
    search,
    searchResults,
    isLoading,
    hasError,
    error,
    errorDiagnostics,
    statusMessage,
    reset,
  } = useScraperApi();

  const flatResults: SearchResultItem[] = searchResults.flatMap(
    (sr) => sr.results || [],
  );

  const handleSearch = async () => {
    if (!keywords.trim()) return;
    reset();
    await search({
      keywords: [keywords.trim()],
      total_results_per_keyword: parseInt(maxResults) || 10,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) handleSearch();
  };

  return (
    <div className="h-page flex flex-col overflow-hidden bg-textured">
      {/* Header bar */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-white/50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label
              htmlFor="keywords"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Search keywords
            </Label>
            <Input
              id="keywords"
              placeholder="Enter keywords..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="h-8 text-sm"
              style={{ fontSize: "16px" }}
            />
          </div>
          <div className="w-24">
            <Label
              htmlFor="maxResults"
              className="text-xs text-muted-foreground mb-1 block"
            >
              Max results
            </Label>
            <Input
              id="maxResults"
              type="number"
              min="1"
              max="100"
              value={maxResults}
              onChange={(e) => setMaxResults(e.target.value)}
              disabled={isLoading}
              className="h-8 text-sm"
              style={{ fontSize: "16px" }}
            />
          </div>
          {searchResults.length > 0 && (
            <Button onClick={reset} variant="outline" size="sm" className="h-8">
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
          <Button
            onClick={handleSearch}
            disabled={!keywords.trim() || isLoading}
            size="sm"
            className="h-8 gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {isLoading ? (statusMessage ?? "Searching...") : "Search"}
          </Button>
        </div>
        {hasError && (
          <Alert variant="destructive" className="mt-2 max-w-5xl mx-auto py-2">
            <AlertDescription className="text-xs">
              {error}
              <ScraperHookErrorDetails diagnostics={errorDiagnostics} />
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-3">
          {isLoading && flatResults.length === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground">
                  {statusMessage ?? "Searching..."}
                </p>
              </div>
            </div>
          )}

          {flatResults.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                {flatResults.length} results for "{keywords}"
              </p>
              {flatResults.map((result, i) => (
                <div
                  key={i}
                  className="p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded shrink-0">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline line-clamp-1"
                      >
                        {result.title || result.url || `Result ${i + 1}`}
                      </a>
                      {result.url && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {result.url}
                        </p>
                      )}
                      {result.snippet && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                          {result.snippet}
                        </p>
                      )}
                    </div>
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-muted rounded shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {!isLoading && flatResults.length === 0 && !hasError && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Search className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Enter keywords above to search the web</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
