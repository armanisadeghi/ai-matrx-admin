"use client";

import React, { useMemo } from "react";
import { Newspaper, Calendar, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { ToolRendererProps } from "../types";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";

interface NewsArticle {
    source: {
        id: string | null;
        name: string;
    };
    author: string | null;
    title: string;
    description: string | null;
    url: string;
    url_to_image: string | null;
    published_at: string | null;
    content: string | null;
}

interface ParsedNewsData {
    articles: NewsArticle[];
    totalResults: number;
    query: string | null;
    isLoading: boolean;
    isComplete: boolean;
    isError: boolean;
}

function parseNewsData(toolUpdates: ToolCallObject[]): ParsedNewsData {
    const inputUpdate = toolUpdates.find((u) => u.type === "mcp_input");
    const args = inputUpdate?.mcp_input?.arguments ?? {};
    const query = typeof args.query === "string" ? args.query : null;

    const errorUpdate = toolUpdates.find((u) => u.type === "mcp_error");
    if (errorUpdate) {
        return { articles: [], totalResults: 0, query, isLoading: false, isComplete: true, isError: true };
    }

    const outputUpdate = toolUpdates.find((u) => u.type === "mcp_output");
    if (outputUpdate?.mcp_output) {
        const rawResult = outputUpdate.mcp_output.result;
        let result: { articles?: NewsArticle[]; total_results?: number } | null = null;

        if (typeof rawResult === "object" && rawResult !== null) {
            result = rawResult as typeof result;
        } else if (typeof rawResult === "string") {
            try { result = JSON.parse(rawResult); } catch { /* ignore */ }
        }

        if (result?.articles) {
            return {
                articles: result.articles,
                totalResults: result.total_results ?? result.articles.length,
                query,
                isLoading: false,
                isComplete: true,
                isError: false,
            };
        }
    }

    const isComplete = toolUpdates.some((u) => u.type === "mcp_output" || u.type === "mcp_error");
    return { articles: [], totalResults: 0, query, isLoading: !isComplete, isComplete, isError: false };
}

export const NewsInline: React.FC<ToolRendererProps> = ({
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    toolGroupId = "default",
}) => {
    const visibleUpdates = currentIndex !== undefined
        ? toolUpdates.slice(0, currentIndex + 1)
        : toolUpdates;

    const data = useMemo(() => parseNewsData(visibleUpdates), [visibleUpdates]);

    // Loading state — show while waiting for mcp_output
    if (data.isLoading) {
        return (
            <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>
                        Fetching news{data.query ? ` for "${data.query}"` : ""}...
                    </span>
                </div>
                {/* Skeleton cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="rounded-lg bg-card border border-border overflow-hidden">
                            <div className="w-full aspect-video bg-muted animate-pulse" />
                            <div className="p-3 space-y-2">
                                <div className="h-3 bg-muted animate-pulse rounded w-24" />
                                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                                <div className="h-3 bg-muted animate-pulse rounded w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (data.isError) {
        return (
            <div className="flex items-center gap-2 text-sm text-destructive py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Failed to fetch news articles.</span>
            </div>
        );
    }

    // Empty state
    if (data.isComplete && data.articles.length === 0) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Newspaper className="w-4 h-4 flex-shrink-0" />
                <span>No articles found{data.query ? ` for "${data.query}"` : ""}.</span>
            </div>
        );
    }

    const displayArticles = data.articles.slice(0, 6);
    const hasMore = data.totalResults > displayArticles.length;

    return (
        <div className="space-y-3">
            {/* Article grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayArticles.map((article, index) => (
                    <a
                        key={index}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block bg-card rounded-lg border border-border overflow-hidden hover:border-primary/30 hover:shadow-md transition-all duration-200 animate-in fade-in zoom-in-95"
                        style={{
                            animationDelay: `${index * 80}ms`,
                            animationDuration: "300ms",
                            animationFillMode: "backwards",
                        }}
                    >
                        {/* Article Image */}
                        {article.url_to_image ? (
                            <div className="relative w-full aspect-video bg-muted overflow-hidden">
                                <img
                                    src={article.url_to_image}
                                    alt={article.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    onError={(e) => {
                                        e.currentTarget.parentElement!.style.display = "none";
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ) : (
                            <div className="w-full aspect-video bg-muted flex items-center justify-center">
                                <Newspaper className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                        )}

                        {/* Article Content */}
                        <div className="p-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-primary truncate">
                                    {article.source?.name}
                                </span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                {article.title}
                            </h3>

                            {article.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {article.description}
                                </p>
                            )}

                            {article.published_at && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3 flex-shrink-0" />
                                    <span>
                                        {new Date(article.published_at).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </a>
                ))}
            </div>

            {/* View all button */}
            {onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer animate-in fade-in slide-in-from-bottom"
                    style={{
                        animationDelay: `${displayArticles.length * 80}ms`,
                        animationDuration: "300ms",
                        animationFillMode: "backwards",
                    }}
                >
                    <Newspaper className="w-4 h-4" />
                    <span>
                        {hasMore
                            ? `View all ${data.totalResults} articles`
                            : `View ${data.articles.length} ${data.articles.length === 1 ? "article" : "articles"}`}
                    </span>
                </button>
            )}
        </div>
    );
};
