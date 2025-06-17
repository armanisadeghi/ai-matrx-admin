"use client";

import React, { useState, useEffect } from "react";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import {
    safeParseJSON,
    copyToClipboard,
    extractScraperData,
    filterContentResponses,
    extractPageTitle,
    processOrganizedData,
    truncateText,
    isScraperLoading,
} from "@/features/scraper/utils/scraper-utils";

import { useAppSelector } from "@/lib/redux/hooks";
import {
    selectTaskStatus,
    selectPrimaryResponseEndedByTaskId,
    selectPrimaryResponseDataByTaskId,
    selectHasPrimaryResponseErrorsByTaskId,
} from "@/lib/redux/socket-io";

interface RemovalDetail {
    attribute: string;
    match_type: string;
    trigger_value: string;
    text: string;
    html_length: number;
}

interface OverviewData {
    uuid: string;
    website: string;
    url: string;
    unique_page_name: string;
    page_title: string;
    has_structured_content: boolean;
    table_count: number;
    code_block_count: number;
    list_count: number;
    outline: { [key: string]: string[] };
    char_count: number;
    char_count_formatted: number;
    metadata?: object | null;
}

interface ExtractedLinks {
    internal: string[];
    external: string[];
    images: string[];
    documents: string[];
    others: string[];
    audio: string[];
    videos: string[];
    archives: string[];
}

interface ScrapedPageItem {
    status: "success" | "error";
    url: string;
    error: string | null;
    overview: OverviewData | null;
    structured_data: object | null;
    organized_data: object | null;
    text_data: string | null;
    main_image: string | null;
    hashes: string[] | null;
    content_filter_removal_details: RemovalDetail[] | null;
    links: ExtractedLinks | null;
    scraped_at: string;
}

interface ScrapeMetadata {
    execution_time_ms?: number | null;
}

interface ScrapedPagesResponse {
    response_type: "scraped_pages";
    metadata: ScrapeMetadata;
    results: ScrapedPageItem[];
}

interface SocketResponseProps {
    taskId: string;
}

const ScraperResults = ({ taskId }: SocketResponseProps) => {
    const [scrapedData, setScrapedData] = useState<ScrapedPagesResponse[]>([]);
    const [expandedSections, setExpandedSections] = useState<{ [key: number]: { metadata: boolean; removal: boolean } }>({});

    // Get data from Redux store
    const taskStatus = useAppSelector((state) => selectTaskStatus(state, taskId));
    const isTaskCompleted = useAppSelector((state) => selectPrimaryResponseEndedByTaskId(taskId)(state));
    const responseData = useAppSelector((state) => selectPrimaryResponseDataByTaskId(taskId)(state));
    const errors = useAppSelector((state) => selectHasPrimaryResponseErrorsByTaskId(taskId)(state));

    const isLoading = taskStatus === "submitted" && !isTaskCompleted;

    useEffect(() => {
        if (responseData) {
            try {
                // Handle both array and non-array response formats
                const dataArray = Array.isArray(responseData) ? responseData : [responseData];

                // Filter and process scraper responses using utilities
                const filteredResponses = filterContentResponses(dataArray);
                const processedData = filteredResponses.map((response) => extractScraperData(response));
                setScrapedData(processedData.filter(Boolean)); // Remove any null/undefined results
            } catch (error) {
                console.error("Error processing scraper data:", error);
                setScrapedData([]);
            }
        }
    }, [responseData]);

    const toggleSection = (index: number, section: "metadata" | "removal") => {
        setExpandedSections((prev) => ({
            ...prev,
            [index]: {
                ...prev[index],
                [section]: !prev[index]?.[section],
            },
        }));
    };

    const handleCopy = (text: string, index: number) => {
        const success = copyToClipboard(text);
        if (!success) {
            alert("Failed to copy content. Check console for details.");
        }
    };

    if (isLoading && scrapedData.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg text-center">
                <p className="text-gray-600">Loading scraper results...</p>
            </div>
        );
    }

    if (scrapedData.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg text-center">
                <p className="text-gray-600">No scraper results available yet.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Scraper Results</h1>

            {scrapedData.flatMap((responseData, responseIndex) =>
                (responseData?.results || []).map((item, itemIndex) => {
                    const index = responseIndex * 1000 + itemIndex; // Unique index for each item

                    if (item?.status === "error") {
                        return (
                            <div key={index} className="mb-8 border-b pb-6">
                                <h2 className="text-xl font-semibold text-red-600 mb-4">Result {index + 1}: Error</h2>
                                <p className="text-red-500">{item?.error || "Unknown error occurred"}</p>
                            </div>
                        );
                    }

                    const overview = item?.overview;
                    const textData = item?.text_data;
                    const organizedData = item?.organized_data;
                    const contentFilterDetails = item?.content_filter_removal_details;
                    const pageTitle = overview?.page_title || `Item ${index + 1}`;
                    const processedContent = organizedData ? processOrganizedData(organizedData) : [];

                    return (
                        <div key={index} className="mb-8 border-b pb-6">
                            {/* Header */}
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-700">
                                    Result {index + 1}: {pageTitle}
                                </h2>
                                <button
                                    onClick={() => handleCopy(textData || "", index)}
                                    className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition"
                                    disabled={!textData}
                                >
                                    <Copy size={16} />
                                    Copy
                                </button>
                            </div>

                            {/* Scraped Content */}
                            <section className="mb-4">
                                <h3 className="text-lg font-medium text-gray-700 mb-2">Content</h3>
                                {processedContent.length > 0 ? (
                                    <div className="space-y-4">
                                        {processedContent.map((section, i) => (
                                            <div key={i}>
                                                {section?.heading?.level === 1 && (
                                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{section.heading.text}</h1>
                                                )}
                                                {section?.heading?.level === 2 && (
                                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">{section.heading.text}</h2>
                                                )}
                                                {section?.heading?.level === 3 && (
                                                    <h3 className="text-lg font-medium text-gray-700 mb-2">{section.heading.text}</h3>
                                                )}
                                                <div className="space-y-2">
                                                    {(section?.content || []).map((item, j) => (
                                                        <div key={j} className="text-gray-600">
                                                            {item?.type === "paragraph" && <p>{item?.content}</p>}
                                                            {item?.type === "list" && (
                                                                <ul className="list-disc pl-5">
                                                                    {(item?.items || []).map((listItem, k) =>
                                                                        Array.isArray(listItem) ? (
                                                                            <li key={k}>
                                                                                {listItem[0]}:{" "}
                                                                                <ul className="list-circle pl-5">
                                                                                    {((listItem[1] as string[]) || []).map((subItem, l) => (
                                                                                        <li key={l}>{subItem}</li>
                                                                                    ))}
                                                                                </ul>
                                                                            </li>
                                                                        ) : (
                                                                            <li key={k}>{listItem}</li>
                                                                        )
                                                                    )}
                                                                </ul>
                                                            )}
                                                            {item?.type === "unknown" && (
                                                                <p className="text-gray-500 italic">
                                                                    [Unknown content type: {item?.keys?.join(", ") || "Unknown"}]
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : textData ? (
                                    <div className="bg-gray-50 p-4 rounded-md">
                                        <pre className="whitespace-pre-wrap text-gray-700 font-mono text-sm">
                                            {textData}
                                        </pre>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">No content available.</p>
                                )}
                            </section>

                            {/* Metadata Section */}
                            <section className="border-t pt-4">
                                <button
                                    onClick={() => toggleSection(index, "metadata")}
                                    className="flex items-center justify-between w-full text-left text-gray-700 font-semibold hover:text-gray-900 transition"
                                >
                                    Metadata
                                    {expandedSections[index]?.metadata ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections[index]?.metadata && (
                                    <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
                                        <p>
                                            <strong>Status:</strong> {item?.status || "Unknown"}
                                        </p>
                                        <p>
                                            <strong>UUID:</strong> {overview?.uuid || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Website:</strong> {overview?.website || "N/A"}
                                        </p>
                                        <p>
                                            <strong>URL:</strong> {overview?.url || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Page Title:</strong> {overview?.page_title || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Character Count:</strong> {overview?.char_count || "N/A"}
                                        </p>
                                        <p>
                                            <strong>Has Structured Content:</strong> {overview?.has_structured_content ? "Yes" : "No"}
                                        </p>
                                        <p>
                                            <strong>Table Count:</strong> {overview?.table_count ?? 0}
                                        </p>
                                        <p>
                                            <strong>Code Block Count:</strong> {overview?.code_block_count ?? 0}
                                        </p>
                                        <p>
                                            <strong>List Count:</strong> {overview?.list_count ?? 0}
                                        </p>
                                    </div>
                                )}
                            </section>

                            {/* Removal Details Section */}
                            <section className="border-t pt-4 mt-4">
                                <button
                                    onClick={() => toggleSection(index, "removal")}
                                    className="flex items-center justify-between w-full text-left text-gray-700 font-semibold text-sm hover:text-gray-900 transition"
                                >
                                    Removal Details
                                    {expandedSections[index]?.removal ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections[index]?.removal && (
                                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-4 rounded-md max-h-64 overflow-y-auto">
                                        <h4 className="font-medium text-gray-700 mb-2">Content Filter Removals</h4>
                                        {contentFilterDetails && Array.isArray(contentFilterDetails) && contentFilterDetails.length > 0 ? (
                                            contentFilterDetails.map((detail: any, i: number) => (
                                                <p key={i} className="mb-1">
                                                    <strong>Attribute:</strong> {detail?.attribute || "N/A"} | <strong>Match Type:</strong>{" "}
                                                    {detail?.match_type || "N/A"} | <strong>Text:</strong> {detail?.text ? truncateText(detail.text, 50) : "N/A"}
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-gray-500 italic">No content filter removals.</p>
                                        )}
                                    </div>
                                )}
                            </section>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default ScraperResults;
