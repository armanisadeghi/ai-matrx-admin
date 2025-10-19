// File: features/workflows/results/registered-components/BraveSearchDisplay.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
    Search,
    Globe,
    Video,
    FileText,
    Filter,
    BarChart3,
    Clock,
} from "lucide-react";
import { Card } from "@/components/official/PageTemplate";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface BraveSearchData {
    type: string;
    content: {
        query: {
            original: string;
            country?: string;
            [key: string]: any;
        };
        mixed?: {
            type: string;
            main: Array<{ type: string; index?: number; all?: boolean }>;
            top: any[];
            side: any[];
        };
        videos?: {
            type: string;
            results: VideoResult[];
            mutated_by_goggles: boolean;
        };
        web?: {
            type: string;
            results: WebResult[];
            family_friendly: boolean;
        };
    };
}

export interface VideoResult {
    type: string;
    url: string;
    title: string;
    description?: string;
    age?: string;
    page_age?: string;
    video?: {
        duration?: string;
        creator?: string;
        publisher?: string;
    };
    thumbnail?: {
        src: string;
        original?: string;
    };
    meta_url?: {
        hostname?: string;
        favicon?: string;
    };
}

export interface WebResult {
    title: string;
    url: string;
    description?: string;
    page_age?: string;
    age?: string;
    profile?: {
        name?: string;
        long_name?: string;
        img?: string;
    };
    thumbnail?: {
        src?: string;
        original?: string;
    };
    meta_url?: {
        hostname?: string;
        favicon?: string;
        path?: string;
    };
    extra_snippets?: string[];
    subtype?: string;
}

interface BraveSearchDisplayProps {
    data: BraveSearchData;
}

const BraveSearchDisplay: React.FC<BraveSearchDisplayProps> = ({ data }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [selectedSubtype, setSelectedSubtype] = useState<string>("all");
    const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

    // Extract query information
    const query = data?.content?.query?.original || "Search Query";
    const country = data?.content?.query?.country?.toUpperCase() || "US";

    // Calculate statistics
    const stats = useMemo(() => {
        const webResults = data?.content?.web?.results?.length || 0;
        const videoResults = data?.content?.videos?.results?.length || 0;
        const totalResults = webResults + videoResults;

        // Count unique domains
        const domains = new Set<string>();
        data?.content?.web?.results?.forEach((result) => {
            if (result.meta_url?.hostname) {
                domains.add(result.meta_url.hostname);
            }
        });

        // Count subtypes
        const subtypes = new Map<string, number>();
        data?.content?.web?.results?.forEach((result) => {
            const subtype = result.subtype || "generic";
            subtypes.set(subtype, (subtypes.get(subtype) || 0) + 1);
        });

        return {
            totalResults,
            webResults,
            videoResults,
            uniqueDomains: domains.size,
            subtypes: Array.from(subtypes.entries()).sort((a, b) => b[1] - a[1]),
        };
    }, [data]);

    // Group results by domain
    const resultsByDomain = useMemo(() => {
        const grouped = new Map<string, WebResult[]>();
        data?.content?.web?.results?.forEach((result) => {
            const domain = result.meta_url?.hostname || "Unknown";
            if (!grouped.has(domain)) {
                grouped.set(domain, []);
            }
            grouped.get(domain)?.push(result);
        });
        return Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length);
    }, [data?.content?.web?.results]);

    // Group results by subtype
    const resultsBySubtype = useMemo(() => {
        const grouped = new Map<string, WebResult[]>();
        data?.content?.web?.results?.forEach((result) => {
            const subtype = result.subtype || "generic";
            if (!grouped.has(subtype)) {
                grouped.set(subtype, []);
            }
            grouped.get(subtype)?.push(result);
        });
        return grouped;
    }, [data?.content?.web?.results]);

    // Filter results based on selected subtype
    const filteredWebResults = useMemo(() => {
        if (selectedSubtype === "all") {
            return data?.content?.web?.results || [];
        }
        return resultsBySubtype.get(selectedSubtype) || [];
    }, [data?.content?.web?.results, selectedSubtype, resultsBySubtype]);

    // Stats for hero section
    const statsItems = [
        { label: "Total Results", value: stats.totalResults },
        { label: "Web Results", value: stats.webResults },
        { label: "Videos", value: stats.videoResults },
        { label: "Domains", value: stats.uniqueDomains },
    ];

    // Overview Content - Compact, useful overview of all content types
    const OverviewContent = () => {
        const topWebResults = data?.content?.web?.results?.slice(0, 10) || [];
        const topVideos = data?.content?.videos?.results?.slice(0, 4) || [];
        
        // Filter images more strictly - check for actual image URLs and filter out very small images
        const resultsWithImages = data?.content?.web?.results
            ?.filter(r => {
                const src = r.thumbnail?.src;
                if (!src) return false;
                // Filter out data URLs, very small tracking pixels, and common placeholder patterns
                if (src.startsWith('data:')) return false;
                if (src.includes('1x1')) return false;
                if (src.includes('pixel')) return false;
                if (src.includes('tracking')) return false;
                // Check if it has common image extensions or is from a CDN
                const hasImageExt = /\.(jpg|jpeg|png|gif|webp|svg)/i.test(src);
                const isCDN = src.includes('cdn') || src.includes('image') || src.includes('img') || src.includes('photo');
                return hasImageExt || isCDN;
            })
            .slice(0, 8) || [];

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Top Web Results - Takes 2 columns on large screens */}
                <div className="lg:col-span-2 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                        <Globe className="w-4 h-4 mr-2" />
                        Top Web Results
                    </h3>
                    {topWebResults.map((result, index) => (
                        <React.Fragment key={index}>
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
                                <div className="flex items-start gap-2 p-3">
                                    <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center mt-0.5">
                                        {result.profile?.img ? (
                                            <img 
                                                src={result.profile.img} 
                                                alt="" 
                                                className="w-4 h-4 rounded"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <Globe className="w-3 h-3 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-0.5">
                                        <a
                                            href={result.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline line-clamp-1 block"
                                        >
                                            {result.title}
                                        </a>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {result.meta_url?.hostname || result.profile?.long_name}
                                        </div>
                                        {result.description && (
                                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                                {result.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Insert image gallery after 3rd result */}
                            {index === 2 && resultsWithImages.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                                        <FileText className="w-3 h-3 mr-1.5" />
                                        Related Images
                                    </h4>
                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                        {resultsWithImages.map((imgResult, imgIndex) => (
                                            <a
                                                key={imgIndex}
                                                href={imgResult.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative flex-shrink-0 w-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 hover:ring-2 hover:ring-blue-500 transition-all border border-gray-200 dark:border-gray-700"
                                                title={imgResult.title}
                                            >
                                                <div className="aspect-video bg-gray-200 dark:bg-gray-900 flex items-center justify-center">
                                                    <img
                                                        src={imgResult.thumbnail?.src}
                                                        alt={imgResult.title}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                        onError={(e) => {
                                                            // Hide the entire link if image fails
                                                            const link = e.currentTarget.closest('a');
                                                            if (link) {
                                                                link.style.display = 'none';
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                                                    <p className="text-xs text-white font-medium line-clamp-2">
                                                        {imgResult.title}
                                                    </p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Right Column - Videos Only */}
                <div className="space-y-4">
                    {/* Videos Section */}
                    {topVideos.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                <Video className="w-4 h-4 mr-2" />
                                Top Videos
                            </h3>
                            <div className="space-y-2 max-w-md mx-auto">
                                {topVideos.map((video, index) => (
                                    <div
                                        key={index}
                                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-sm transition-shadow"
                                    >
                                        <a
                                            href={video.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            {video.thumbnail?.src && (
                                                <div className="relative bg-gray-900 dark:bg-black">
                                                    <img 
                                                        src={video.thumbnail.src} 
                                                        alt={video.title} 
                                                        className="w-full aspect-video object-contain"
                                                        onError={(e) => {
                                                            e.currentTarget.parentElement!.style.display = "none";
                                                        }}
                                                    />
                                                    {video.video?.duration && (
                                                        <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs px-1.5 py-0.5 rounded">
                                                            {video.video.duration}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="p-2">
                                                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">
                                                    {video.title}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                    {video.video?.creator || video.meta_url?.hostname}
                                                </p>
                                            </div>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Web Results Content - Show all snippets, no collapsing
    const WebResultsContent = () => (
        <div className="space-y-3">
            {/* Filter by subtype */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <Button
                    variant={selectedSubtype === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSubtype("all")}
                    className="flex-shrink-0"
                >
                    All ({stats.webResults})
                </Button>
                {stats.subtypes.map(([subtype, count]) => (
                    <Button
                        key={subtype}
                        variant={selectedSubtype === subtype ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSubtype(subtype)}
                        className="flex-shrink-0 capitalize"
                    >
                        {subtype} ({count})
                    </Button>
                ))}
            </div>

            {filteredWebResults.map((result, index) => {
                const hasExtraSnippets = result.extra_snippets && result.extra_snippets.length > 0;

                return (
                    <div
                        key={index}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                    >
                        <div className="flex gap-4">
                            {/* Left side: Favicon + Content */}
                            <div className="flex-1 min-w-0">
                                {/* Favicon + URL + Badge Row */}
                                <div className="flex items-center gap-2 mb-1">
                                    {/* Favicon */}
                                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                                        {result.profile?.img ? (
                                            <img 
                                                src={result.profile.img} 
                                                alt="" 
                                                className="w-5 h-5 rounded"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <Globe className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                        )}
                                    </div>

                                    {/* URL/Hostname */}
                                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        {result.meta_url?.hostname || result.profile?.long_name || "Unknown"}
                                    </span>

                                    {/* Age */}
                                    {result.age && (
                                        <>
                                            <span className="text-gray-400 text-xs">•</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center flex-shrink-0">
                                                <Clock className="h-3 w-3 mr-1" />
                                                {result.age}
                                            </span>
                                        </>
                                    )}

                                    {/* Subtype Badge */}
                                    {result.subtype && (
                                        <Badge variant="outline" className="ml-auto flex-shrink-0 text-xs capitalize">
                                            {result.subtype}
                                        </Badge>
                                    )}
                                </div>

                                {/* Title */}
                                <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-lg font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline mb-2 line-clamp-2"
                                >
                                    {result.title}
                                </a>

                                {/* Description */}
                                {result.description && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                        {result.description}
                                    </p>
                                )}

                                {/* All Snippets (always shown) */}
                                {hasExtraSnippets && (
                                    <div className="mt-2 space-y-2 pl-4 border-l-2 border-blue-300 dark:border-blue-700">
                                        {result.extra_snippets?.map((snippet, idx) => (
                                            <p key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                                                {snippet}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Right side: Thumbnail (if exists) */}
                            {result.thumbnail?.src && (
                                <div className="flex-shrink-0">
                                    <img
                                        src={result.thumbnail.src}
                                        alt=""
                                        className="w-28 h-28 rounded-lg object-cover"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Video Results Content
    const VideoResultsContent = () => (
        <div className="space-y-3">
            {data?.content?.videos?.results?.map((video, index) => (
                <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-start gap-3">
                        {video.thumbnail?.src && (
                            <div className="relative flex-shrink-0">
                                <img src={video.thumbnail.src} alt="" className="w-32 h-20 rounded object-cover" />
                                {video.video?.duration && (
                                    <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                                        {video.video.duration}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 line-clamp-2 mb-1 block"
                            >
                                {video.title}
                            </a>

                            <div className="flex items-center gap-2 mb-2 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                                {video.meta_url?.favicon && (
                                    <img src={video.meta_url.favicon} alt="" className="h-3 w-3 rounded" />
                                )}
                                {video.video?.creator && <span>{video.video.creator}</span>}
                                {video.video?.publisher && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <span>{video.video.publisher}</span>
                                    </>
                                )}
                                {video.age && (
                                    <>
                                        <span className="text-gray-400">•</span>
                                        <span className="flex items-center">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {video.age}
                                        </span>
                                    </>
                                )}
                            </div>

                            {video.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{video.description}</p>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    // By Domain Content
    const ByDomainContent = () => (
        <Accordion type="multiple" className="w-full">
            {resultsByDomain.map(([domain, results]) => (
                <AccordionItem key={domain} value={domain} className="border-b border-gray-200 dark:border-gray-700">
                    <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-2">
                                {results[0]?.profile?.img && (
                                    <img src={results[0].profile.img} alt="" className="h-4 w-4 rounded" />
                                )}
                                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{domain}</span>
                            </div>
                            <Badge variant="secondary">{results.length}</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                        <div className="space-y-2 pl-6">
                            {results.map((result, idx) => (
                                <div
                                    key={idx}
                                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-900 rounded border border-gray-100 dark:border-gray-800"
                                >
                                    <a
                                        href={result.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 line-clamp-1 mb-1 block"
                                    >
                                        {result.title}
                                    </a>
                                    {result.description && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{result.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );

    // Define tabs
    const tabs = [
        {
            id: "overview",
            label: "Overview",
            icon: BarChart3,
            content: <OverviewContent />,
        },
        {
            id: "web",
            label: "Web Results",
            icon: Globe,
            content: <WebResultsContent />,
        },
        {
            id: "videos",
            label: "Videos",
            icon: Video,
            content: <VideoResultsContent />,
        },
        {
            id: "domains",
            label: "By Domain",
            icon: FileText,
            content: <ByDomainContent />,
        },
    ];

    // Error state
    if (!data?.content) {
        return (
            <div className="w-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 min-h-screen">
                <div className="max-w-full px-2 sm:px-4 lg:px-6 py-4">
                    <Card title="Error">
                        <div className="text-red-500 p-4">No search data available</div>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 min-h-screen">
            <div className="max-w-full p-2 space-x-1">
                {/* Hero section */}
                <div className="mb-2 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-2 relative rounded-xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-indigo-700/30 backdrop-blur-sm rounded-xl"></div>
                        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between">
                            <div className="mb-4 md:mb-0">
                                <div className="flex items-center mb-2">
                                    <Search className="h-6 w-6 text-white mr-2" />
                                    <h1 className="text-2xl font-extrabold text-white leading-tight">Brave Search Results</h1>
                                </div>
                                <p className="pl-10 text-white/90 text-base font-medium">''{query}''</p>
                            </div>

                            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                                {statsItems.map((stat, index) => (
                                    <div key={index} className="bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-center">
                                        <div className="text-white/80 text-xs font-medium mb-0.5">{stat.label}</div>
                                        <div className="text-white text-lg font-bold">{stat.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-2 flex space-x-1 overflow-x-auto pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-lg flex items-center font-medium transition-all duration-200 text-sm ${
                                activeTab === tab.id
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "bg-white hover:bg-gray-100 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200"
                            }`}
                        >
                            <tab.icon className="mr-2 h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Main content */}
                {tabs.map((tab) => (
                    <div key={tab.id} className={activeTab === tab.id ? "block" : "hidden"}>
                        {tab.content}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default React.memo(BraveSearchDisplay);

