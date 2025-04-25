"use client";
import React, { useState, useEffect } from "react";
import { formatJson } from "@/utils/json-cleaner-utility";
import { copyToClipboard } from "../../../features/scraper/utils/scraper-utils";
import { createPathBookmark, saveBookmarks, loadBookmarks, getValueByBookmark, exportBookmarks } from "../../../features/scraper/utils/json-path-navigation-util";
import { getDataAtPath, generateAccessPath, generatePathDescription } from "./json-utils";
import { PathArray, Bookmark } from "./types";

// Import extracted components
import BookmarkDialog from "./BookmarkDialog";
import BookmarksDialog from "./BookmarksDialog";
import NavigationRows from "./NavigationRows";
import ActionButtons from "./ActionButtons";

const RawJsonExplorer = ({ pageData }) => {
    // Initialize with cleaned data
    const [originalData, setOriginalData] = useState(null);
    const [currentPath, setCurrentPath] = useState<PathArray>([[0, "All"]]); // [[rowIndex, selectedKey], ...]
    const [displayData, setDisplayData] = useState(null);

    // Bookmark-related state
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [bookmarkDialogOpen, setBookmarkDialogOpen] = useState(false);
    const [bookmarkName, setBookmarkName] = useState("");
    const [bookmarkDescription, setBookmarkDescription] = useState("");
    const [bookmarksDialogOpen, setBookmarksDialogOpen] = useState(false);

    // Load bookmarks on component mount
    useEffect(() => {
        const savedBookmarks = loadBookmarks();
        setBookmarks(savedBookmarks);
    }, []);

    // Initialize component with cleaned data
    useEffect(() => {
        if (pageData) {
            try {
                const cleanedData = JSON.parse(formatJson(pageData));
                setOriginalData(cleanedData);
                setDisplayData(cleanedData);

                // Initialize with just the first row with 'All' selected
                setCurrentPath([[0, "All"]]);
            } catch (error) {
                console.error("Error parsing JSON data:", error);
            }
        }
    }, [pageData]);

    // Handle key selection in any row
    const handleKeySelect = (rowIndex: number, key: string) => {
        // Create a new path array by keeping all rows up to the current one
        // and updating the selection for the current row
        const newPath: PathArray = currentPath.slice(0, rowIndex + 1).map((item, idx) => 
            idx === rowIndex ? [rowIndex, key] : item
        );

        // Calculate path for data extraction (exclude 'All' selections)
        const dataPath = newPath.map(([_, key]) => key).filter((k) => k !== "All");

        // Update the current path
        setCurrentPath(newPath);

        // Update the displayed data
        const newData = dataPath.length > 0 ? getDataAtPath(originalData, dataPath) : originalData;
        setDisplayData(newData);
    };

    // Reset explorer to initial state
    const handleReset = () => {
        setCurrentPath([[0, "All"]]);
        setDisplayData(originalData);
    };

    // Check if we need to add a new row based on current selection
    useEffect(() => {
        if (!originalData || currentPath.length === 0) return;

        // Get the last selected key
        const [lastRowIndex, lastSelectedKey] = currentPath[currentPath.length - 1];

        // If 'All' is selected at any level, we don't add a new row for it
        if (lastSelectedKey === "All") return;

        // Calculate path for data extraction
        const dataPath = currentPath.map(([_, key]) => key).filter((k) => k !== "All");
        const currentData = getDataAtPath(originalData, dataPath);

        // Determine if we need to add a new row
        const shouldAddRow = () => {
            if (!currentData || typeof currentData !== "object") return false;

            if (Array.isArray(currentData)) {
                return currentData.length > 0;
            } else {
                return Object.keys(currentData).length > 0;
            }
        };

        if (shouldAddRow()) {
            // Check if we already have a row for this level
            if (currentPath.length <= lastRowIndex + 1) {
                setCurrentPath([...currentPath, [lastRowIndex + 1, "All"] as [number, string]]);
            }
        }
    }, [originalData, currentPath]);

    if (!pageData) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">No raw data available</div>;
    }

    const handleSaveBookmark = () => {
        const pathString = generateAccessPath(currentPath);
        const newBookmark = createPathBookmark(pathString, bookmarkName || `Bookmark ${bookmarks.length + 1}`, bookmarkDescription);

        const updatedBookmarks = [...bookmarks, newBookmark];
        setBookmarks(updatedBookmarks);
        saveBookmarks(updatedBookmarks);

        // Reset form
        setBookmarkName("");
        setBookmarkDescription("");
        setBookmarkDialogOpen(false);
    };

    // Jump to a bookmarked path
    const jumpToBookmark = (bookmark) => {
        if (!originalData) return;

        try {
            // Get the value at the bookmarked path
            const value = getValueByBookmark(originalData, bookmark);
            if (value !== undefined) {
                setDisplayData(value);
                const newPath: PathArray = [[0, "All"]];
                if (bookmark.segments.length > 0) {
                    bookmark.segments.forEach((segment, index) => {
                        let key: string;
                        if (segment.type === "key") {
                            key = segment.value;
                        } else if (segment.type === "index") {
                            key = `Item ${segment.value}`;
                        } else {
                            key = "All";
                        }
                        newPath.push([index + 1, key]);
                    });
                }

                setCurrentPath(newPath);
            }
        } catch (error) {
            console.error("Error jumping to bookmark:", error);
        }

        setBookmarksDialogOpen(false);
    };

    const deleteBookmark = (index) => {
        const updatedBookmarks = [...bookmarks];
        updatedBookmarks.splice(index, 1);
        setBookmarks(updatedBookmarks);
        saveBookmarks(updatedBookmarks);
    };

    // Function for copying access path to clipboard
    const copyAccessPath = () => {
        copyToClipboard(generateAccessPath(currentPath));
    };

    const handleExportBookmarks = () => {
        const exported = exportBookmarks(bookmarks);
        copyToClipboard(exported);
        // Show a simple toast or alert that the bookmarks were copied
        alert("Bookmarks copied to clipboard as JSON");
    };

    // Format the current display data for rendering
    const jsonStr = displayData ? formatJson(displayData) : "";

    return (
        <div className="w-full">
            <div className="mb-4 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex-1">
                        {generatePathDescription(currentPath) !== "Root object" && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 pl-2">
                                <span className="font-medium">Path:</span> {generatePathDescription(currentPath)}
                            </div>
                        )}
                    </div>
                    
                    <ActionButtons 
                        bookmarks={bookmarks}
                        jsonStr={jsonStr}
                        currentPath={currentPath}
                        onExportBookmarks={handleExportBookmarks}
                        onOpenBookmarksDialog={() => setBookmarksDialogOpen(true)}
                        onOpenBookmarkDialog={() => setBookmarkDialogOpen(true)}
                        onCopyPath={copyAccessPath}
                        onReset={handleReset}
                    />
                </div>
                
                {generateAccessPath(currentPath) !== "data" && (
                    <div className="mb-4 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-x-auto">
                        {generateAccessPath(currentPath)}
                    </div>
                )}
            </div>

            <NavigationRows 
                originalData={originalData}
                currentPath={currentPath}
                onKeySelect={handleKeySelect}
            />

            <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 overflow-auto max-h-[70vh]">
                {jsonStr}
            </pre>

            <BookmarkDialog
                open={bookmarkDialogOpen}
                onOpenChange={setBookmarkDialogOpen}
                currentPath={currentPath}
                bookmarkName={bookmarkName}
                setBookmarkName={setBookmarkName}
                bookmarkDescription={bookmarkDescription}
                setBookmarkDescription={setBookmarkDescription}
                onSave={handleSaveBookmark}
            />

            <BookmarksDialog
                open={bookmarksDialogOpen}
                onOpenChange={setBookmarksDialogOpen}
                bookmarks={bookmarks}
                onJumpToBookmark={jumpToBookmark}
                onDeleteBookmark={deleteBookmark}
            />
        </div>
    );
};

export default RawJsonExplorer;
