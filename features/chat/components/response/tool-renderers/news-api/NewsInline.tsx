"use client";

import React from "react";
import { Newspaper, Calendar, ExternalLink } from "lucide-react";
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
 * Grid layout inline renderer for News API results
 * Shows 6-8 article cards with images, headlines, source, and published date
 */
export const NewsInline: React.FC<ToolRendererProps> = ({ 
    toolUpdates, 
    currentIndex,
    onOpenOverlay,
    toolGroupId = "default" 
}) => {
    const visibleUpdates = currentIndex !== undefined 
        ? toolUpdates.slice(0, currentIndex + 1) 
        : toolUpdates;
    
    if (visibleUpdates.length === 0) return null;
    
    return (
        <div className="space-y-5">
            {visibleUpdates.map((update, index) => {
                // Handle news API results
                if (update.type === "mcp_output" && update.mcp_output) {
                    const rawResult = update.mcp_output.result;
                    // Guard against non-object results (e.g. string from DB)
                    if (!rawResult || typeof rawResult !== 'object') return null;
                    const result = rawResult as NewsApiResult;
                    
                    if (!result.articles || result.articles.length === 0) {
                        return null;
                    }
                    
                    const articles = result.articles;
                    const totalResults = result.total_results || articles.length;
                    const displayArticles = articles.slice(0, 6); // Show first 6 articles
                    const hasMore = articles.length > displayArticles.length;
                    
                    return (
                        <div key={`news-${index}`} className="space-y-3">
                            {/* Grid of article cards - Clean, no extra messages */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {displayArticles.map((article, articleIndex) => (
                                    <a
                                        key={articleIndex}
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group block bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-200 animate-in fade-in zoom-in-95"
                                        style={{ 
                                            animationDelay: `${articleIndex * 80}ms`,
                                            animationDuration: '300ms',
                                            animationFillMode: 'backwards'
                                        }}
                                    >
                                        {/* Article Image */}
                                        {article.url_to_image ? (
                                            <div className="relative w-full aspect-video bg-slate-100 dark:bg-slate-900 overflow-hidden">
                                                <img
                                                    src={article.url_to_image}
                                                    alt={article.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    onError={(e) => {
                                                        // Replace with placeholder on error
                                                        const parent = e.currentTarget.parentElement;
                                                        if (parent) {
                                                            parent.innerHTML = `
                                                                <div class="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                                                    <svg class="w-12 h-12 text-slate-300 dark:text-slate-700" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                                                    </svg>
                                                                </div>
                                                            `;
                                                        }
                                                    }}
                                                />
                                                {/* Overlay gradient for readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-video bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                                <Newspaper className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                                            </div>
                                        )}
                                        
                                        {/* Article Content */}
                                        <div className="p-3 space-y-2">
                                            {/* Source */}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">
                                                    {article.source.name}
                                                </span>
                                                <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            
                                            {/* Title */}
                                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {article.title}
                                            </h3>
                                            
                                            {/* Description */}
                                            {article.description && (
                                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                                    {article.description}
                                                </p>
                                            )}
                                            
                                            {/* Published Date */}
                                            {article.published_at && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>
                                                        {new Date(article.published_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </a>
                                ))}
                            </div>
                            
                            {/* View all button — always show when overlay is available */}
                            {onOpenOverlay && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenOverlay(`tool-group-${toolGroupId}`);
                                    }}
                                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 text-sm font-medium hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer animate-in fade-in slide-in-from-bottom"
                                    style={{ 
                                        animationDelay: `${displayArticles.length * 80}ms`,
                                        animationDuration: '300ms',
                                        animationFillMode: 'backwards'
                                    }}
                                >
                                    <Newspaper className="w-4 h-4" />
                                    <span>{hasMore ? `View all ${articles.length} articles` : `View ${articles.length} ${articles.length === 1 ? 'article' : 'articles'}`}</span>
                                </button>
                            )}
                        </div>
                    );
                }
                
                // Don't render anything for other update types - keep it clean
                return null;
            })}
        </div>
    );
};

