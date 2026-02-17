"use client";

import React, { useState, useMemo } from "react";
import { Newspaper, Calendar, ExternalLink, Filter, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolRendererProps } from "../types";

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

interface NewsApiResult {
    intro?: string;
    date?: string;
    total_results: number;
    articles: NewsArticle[];
}

/**
 * Enhanced overlay renderer for News API results
 * Full scrollable list with filtering by source and sorting options
 */
export const NewsOverlay: React.FC<ToolRendererProps> = ({ toolUpdates }) => {
    const [selectedSource, setSelectedSource] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    
    // Extract news data from tool updates
    const newsData = useMemo(() => {
        const outputUpdate = toolUpdates.find((u) => u.type === "mcp_output");
        if (!outputUpdate?.mcp_output) return null;
        
        const rawResult = outputUpdate.mcp_output.result;
        if (!rawResult || typeof rawResult !== 'object') return null;
        const result = rawResult as NewsApiResult;
        if (!result.articles) return null;
        
        return result;
    }, [toolUpdates]);
    
    // Get unique sources
    const sources = useMemo(() => {
        if (!newsData) return [];
        const uniqueSources = new Set(newsData.articles.map(a => a.source.name));
        return Array.from(uniqueSources).sort();
    }, [newsData]);
    
    // Filter and sort articles
    const filteredArticles = useMemo(() => {
        if (!newsData) return [];
        
        let articles = [...newsData.articles];
        
        // Filter by source
        if (selectedSource !== "all") {
            articles = articles.filter(a => a.source.name === selectedSource);
        }
        
        // Sort by date
        articles.sort((a, b) => {
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
            return sortBy === "newest" ? dateB - dateA : dateA - dateB;
        });
        
        return articles;
    }, [newsData, selectedSource, sortBy]);
    
    if (!newsData) {
        return (
            <div className="p-4 text-center text-slate-600 dark:text-slate-400">
                No news data available
            </div>
        );
    }
    
    return (
        <div className="w-full h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
            {/* Filters and Sorting */}
            <div className="mb-4 flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
                {/* Source Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <Button
                        variant={selectedSource === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSource("all")}
                    >
                        All Sources ({newsData.articles.length})
                    </Button>
                    {sources.map(source => {
                        const count = newsData.articles.filter(a => a.source.name === source).length;
                        return (
                            <Button
                                key={source}
                                variant={selectedSource === source ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedSource(source)}
                            >
                                {source} ({count})
                            </Button>
                        );
                    })}
                </div>
                
                {/* Sort Options */}
                <div className="flex items-center gap-2 ml-auto">
                    <SortAsc className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <Button
                        variant={sortBy === "newest" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortBy("newest")}
                    >
                        Newest First
                    </Button>
                    <Button
                        variant={sortBy === "oldest" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSortBy("oldest")}
                    >
                        Oldest First
                    </Button>
                </div>
            </div>
            
            {/* Articles List */}
            <div className="space-y-4">
                {filteredArticles.map((article, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="flex flex-col md:flex-row gap-4 p-4">
                            {/* Article Image */}
                            {article.url_to_image && (
                                <div className="w-full md:w-64 flex-shrink-0">
                                    <img
                                        src={article.url_to_image}
                                        alt={article.title}
                                        className="w-full h-48 md:h-full object-cover rounded-lg"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                </div>
                            )}
                            
                            {/* Article Content */}
                            <div className="flex-1 min-w-0 space-y-3">
                                {/* Source and Date */}
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <Badge variant="default" className="text-xs">
                                        {article.source.name}
                                    </Badge>
                                    {article.published_at && (
                                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500">
                                            <Calendar className="w-3 h-3" />
                                            <span>
                                                {new Date(article.published_at).toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Title */}
                                <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block"
                                >
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                        {article.title}
                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </h2>
                                </a>
                                
                                {/* Author */}
                                {article.author && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        By {article.author}
                                    </p>
                                )}
                                
                                {/* Description */}
                                {article.description && (
                                    <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {article.description}
                                    </p>
                                )}
                                
                                {/* Content Preview */}
                                {article.content && (
                                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                                        {article.content}
                                    </p>
                                )}
                                
                                {/* Read More Link */}
                                <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Read full article
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* No results message */}
            {filteredArticles.length === 0 && (
                <div className="text-center py-12">
                    <Newspaper className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">
                        No articles found for the selected filters
                    </p>
                </div>
            )}
        </div>
    );
};

