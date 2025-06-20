"use client";
import React, { useMemo, useEffect, useState } from "react";
import { Search, Globe, Image, MessageCircleQuestion, Brain, ExternalLink, Clock, Users, BarChart3, FileText, Eye, ChevronRight } from "lucide-react";
import { PageTemplate, Card, Grid, StatusIndicator } from "@/features/scraper/parts/reusable/PageTemplate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProcessedSerpData, SerpProcessor } from "@/features/scraper/parts/recipes/serp-processor";
import { useAppSelector } from "@/lib/redux/hooks";
import { brokerSelectors } from "@/lib/redux/brokerSlice";

interface SerpResultsPageProps {
    data?: ProcessedSerpData;
}

const SerpResultsPage: React.FC<SerpResultsPageProps> = ({ data }) => {
    const dataFromBroker = useAppSelector((state) => brokerSelectors.selectValue(state, "7b601ec6-c20a-40d9-8d35-80796083f8db"));
    const clientSite = useAppSelector((state) => brokerSelectors.selectValue(state, "b465901e-28e4-4f39-9683-2083d91515cd"));

    const dataToUse = useMemo(() => {
        if (data) {
            return data;
        }
        if (dataFromBroker?.data) {
            // The broker data structure is flat, but SerpProcessor expects { results: {...} }
            return { results: dataFromBroker.data } as ProcessedSerpData;
        }
        return null;
    }, [data, dataFromBroker]);

    const processor = useMemo(() => new SerpProcessor(dataToUse), [dataToUse]);
    const summary = useMemo(() => processor.getSummary(), [processor]);

    // Helper function to check if a URL matches the client site
    const isClientSite = (url?: string) => {
        if (!clientSite || !url) return false;

        try {
            // Normalize the client site (remove protocol and www)
            const normalizedClientSite = clientSite.replace(/^(https?:\/\/)?(www\.)?/i, "").toLowerCase();

            // Normalize the URL (remove protocol and www)
            const normalizedUrl = url.replace(/^(https?:\/\/)?(www\.)?/i, "").toLowerCase();

            // Check if the normalized client site appears in the normalized URL
            return normalizedUrl.includes(normalizedClientSite);
        } catch {
            return false;
        }
    };

    if (!dataToUse) {
        return <div>Search Results Not Available</div>;
    }

    const OverviewContent = () => {
        const searchInfo = processor.getSearchInformation();
        const searchParams = processor.getSearchParameters();
        const metadata = processor.getSearchMetadata();

        return (
            <Grid cols={2} gap="medium">
                <Card title="Search Summary">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Query</span>
                            <Badge variant="secondary" className="font-mono text-sm">
                                {summary.query || "N/A"}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Results</span>
                            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                {summary.totalResults.toLocaleString()}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Taken</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">{searchInfo?.time_taken_displayed || "N/A"}s</span>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Engine</span>
                            <Badge variant="outline">{searchParams?.engine || "Google"}</Badge>
                        </div>
                    </div>
                </Card>

                <Card title="Content Breakdown">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Globe className="h-4 w-4 mr-2 text-blue-500" />
                                <span className="text-sm">Organic Results</span>
                            </div>
                            <Badge variant="secondary">{summary.organicResultsCount}</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <MessageCircleQuestion className="h-4 w-4 mr-2 text-green-500" />
                                <span className="text-sm">Related Questions</span>
                            </div>
                            <Badge variant="secondary">{summary.relatedQuestionsCount}</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Image className="h-4 w-4 mr-2 text-purple-500" />
                                <span className="text-sm">Inline Images</span>
                            </div>
                            <Badge variant="secondary">{summary.inlineImagesCount}</Badge>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Brain className="h-4 w-4 mr-2 text-orange-500" />
                                <span className="text-sm">AI Overview</span>
                            </div>
                            <Badge variant={summary.hasAIOverview ? "default" : "secondary"}>
                                {summary.hasAIOverview ? "Available" : "None"}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2 text-blue-500" />
                                <span className="text-sm">Local Results</span>
                            </div>
                            <Badge variant="secondary">{summary.localResultsCount}</Badge>
                        </div>
                    </div>
                </Card>
            </Grid>
        );
    };

    // Organic Results Content
    const OrganicResultsContent = () => {
        const organicResults = processor.getOrganicResults();

        if (organicResults.length === 0) {
            return (
                <Card title="Organic Search Results">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No organic results found</p>
                </Card>
            );
        }

        return (
            <Card title={`Organic Search Results (${organicResults.length})`}>
                <div className="space-y-6">
                    {organicResults.map((result, index) => {
                        const isClient = isClientSite(result.link) || isClientSite(result.displayed_link);
                        return (
                            <div
                                key={index}
                                className={`border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-6 last:pb-0 ${
                                    isClient ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 -m-2" : ""
                                }`}
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="flex-shrink-0">
                                        <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                                            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                                                {result.position || index + 1}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1">
                                            {result.about_this_result?.source?.icon && (
                                                <Avatar className="h-4 w-4">
                                                    <AvatarImage src={result.about_this_result.source.icon} />
                                                    <AvatarFallback className="text-xs">
                                                        {result.displayed_link?.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <span className="text-sm text-green-600 dark:text-green-400 truncate">
                                                {result.displayed_link}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline mb-2">
                                            <a href={result.link} target="_blank" rel="noopener noreferrer">
                                                {result.title}
                                            </a>
                                        </h3>

                                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">{result.snippet}</p>

                                        {/* Additional SEO Details */}
                                        <div className="space-y-2 mb-3">
                                            {result.source && (
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Source:</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {result.source}
                                                    </Badge>
                                                </div>
                                            )}

                                            {result.snippet_highlighted_words && result.snippet_highlighted_words.length > 0 && (
                                                <div className="flex items-start space-x-2">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                                                        Keywords:
                                                    </span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {result.snippet_highlighted_words.map((word, idx) => (
                                                            <Badge key={idx} variant="secondary" className="text-xs">
                                                                {word}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {result.missing && result.missing.length > 0 && (
                                                <div className="flex items-start space-x-2">
                                                    <span className="text-xs font-medium text-red-500">Missing:</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {result.missing.map((word, idx) => (
                                                            <Badge key={idx} variant="destructive" className="text-xs">
                                                                {word}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {result.sitelinks?.inline && result.sitelinks.inline.length > 0 && (
                                            <div className="mb-3">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                                                    Sitelinks:
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {result.sitelinks.inline.map((sitelink, idx) => (
                                                        <Button key={idx} variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                            <a href={sitelink.link} target="_blank" rel="noopener noreferrer">
                                                                {sitelink.title}
                                                            </a>
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* SEO Actions */}
                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs px-2"
                                                onClick={() => navigator.clipboard.writeText(result.link || "")}
                                                title="Copy URL"
                                            >
                                                📋 Copy URL
                                            </Button>
                                            {result.redirect_link && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 text-xs px-2"
                                                    onClick={() => navigator.clipboard.writeText(result.redirect_link || "")}
                                                    title="Copy Redirect URL"
                                                >
                                                    🔗 Copy Redirect
                                                </Button>
                                            )}
                                            {result.cached_page_link && (
                                                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" asChild>
                                                    <a href={result.cached_page_link} target="_blank" rel="noopener noreferrer">
                                                        📄 Cached
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    // AI Overview Content
    const AIOverviewContent = () => {
        const aiOverview = processor.getAIOverview();

        if (!aiOverview) {
            return (
                <Card title="AI Overview">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No AI overview available for this search</p>
                </Card>
            );
        }

        return (
            <Card title="AI Overview">
                <div className="space-y-4">
                    <StatusIndicator status="info" text="AI-generated overview from search results" />

                    {aiOverview.text && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{aiOverview.text}</p>
                        </div>
                    )}

                    {aiOverview.sources && aiOverview.sources.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Sources ({aiOverview.sources.length})
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {aiOverview.sources.map((source, index) => {
                                    const isClient = isClientSite(source.link) || isClientSite(source.displayed_link);
                                    return (
                                    <div
                                        key={index}
                                        className={`flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${
                                            isClient ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''
                                        }`}
                                    >
                                        <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <a
                                                href={source.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                                            >
                                                {source.title}
                                            </a>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{source.displayed_link}</p>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Card>
        );
    };

    // Related Questions Content
    const RelatedQuestionsContent = () => {
        const relatedQuestions = processor.getRelatedQuestions();

        if (relatedQuestions.length === 0) {
            return (
                <Card title="Related Questions">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No related questions found</p>
                </Card>
            );
        }

                        return (
                    <Card title={`People Also Ask (${relatedQuestions.length})`}>
                        <div className="space-y-4">
                            {relatedQuestions.map((question, index) => {
                                const isClient = isClientSite(question.link) || isClientSite(question.displayed_link);
                                return (
                                <div
                                    key={index}
                                    className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                        isClient ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''
                                    }`}
                                >
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{question.question}</h4>

                            {question.snippet && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">{question.snippet}</p>
                            )}

                            {question.link && (
                                <div className="flex items-center space-x-2">
                                    <ExternalLink className="h-3 w-3 text-gray-400" />
                                    <a
                                        href={question.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-green-600 dark:text-green-400 hover:underline truncate"
                                    >
                                        {question.displayed_link || question.link}
                                    </a>
                                </div>
                            )}
                        </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    // Images Content
    const ImagesContent = () => {
        const images = processor.getInlineImages();

        if (images.length === 0) {
            return (
                <Card title="Images">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No images found</p>
                </Card>
            );
        }

        return (
            <Card title={`Images (${images.length})`}>
                <div className="space-y-6">
                    {images.map((image, index) => {
                        const isClient = isClientSite(image.source) || isClientSite(image.original) || isClientSite(image.thumbnail);
                        return (
                        <div
                            key={index}
                            className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                isClient ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''
                            }`}
                        >
                            <div className="flex items-start space-x-4">
                                {/* Image Preview */}
                                <div className="flex-shrink-0">
                                    <div className="h-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center min-w-[80px] max-w-[200px]">
                                        <img
                                            src={image.thumbnail || image.original}
                                            alt={image.title || `Image ${index + 1}`}
                                            className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-200"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>

                                {/* Image Details */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    {/* Title */}
                                    {image.title && (
                                        <div>
                                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{image.title}</h4>
                                        </div>
                                    )}

                                    {/* Source Information */}
                                    <div className="space-y-2">
                                        {image.source_name && (
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {image.source_name}
                                                </Badge>
                                            </div>
                                        )}

                                        {image.source && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">
                                                    Source:
                                                </span>
                                                <a
                                                    href={image.source}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                                                >
                                                    {image.source}
                                                </a>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0"
                                                    onClick={() => navigator.clipboard.writeText(image.source || "")}
                                                    title="Copy source URL"
                                                >
                                                    📋
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Image URLs */}
                                    <div className="space-y-2">
                                        {image.thumbnail && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">
                                                    Thumbnail:
                                                </span>
                                                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate flex-1">
                                                    {image.thumbnail}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0"
                                                    onClick={() => navigator.clipboard.writeText(image.thumbnail || "")}
                                                    title="Copy thumbnail URL"
                                                >
                                                    📋
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" asChild>
                                                    <a
                                                        href={image.thumbnail}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Open thumbnail"
                                                    >
                                                        🔗
                                                    </a>
                                                </Button>
                                            </div>
                                        )}

                                        {image.original && image.original !== image.thumbnail && (
                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">
                                                    Original:
                                                </span>
                                                <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate flex-1">
                                                    {image.original}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-5 w-5 p-0"
                                                    onClick={() => navigator.clipboard.writeText(image.original || "")}
                                                    title="Copy original URL"
                                                >
                                                    📋
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" asChild>
                                                    <a
                                                        href={image.original}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Open original"
                                                    >
                                                        🔗
                                                    </a>
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {image.source && (
                                            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                <a href={image.source} target="_blank" rel="noopener noreferrer">
                                                    🌐 Visit Source
                                                </a>
                                            </Button>
                                        )}

                                        {image.serpapi_link && (
                                            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                <a href={image.serpapi_link} target="_blank" rel="noopener noreferrer">
                                                    🔍 SerpAPI Link
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    // Related Searches Content
    const RelatedSearchesContent = () => {
        const relatedSearches = processor.getRelatedSearches();

        if (relatedSearches.length === 0) {
            return (
                <Card title="Related Searches">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No related searches found</p>
                </Card>
            );
        }

        return (
            <Card title={`Related Searches (${relatedSearches.length})`}>
                <div className="space-y-3">
                    {relatedSearches.map((search, index) => {
                        const isClient = isClientSite(search.link) || isClientSite(search.serpapi_link);
                        return (
                        <div
                            key={index}
                            className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                isClient ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''
                            }`}
                        >
                            <div className="flex items-start space-x-3">
                                <Search className="h-4 w-4 mt-1 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">{search.query}</h4>

                                    {/* SEO Research Links */}
                                    <div className="flex flex-wrap gap-2">
                                        {search.link && (
                                            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                <a href={search.link} target="_blank" rel="noopener noreferrer">
                                                    🔍 Search Results
                                                </a>
                                            </Button>
                                        )}

                                        {search.serpapi_link && (
                                            <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                <a href={search.serpapi_link} target="_blank" rel="noopener noreferrer">
                                                    📊 SerpAPI Data
                                                </a>
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => navigator.clipboard.writeText(search.query || "")}
                                            title="Copy search query"
                                        >
                                            📋 Copy Query
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    // Local Results Content
    const LocalResultsContent = () => {
        const localResults = processor.getLocalResults();

        if (localResults.length === 0) {
            return (
                <Card title="Local Results">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No local business results found</p>
                </Card>
            );
        }

        return (
            <Card title={`Local Business Results (${localResults.length})`}>
                <div className="space-y-4">
                    {localResults.map((business, index) => {
                        const isClient = isClientSite(business.links?.website) || isClientSite(business.links?.directions);
                        return (
                        <div
                            key={index}
                            className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                isClient ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''
                            }`}
                        >
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                            {business.position || index + 1}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{business.title}</h4>
                                        {business.rating && (
                                            <div className="flex items-center space-x-1">
                                                <span className="text-yellow-500">★</span>
                                                <span className="text-sm font-medium">{business.rating}</span>
                                                {business.reviews && (
                                                    <span className="text-xs text-gray-500">({business.reviews} reviews)</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {business.type && (
                                        <Badge variant="outline" className="mb-2">
                                            {business.type}
                                        </Badge>
                                    )}

                                    {business.address && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">📍 {business.address}</p>
                                    )}

                                    {business.phone && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">📞 {business.phone}</p>}

                                    {business.hours && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">🕒 {business.hours}</p>}

                                    {business.description && (
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 italic">{business.description}</p>
                                    )}

                                    {business.links && (
                                        <div className="flex flex-wrap gap-2">
                                            {business.links.website && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                    <a href={business.links.website} target="_blank" rel="noopener noreferrer">
                                                        🌐 Website
                                                    </a>
                                                </Button>
                                            )}
                                            {business.links.directions && (
                                                <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                    <a href={business.links.directions} target="_blank" rel="noopener noreferrer">
                                                        🗺️ Directions
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    // Discussions Content
    const DiscussionsContent = () => {
        const discussions = processor.getDiscussionsAndForums();

        if (discussions.length === 0) {
            return (
                <Card title="Discussions & Forums">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No discussions or forums found</p>
                </Card>
            );
        }

        return (
            <Card title={`Discussions & Forums (${discussions.length})`}>
                <div className="space-y-4">
                    {discussions.map((discussion, index) => {
                        const isClient = isClientSite(discussion.link) || isClientSite(discussion.displayed_link);
                        return (
                        <div
                            key={index}
                            className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                                isClient ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/30' : ''
                            }`}
                        >
                            <div className="flex items-start space-x-3">
                                <Users className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                        <a
                                            href={discussion.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:text-blue-600 dark:hover:text-blue-400"
                                        >
                                            {discussion.title}
                                        </a>
                                    </h4>

                                    <p className="text-xs text-green-600 dark:text-green-400 mb-2">{discussion.displayed_link}</p>

                                    {discussion.snippet && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{discussion.snippet}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            </Card>
        );
    };

    // Pagination Content
    const PaginationContent = () => {
        const pagination = processor.getPagination();
        const serpApiPagination = processor.getSerpApiPagination();

        if (!pagination && !serpApiPagination) {
            return (
                <Card title="Pagination">
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No pagination data available</p>
                </Card>
            );
        }

        return (
            <Card title="Search Result Pages">
                <div className="space-y-6">
                    {/* Current Page Info */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Current Page</span>
                            <Badge variant="default" className="bg-blue-600">
                                Page {serpApiPagination?.current || pagination?.current || 1}
                            </Badge>
                        </div>
                    </div>

                    {/* Google Pagination (if available) */}
                    {pagination && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Google Search Pages
                            </h4>
                            <div className="space-y-2">
                                {pagination.next && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">Next Page:</span>
                                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                            <a href={pagination.next} target="_blank" rel="noopener noreferrer">
                                                🔍 View Page {(pagination.current || 1) + 1}
                                            </a>
                                        </Button>
                                    </div>
                                )}
                                
                                {pagination.other_pages && Object.keys(pagination.other_pages).length > 0 && (
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">All Pages:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(pagination.other_pages).map(([pageNum, url]) => (
                                                <Button
                                                    key={pageNum}
                                                    variant={parseInt(pageNum) === pagination.current ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    asChild
                                                >
                                                    <a href={url} target="_blank" rel="noopener noreferrer">
                                                        {pageNum}
                                                    </a>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SerpAPI Pagination (JSON endpoints) */}
                    {serpApiPagination && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                SerpAPI Data Pages (JSON)
                            </h4>
                            <div className="space-y-3">
                                {serpApiPagination.next_link && (
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-0 flex-shrink-0">Next Page Data:</span>
                                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate flex-1">
                                            {serpApiPagination.next_link}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={() => navigator.clipboard.writeText(serpApiPagination.next_link || "")}
                                            title="Copy API URL"
                                        >
                                            📋
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                            <a href={serpApiPagination.next_link} target="_blank" rel="noopener noreferrer">
                                                📊 Fetch JSON
                                            </a>
                                        </Button>
                                    </div>
                                )}
                                
                                {serpApiPagination.other_pages && Object.keys(serpApiPagination.other_pages).length > 0 && (
                                    <div>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">All Page APIs:</span>
                                        <div className="space-y-2">
                                            {Object.entries(serpApiPagination.other_pages).map(([pageNum, url]) => (
                                                <div key={pageNum} className="flex items-center space-x-2">
                                                    <Badge 
                                                        variant={parseInt(pageNum) === serpApiPagination.current ? "default" : "outline"}
                                                        className="text-xs min-w-[2rem] justify-center"
                                                    >
                                                        {pageNum}
                                                    </Badge>
                                                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded truncate flex-1">
                                                        {url}
                                                    </code>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 w-5 p-0"
                                                        onClick={() => navigator.clipboard.writeText(url)}
                                                        title="Copy API URL"
                                                    >
                                                        📋
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                                                        <a href={url} target="_blank" rel="noopener noreferrer">
                                                            📊 JSON
                                                        </a>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Usage Note */}
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start space-x-2">
                            <span className="text-amber-600 dark:text-amber-400 text-lg">💡</span>
                            <div>
                                <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                                    SEO Research Tip
                                </h5>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Use the JSON endpoints to fetch additional pages of results for comprehensive competitor analysis. 
                                    Each page shows different organic results that can reveal more competitor insights.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        );
    };

    // Stats for hero section
    const statsItems = [
        { label: "Total Results", value: summary.totalResults.toLocaleString() },
        { label: "Organic Results", value: summary.organicResultsCount },
        { label: "Local Results", value: summary.localResultsCount },
    ];

    // Define tabs
    const tabs = [
        {
            id: "overview",
            label: "Overview",
            icon: BarChart3,
            content: <OverviewContent />,
        },
        {
            id: "organic",
            label: "Search Results",
            icon: Globe,
            content: <OrganicResultsContent />,
        },
        {
            id: "local",
            label: "Local Results",
            icon: Users,
            content: <LocalResultsContent />,
        },
        {
            id: "related",
            label: "Related Searches",
            icon: Search,
            content: <RelatedSearchesContent />,
        },
        {
            id: "pagination",
            label: "Pagination",
            icon: ChevronRight,
            content: <PaginationContent />,
        },
        // Only show these tabs if data is available
        ...(summary.hasAIOverview
            ? [
                  {
                      id: "ai-overview",
                      label: "AI Overview",
                      icon: Brain,
                      content: <AIOverviewContent />,
                  },
              ]
            : []),
        ...(summary.relatedQuestionsCount > 0
            ? [
                  {
                      id: "questions",
                      label: "Related Questions",
                      icon: MessageCircleQuestion,
                      content: <RelatedQuestionsContent />,
                  },
              ]
            : []),
        ...(summary.inlineImagesCount > 0
            ? [
                  {
                      id: "images",
                      label: "Images",
                      icon: Image,
                      content: <ImagesContent />,
                  },
              ]
            : []),
        ...(processor.getDiscussionsAndForums().length > 0
            ? [
                  {
                      id: "discussions",
                      label: "Discussions",
                      icon: Users,
                      content: <DiscussionsContent />,
                  },
              ]
            : []),
    ];

    return (
        <PageTemplate
            title="Search Results Analysis"
            subtitle={`Query: "${summary.query}"`}
            url={processor.getSearchMetadata()?.google_url}
            urlText="View on Google"
            statsItems={statsItems}
            tabs={tabs}
            defaultActiveTab="overview"
            heroSize="xs"
        />
    );
};

export default SerpResultsPage;
