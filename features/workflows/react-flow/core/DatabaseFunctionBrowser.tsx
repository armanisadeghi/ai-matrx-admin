"use client";

import React, { useState, useMemo } from "react";
import {
    Code,
    Search,
    Loader,
    ChevronDown,
    ChevronRight,
    Database,
} from "lucide-react";
import { useRegisteredFunctionWithFetch } from "@/lib/redux/entity/hooks/functions-and-args";

interface DatabaseFunctionBrowserProps {
    onAddNode: (id: string, type?: string) => void;
}

const DatabaseFunctionBrowser: React.FC<DatabaseFunctionBrowserProps> = ({ onAddNode }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [showFunctionBrowser, setShowFunctionBrowser] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["core"]));

    // Real database functions
    const { registeredFunctionRecords, registeredFunctionIsLoading, fetchRegisteredFunctionAll } = useRegisteredFunctionWithFetch();

    // Fetch functions on first expand
    React.useEffect(() => {
        if (showFunctionBrowser && Object.keys(registeredFunctionRecords).length === 0 && !registeredFunctionIsLoading) {
            fetchRegisteredFunctionAll();
        }
    }, [showFunctionBrowser, registeredFunctionRecords, registeredFunctionIsLoading, fetchRegisteredFunctionAll]);

    // Filter and categorize functions
    const filteredFunctions = useMemo(() => {
        const functions = Object.values(registeredFunctionRecords);

        if (!searchTerm) return functions;

        const search = searchTerm.toLowerCase();
        return functions.filter(
            (func) =>
                func.name?.toLowerCase().includes(search) ||
                func.funcName?.toLowerCase().includes(search) ||
                func.description?.toLowerCase().includes(search)
        );
    }, [registeredFunctionRecords, searchTerm]);

    // Group functions by category
    const categorizedFunctions = useMemo(() => {
        const categories: { [key: string]: typeof filteredFunctions } = {
            "Recipe Related": [],
            "Multi-Recipe Handling": [],
            "Processors/Extractors": [],
            "API Related": [],
            "AI Chat": [],
            "Document/Image Processing": [],
            "Database Interactions": [],
            "AI Tools (MCP)": [],
            "Data/Knowledge": [],
            Other: [],
        };

        filteredFunctions.forEach((func) => {
            // Simple categorization based on function name patterns
            const name = func.name?.toLowerCase() || func.funcName?.toLowerCase() || "";

            if (name.includes("recipe") || name.includes("agent")) {
                categories["Recipe Related"].push(func);
            } else if (name.includes("multi") || name.includes("batch") || name.includes("iterate")) {
                categories["Multi-Recipe Handling"].push(func);
            } else if (name.includes("extract") || name.includes("process") || name.includes("convert") || name.includes("transform")) {
                categories["Processors/Extractors"].push(func);
            } else if (name.includes("api") || name.includes("http") || name.includes("request")) {
                categories["API Related"].push(func);
            } else if (name.includes("chat") || name.includes("ai") || name.includes("gpt")) {
                categories["AI Chat"].push(func);
            } else if (name.includes("pdf") || name.includes("doc") || name.includes("image") || name.includes("file")) {
                categories["Document/Image Processing"].push(func);
            } else if (name.includes("database") || name.includes("sql") || name.includes("db")) {
                categories["Database Interactions"].push(func);
            } else if (name.includes("tool") || name.includes("mcp")) {
                categories["AI Tools (MCP)"].push(func);
            } else if (name.includes("data") || name.includes("knowledge") || name.includes("kb")) {
                categories["Data/Knowledge"].push(func);
            } else {
                categories["Other"].push(func);
            }
        });

        // Filter out empty categories
        return Object.entries(categories).filter(([_, functions]) => functions.length > 0);
    }, [filteredFunctions]);

    const toggleCategory = (category: string) => {
        setExpandedCategories((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const handleAddFunction = (functionId: string) => {
        onAddNode(functionId, "registeredFunction");
    };

    return (
        <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Database Functions</h3>
                <button
                    onClick={() => setShowFunctionBrowser(!showFunctionBrowser)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    {showFunctionBrowser ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
            </div>

            {showFunctionBrowser && (
                <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search functions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent"
                        />
                    </div>

                    {/* Loading State */}
                    {registeredFunctionIsLoading && (
                        <div className="flex items-center justify-center p-4">
                            <Loader className="h-5 w-5 text-gray-400 animate-spin" />
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading functions...</span>
                        </div>
                    )}

                    {/* Function Categories */}
                    {!registeredFunctionIsLoading && categorizedFunctions.length > 0 && (
                        <div className="space-y-2">
                            {categorizedFunctions.map(([category, functions]) => (
                                <div key={category}>
                                    <button
                                        onClick={() => toggleCategory(category)}
                                        className="w-full flex items-center justify-between p-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                                    >
                                        <span>
                                            {category} ({functions.length})
                                        </span>
                                        {expandedCategories.has(category) ? (
                                            <ChevronDown className="h-4 w-4" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4" />
                                        )}
                                    </button>

                                    {expandedCategories.has(category) && (
                                        <div className="ml-2 space-y-1">
                                            {functions.slice(0, 5).map((func) => (
                                                <button
                                                    key={func.id}
                                                    onClick={() => handleAddFunction(func.id)}
                                                    className="w-full flex items-center gap-2 p-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-md"
                                                >
                                                    <Code className="h-3 w-3 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="truncate font-medium">{func.name || func.funcName}</div>
                                                        {func.description && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-500 truncate">
                                                                {func.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                            {functions.length > 5 && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                                                    +{functions.length - 5} more functions
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No Functions Found */}
                    {!registeredFunctionIsLoading && filteredFunctions.length === 0 && searchTerm && (
                        <div className="text-center py-4">
                            <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No functions found matching "{searchTerm}"</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!registeredFunctionIsLoading && Object.keys(registeredFunctionRecords).length === 0 && (
                        <div className="text-center py-4">
                            <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No functions available</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DatabaseFunctionBrowser; 