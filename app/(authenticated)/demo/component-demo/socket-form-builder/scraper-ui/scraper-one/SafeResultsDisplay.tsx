import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const SafeScraperDisplay = ({ socketHook }) => {
    const { streamingResponse, responses, responseRef } = socketHook;
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [activeTab, setActiveTab] = useState("organized");
    const [expandedSection, setExpandedSection] = useState(null);

    // Filter out initialization messages
    const contentResponses = useMemo(() => {
        if (!responses || responses.length === 0) return [];

        return responses.filter((response) => {
            if (!response) return false;

            // Skip initialization messages
            if (typeof response === "object" && response.status === "success" && response.message === "initialized") {
                return false;
            }

            return true;
        });
    }, [responses]);

    // Function to safely parse JSON
    const safeParseJSON = (jsonString) => {
        if (!jsonString) return null;

        if (typeof jsonString !== "string") {
            return jsonString; // It's already an object
        }

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON parsing error:", e);
            return null;
        }
    };

    // Function to safely copy text to clipboard
    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    // Function to extract data safely
    const extractData = (pageData) => {
        let parsedContent = null;
        let statusValue = "unknown";
        let textData = "";
        let overview = {};
        let organizedData = {};
        let structuredData = {};
        let contentFilterDetails = [];
        let noiseRemoverDetails = [];
        let hashes = [];

        try {
            // Handle string response
            if (typeof pageData === "string") {
                try {
                    const parsed = JSON.parse(pageData);
                    statusValue = parsed.status || "unknown";

                    if (parsed.parsed_content) {
                        parsedContent = safeParseJSON(parsed.parsed_content);
                    } else {
                        parsedContent = parsed;
                    }
                } catch (e) {
                    console.error("Error parsing string pageData:", e);
                    return {
                        error: `Error parsing string content: ${e.message}`,
                        isError: true,
                    };
                }
            }
            // Handle object response
            else if (typeof pageData === "object" && pageData !== null) {
                statusValue = pageData.status || "unknown";

                if (pageData.parsed_content) {
                    parsedContent = safeParseJSON(pageData.parsed_content);
                } else {
                    parsedContent = pageData;
                }
            }

            if (!parsedContent) {
                console.error("Failed to parse content");
                return {
                    error: "Error parsing content. Data format not recognized.",
                    isError: true,
                };
            }

            // Extract content
            overview = parsedContent.overview || {};
            textData = parsedContent.text_data || "";
            organizedData = parsedContent.organized_data || {};
            structuredData = parsedContent.structured_data || {};
            contentFilterDetails = parsedContent.content_filter_removal_details || [];
            noiseRemoverDetails = parsedContent.noise_remover_removal_details || [];
            hashes = parsedContent.hashes || [];

            return {
                isError: false,
                statusValue,
                overview,
                textData,
                organizedData,
                structuredData,
                contentFilterDetails,
                noiseRemoverDetails,
                hashes,
                parsedContent,
            };
        } catch (error) {
            console.error("Error extracting data:", error);
            return {
                error: `Error extracting data: ${error.message}`,
                isError: true,
            };
        }
    };

    // Function to render organized data safely
    const renderOrganizedData = (organizedData) => {
        if (!organizedData || Object.keys(organizedData).length === 0) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No organized content available</div>;
        }

        return (
            <div className="space-y-6 p-4">
                {Object.keys(organizedData).map((heading, index) => {
                    if (!organizedData[heading] || organizedData[heading].length === 0) {
                        return null;
                    }

                    // Extract heading level and text
                    const headingMatch = heading.match(/H(\d+):/);
                    const headingLevel = headingMatch ? parseInt(headingMatch[1]) : 2;
                    const headingText = heading.includes(": ") ? heading.split(": ")[1] : heading;

                    // Calculate class based on heading level
                    const headingClass =
                        headingLevel === 1
                            ? "text-2xl font-bold"
                            : headingLevel === 2
                            ? "text-xl font-semibold"
                            : headingLevel === 3
                            ? "text-lg font-medium"
                            : headingLevel === 4
                            ? "text-base font-medium"
                            : "text-sm font-medium";

                    return (
                        <div key={index} className="mb-4">
                            <h3 className={`${headingClass} mb-2 dark:text-white text-gray-800`}>{headingText}</h3>

                            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
                                {organizedData[heading].map((content, contentIndex) => {
                                    // Handle both string and object content (like Lists)
                                    if (typeof content === "string") {
                                        return (
                                            <p key={contentIndex} className="text-gray-700 dark:text-gray-300">
                                                {content}
                                            </p>
                                        );
                                    } else if (typeof content === "object" && content !== null) {
                                        // Handle lists or other structured content
                                        if (content.Lists && Array.isArray(content.Lists)) {
                                            return (
                                                <ul key={contentIndex} className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                                    {content.Lists.map((item, itemIndex) => (
                                                        <li key={itemIndex}>{item}</li>
                                                    ))}
                                                </ul>
                                            );
                                        } else {
                                            // For other object types, just show keys
                                            return (
                                                <div key={contentIndex} className="text-gray-500 dark:text-gray-400">
                                                    {Object.keys(content).join(", ")}
                                                </div>
                                            );
                                        }
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Function to render structured data safely
    const renderStructuredData = (structuredData) => {
        if (!structuredData || Object.keys(structuredData).length === 0) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No structured data available</div>;
        }

        return (
            <div className="p-4">
                <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 overflow-auto">
                    {JSON.stringify(structuredData, null, 2)}
                </pre>
            </div>
        );
    };

    // Function to render text data safely
    const renderTextData = (textData) => {
        if (!textData || textData.length === 0) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No text content available</div>;
        }

        // Split text by newlines and render as paragraphs
        const lines = textData.split("\n").filter((line) => line.trim().length > 0);

        return (
            <div className="p-4 space-y-4">
                <div className="mb-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(textData)}>
                        Copy Text
                    </Button>
                </div>

                <div className="space-y-4">
                    {lines.map((line, index) => (
                        <p key={index} className="text-gray-700 dark:text-gray-300">
                            {line}
                        </p>
                    ))}
                </div>
            </div>
        );
    };

    // Function to render metadata safely
    const renderMetadata = (overview) => {
        if (!overview || Object.keys(overview).length === 0) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No metadata available</div>;
        }

        return (
            <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(overview).map(([key, value], index) => {
                        // Skip rendering objects and arrays directly
                        if (typeof value === "object" && value !== null) {
                            return (
                                <Card key={index} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">{key}</h4>
                                        <div className="text-gray-500 dark:text-gray-400 text-sm">
                                            {Array.isArray(value)
                                                ? `[Array with ${value.length} items]`
                                                : `{Object with ${Object.keys(value).length} properties}`}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        }

                        return (
                            <Card key={index} className="overflow-hidden">
                                <CardContent className="p-4">
                                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">{key}</h4>
                                    <div className="text-gray-500 dark:text-gray-400 text-sm">{String(value)}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Function to render removal details safely
    const renderRemovalDetails = (details, title) => {
        if (!details || details.length === 0) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No {title} available</div>;
        }

        return (
            <div className="p-4">
                <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
                <div className="space-y-2">
                    {details.map((item, index) => (
                        <Collapsible
                            key={index}
                            open={expandedSection === `${title}-${index}`}
                            onOpenChange={() => setExpandedSection(expandedSection === `${title}-${index}` ? null : `${title}-${index}`)}
                            className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
                        >
                            <CollapsibleTrigger className="w-full p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
                                <div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{item.type}</span>
                                    <span className="ml-2 text-gray-500 dark:text-gray-400">({item.details})</span>
                                </div>
                                <span>{expandedSection === `${title}-${index}` ? "−" : "+"}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                <div className="text-gray-700 dark:text-gray-300">{item.text || "No content details available"}</div>
                            </CollapsibleContent>
                        </Collapsible>
                    ))}
                </div>
            </div>
        );
    };

    // Function to render hashes safely
    const renderHashes = (hashes) => {
        if (!hashes || hashes.length === 0) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No hashes available</div>;
        }

        return (
            <div className="p-4">
                <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Content Hashes</h3>
                <div className="space-y-2">
                    {hashes.map((hash, index) => (
                        <div
                            key={index}
                            className="font-mono text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md text-gray-700 dark:text-gray-300"
                        >
                            {hash}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Function to render raw JSON safely
    const renderRawJSON = (pageData) => {
        if (!pageData) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No raw data available</div>;
        }

        let jsonStr;
        try {
            jsonStr = typeof pageData === "string" ? pageData : JSON.stringify(pageData, null, 2);
        } catch (e) {
            return <div className="p-4 text-red-500">Error stringifying data: {e.message}</div>;
        }

        return (
            <div className="p-4">
                <div className="mb-4 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(jsonStr)}>
                        Copy JSON
                    </Button>
                </div>
                <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 overflow-auto max-h-[70vh]">
                    {jsonStr}
                </pre>
            </div>
        );
    };

    // Check if we have any responses
    if (!contentResponses || contentResponses.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <Alert className="w-full max-w-2xl">
                    <AlertDescription>{streamingResponse ? "Processing web page..." : "No page content available."}</AlertDescription>
                </Alert>
            </div>
        );
    }

    // Function to render a single page's content
    const renderPageContent = (pageData, index) => {
        if (!pageData) {
            return <div className="p-4 text-gray-500 dark:text-gray-400">No data available for this page</div>;
        }

        // Extract all data safely
        const data = extractData(pageData);

        if (data.isError) {
            return (
                <Alert className="m-4">
                    <AlertDescription>{data.error}</AlertDescription>
                </Alert>
            );
        }

        const {
            statusValue,
            overview,
            textData,
            organizedData,
            structuredData,
            contentFilterDetails,
            noiseRemoverDetails,
            hashes,
            parsedContent,
        } = data;

        return (
            <div className="h-full flex flex-col">
                {/* Page info and status */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h1 className="text-2xl font-bold truncate dark:text-white text-gray-800">
                            {overview?.page_title || "Untitled Page"}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">{overview?.url || "No URL"}</p>
                    </div>
                    <Badge className={statusValue === "success" ? "bg-green-500 dark:bg-green-600" : "bg-red-500 dark:bg-red-600"}>
                        {statusValue}
                    </Badge>
                </div>

                {/* Content tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="p-2 flex flex-wrap border-b border-gray-200 dark:border-gray-700 gap-1">
                        <TabsTrigger value="organized">Organized Content</TabsTrigger>
                        <TabsTrigger value="structured">Structured Data</TabsTrigger>
                        <TabsTrigger value="text">Text Content</TabsTrigger>
                        <TabsTrigger value="metadata">Metadata</TabsTrigger>
                        <TabsTrigger value="content-filter">Content Filter</TabsTrigger>
                        <TabsTrigger value="noise-remover">Noise Remover</TabsTrigger>
                        <TabsTrigger value="hashes">Hashes</TabsTrigger>
                        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-auto">
                        <TabsContent value="organized" className="m-0 h-full overflow-auto">
                            {renderOrganizedData(organizedData)}
                        </TabsContent>

                        <TabsContent value="structured" className="m-0 h-full overflow-auto">
                            {renderStructuredData(structuredData)}
                        </TabsContent>

                        <TabsContent value="text" className="m-0 h-full overflow-auto">
                            {renderTextData(textData)}
                        </TabsContent>

                        <TabsContent value="metadata" className="m-0 h-full overflow-auto">
                            {renderMetadata(overview)}
                        </TabsContent>

                        <TabsContent value="content-filter" className="m-0 h-full overflow-auto">
                            {renderRemovalDetails(contentFilterDetails, "Content Filter Removals")}
                        </TabsContent>

                        <TabsContent value="noise-remover" className="m-0 h-full overflow-auto">
                            {renderRemovalDetails(noiseRemoverDetails, "Noise Remover Details")}
                        </TabsContent>

                        <TabsContent value="hashes" className="m-0 h-full overflow-auto">
                            {renderHashes(hashes)}
                        </TabsContent>

                        <TabsContent value="raw" className="m-0 h-full overflow-auto">
                            {renderRawJSON(pageData)}
                        </TabsContent>
                    </div>
                </Tabs>

                {/* Action buttons */}
                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    {overview?.url && (
                        <Button variant="outline" onClick={() => window.open(overview.url, "_blank")}>
                            Visit Website
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Page tabs - Only show if multiple pages */}
            {contentResponses.length > 1 && (
                <div className="border-b border-gray-200 dark:border-gray-700 p-2">
                    <Tabs value={String(activePageIndex)} onValueChange={(value) => setActivePageIndex(parseInt(value))}>
                        <TabsList className="flex flex-wrap gap-1">
                            {contentResponses.map((_, idx) => (
                                <TabsTrigger key={idx} value={String(idx)}>
                                    Page {idx + 1}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
            )}

            {/* Main content area */}
            <div className="flex-1 h-full overflow-hidden">
                {contentResponses.length > 0 && activePageIndex < contentResponses.length ? (
                    renderPageContent(contentResponses[activePageIndex], activePageIndex)
                ) : (
                    <div className="p-4 text-gray-500 dark:text-gray-400">No content available</div>
                )}
            </div>
        </div>
    );
};

export default SafeScraperDisplay;
