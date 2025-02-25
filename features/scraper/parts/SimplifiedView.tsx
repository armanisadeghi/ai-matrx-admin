"use client";
import React from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processOrganizedData, copyToClipboard } from "../utils/scraper-utils";

/**
 * Component for displaying content in a simplified reader-friendly format
 */
const SimplifiedView = ({ pageData }) => {
    if (!pageData) {
        return <div className="p-4 text-gray-500">No content available</div>;
    }

    const { overview, textData, organizedData } = pageData;

    const processedContent = processOrganizedData(organizedData);

    const handleCopy = (text) => {
        copyToClipboard(text);
    };

    return (
        <div className="h-full w-full bg-white rounded-lg overflow-hidden">
            <div className="p-2 bg-gray-200">
                {/* Header with centered title and copy button in top right */}
                <div className="relative flex justify-center items-center p-4 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800">{overview?.page_title || "Untitled Page"}</h2>
                    <Button
                        variant="ghost"
                        size="md"
                        onClick={() => handleCopy(textData)}
                        className="absolute right-1 top-1 flex items-center"
                    >
                        <Copy size={16} className="text-gray-800" />
                    </Button>
                </div>

                {/* Main content area */}
                <div className="p-3 max-w-5xl mx-auto bg-white shadow-3xl rounded-3xl overflow-hidden">
                    {processedContent.length > 0 ? (
                        <div className="space-y-6">
                            {processedContent.map((section, i) => (
                                <div key={i}>
                                    {section.heading.level === 1 && (
                                        <h1 className="text-2xl font-bold text-gray-900 mb-3">{section.heading.text}</h1>
                                    )}
                                    {section.heading.level === 2 && (
                                        <h2 className="text-xl font-semibold text-gray-800 mb-3">{section.heading.text}</h2>
                                    )}
                                    {section.heading.level === 3 && (
                                        <h3 className="text-lg font-medium text-gray-700 mb-2">{section.heading.text}</h3>
                                    )}
                                    {section.heading.level > 3 && (
                                        <h4 className="text-base font-medium text-gray-700 mb-2">{section.heading.text}</h4>
                                    )}
                                    <div className="space-y-3">
                                        {section.content.map((item, j) => (
                                            <div key={j} className="text-gray-600">
                                                {item.type === "paragraph" && <p className="leading-relaxed">{item.content}</p>}
                                                {item.type === "list" && (
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {item.items.map((listItem, k) => (
                                                            <li key={k} className="leading-relaxed">
                                                                {typeof listItem === "string" ? (
                                                                    listItem
                                                                ) : Array.isArray(listItem) ? (
                                                                    <div>
                                                                        {listItem[0]}
                                                                        {listItem[1] && Array.isArray(listItem[1]) && (
                                                                            <ul className="list-circle pl-5 mt-1">
                                                                                {listItem[1].map((subItem, l) => (
                                                                                    <li key={l}>{subItem}</li>
                                                                                ))}
                                                                            </ul>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    JSON.stringify(listItem)
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {item.type !== "paragraph" && item.type !== "list" && (
                                                    <p className="text-gray-500 italic text-sm">[Content type: {item.type || "unknown"}]</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">No organized content available.</p>
                    )}
                </div>
            </div>

            {/* Source link */}
            {overview?.url && (
                <div className="px-6 py-3 border-t border-gray-100 text-sm text-gray-500">
                    Source:{" "}
                    <a href={overview.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {overview.url}
                    </a>
                </div>
            )}
        </div>
    );
};

export default SimplifiedView;
