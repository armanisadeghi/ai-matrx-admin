'use client';
import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";

interface SocketResponseProps {
    socketHook: SocketHook;
}

const ImprovedScraperDisplay = ({ socketHook }: SocketResponseProps) => {
    const { streamingResponse, responses, responseRef } = socketHook;
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [activeViewTab, setActiveViewTab] = useState("content");

    // Filter out initialization messages
    const contentResponses = useMemo(() => {
        if (!responses || responses.length === 0) return [];
        
        return responses.filter(response => {
            // Skip initialization messages
            if (response && 
                typeof response === 'object' && 
                response.status === 'success' && 
                response.message === 'initialized') {
                return false;
            }
            
            return true;
        });
    }, [responses]);

    // Function to safely parse JSON
    const safeParseJSON = (jsonString) => {
        if (!jsonString) return null;
        
        if (typeof jsonString !== 'string') {
            return jsonString; // It's already an object
        }
        
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error("JSON parsing error:", e);
            return null;
        }
    };

    // Check if we have any responses
    if (!contentResponses || contentResponses.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center p-4">
                <Alert className="w-full max-w-2xl">
                    <AlertDescription>
                        {streamingResponse ? "Processing web page..." : "No page content available."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Function to render a single page's content safely
    const renderPageContent = (pageData, index) => {
        if (!pageData) {
            return <div>No data available for this page</div>;
        }

        // Extract data safely
        let parsedContent;
        let statusValue = "unknown";
        
        try {
            // Handle string response
            if (typeof pageData === 'string') {
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
                    return <div>Error parsing string content: {e.message}</div>;
                }
            } 
            // Handle object response
            else if (typeof pageData === 'object' && pageData !== null) {
                statusValue = pageData.status || "unknown";
                
                if (pageData.parsed_content) {
                    parsedContent = safeParseJSON(pageData.parsed_content);
                } else {
                    parsedContent = pageData;
                }
            }
            
            if (!parsedContent) {
                console.error("Failed to parse content");
                return <div>Error parsing content. Data format not recognized.</div>;
            }

            // Extract content safely
            const overview = parsedContent.overview || {};
            const organized_data = parsedContent.organized_data || {};
            const text_data = parsedContent.text_data || "";
            
            // Get headings safely
            const headings = Object.keys(organized_data || {});

            return (
                <div className="h-full flex flex-col">
                    {/* Page info and status */}
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold dark:text-white">
                                {overview?.page_title || "Untitled Page"}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300">
                                {overview?.url || "No URL"}
                            </p>
                        </div>
                        <Badge className={statusValue === "success" ? "bg-green-500 dark:bg-green-600" : "bg-red-500 dark:bg-red-600"}>
                            {statusValue}
                        </Badge>
                    </div>

                    {/* Simple Tabs */}
                    <Tabs value={activeViewTab} onValueChange={setActiveViewTab} className="flex-1">
                        <TabsList className="grid grid-cols-3 mb-4">
                            <TabsTrigger value="content">Content</TabsTrigger>
                            <TabsTrigger value="structure">Structure</TabsTrigger>
                            <TabsTrigger value="raw">Raw Text</TabsTrigger>
                        </TabsList>
                        
                        {/* Content Tab */}
                        <TabsContent value="content" className="space-y-4">
                            {headings.length > 0 ? (
                                headings.map((heading, headingIndex) => {
                                    // Skip empty sections
                                    if (!organized_data[heading] || organized_data[heading].length === 0) {
                                        return null;
                                    }
                                    
                                    // Format the heading text (remove the prefix)
                                    const headingText = heading.includes(': ') ? 
                                        heading.split(': ')[1] : heading;
                                    
                                    return (
                                        <div key={headingIndex} className="mb-6">
                                            <h2 className="text-xl font-semibold mb-2 dark:text-white">
                                                {headingText}
                                            </h2>
                                            
                                            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                                                {organized_data[heading].map((paragraph, pIndex) => (
                                                    <p key={pIndex} className="mb-3 text-gray-800 dark:text-gray-200">
                                                        {paragraph}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div>No organized content available</div>
                            )}
                            
                            {text_data && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-4"
                                    onClick={() => navigator.clipboard.writeText(text_data)}
                                >
                                    Copy Content
                                </Button>
                            )}
                        </TabsContent>
                        
                        {/* Structure Tab */}
                        <TabsContent value="structure">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
                                <h3 className="text-lg font-medium mb-3 dark:text-white">Page Structure</h3>
                                <div className="space-y-2">
                                    <div className="text-gray-800 dark:text-gray-200">
                                        <span className="font-medium">Character Count:</span> {overview?.char_count || 0}
                                    </div>
                                    {/* {overview?.table_count > 0 && (
                                        <div className="text-gray-800 dark:text-gray-200">
                                            <span className="font-medium">Tables:</span> {overview.table_count}
                                        </div>
                                    )} */}
                                    {overview?.code_block_count > 0 && (
                                        <div className="text-gray-800 dark:text-gray-200">
                                            <span className="font-medium">Code Blocks:</span> {overview.code_block_count}
                                        </div>
                                    )}
                                    {overview?.list_count > 0 && (
                                        <div className="text-gray-800 dark:text-gray-200">
                                            <span className="font-medium">Lists:</span> {overview.list_count}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <h3 className="text-lg font-medium mb-3 dark:text-white">Data Structure</h3>
                                <ul className="space-y-1 text-gray-800 dark:text-gray-200">
                                    {parsedContent && typeof parsedContent === 'object' ? 
                                        Object.keys(parsedContent).map((key, i) => {
                                            const valueType = typeof parsedContent[key];
                                            return (
                                                <li key={i} className="py-1">
                                                    <span className="font-medium">{key}:</span> {
                                                        valueType === 'object' ? 
                                                            (parsedContent[key] === null ? 'null' : 
                                                             Array.isArray(parsedContent[key]) ? 'array' : 'object') : 
                                                            valueType
                                                    }
                                                </li>
                                            );
                                        }) : 
                                        <li>No structured data available</li>
                                    }
                                </ul>
                            </div>
                        </TabsContent>
                        
                        {/* Raw Text Tab */}
                        <TabsContent value="raw">
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                <div className="flex justify-end mb-2">
                                    {text_data && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => navigator.clipboard.writeText(text_data)}
                                        >
                                            Copy
                                        </Button>
                                    )}
                                </div>
                                <pre className="whitespace-pre-wrap overflow-x-auto font-mono text-sm text-gray-800 dark:text-gray-200">
                                    {text_data || "No raw text available"}
                                </pre>
                            </div>
                        </TabsContent>
                    </Tabs>
                    
                    {/* Visit website button */}
                    {overview?.url && (
                        <div className="flex justify-end mt-4">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => window.open(overview.url, '_blank')}
                            >
                                Visit Website
                            </Button>
                        </div>
                    )}
                </div>
            );
        } catch (error) {
            console.error("Error rendering page content:", error);
            return <div>Error rendering content: {error.message}</div>;
        }
    };

    return (
        <div className="w-full h-full p-4">
            {/* Page tabs - Only show if multiple pages */}
            {contentResponses.length > 1 && (
                <Tabs 
                    value={String(activePageIndex)} 
                    onValueChange={(value) => setActivePageIndex(parseInt(value))}
                    className="mb-4"
                >
                    <TabsList className="flex mb-2">
                        {contentResponses.map((_, idx) => (
                            <TabsTrigger 
                                key={idx} 
                                value={String(idx)}
                            >
                                Page {idx + 1}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            )}
            
            {/* Main content area */}
            <div className="h-full">
                {contentResponses.length > 0 && activePageIndex < contentResponses.length ? 
                    renderPageContent(contentResponses[activePageIndex], activePageIndex) : 
                    <div>No content available</div>
                }
            </div>
        </div>
    );
};

export default ImprovedScraperDisplay;