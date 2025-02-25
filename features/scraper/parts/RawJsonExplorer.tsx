"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { copyToClipboard } from "../utils/scraper-utils";
import { formatJson } from "@/utils/json-cleaner-utility";
import { CopyIcon, RefreshCw, BookmarkIcon, BookmarkPlus, BookMarkedIcon } from "lucide-react";
import { createPathBookmark, saveBookmarks, loadBookmarks, getValueByBookmark, exportBookmarks } from "../utils/json-path-navigation-util";
import { IoBookmarks } from "react-icons/io5";
import BookmarkManagerActions from "./BookmarkManagerActions";

export const getKeysAtPath = (data, path = []) => {
    try {
        let currentData = data;

        // Navigate to the current path
        for (const key of path) {
            if (key === "All") continue;

            // Handle "Item X" and "Object X" formats
            if (key.startsWith("Item ")) {
                const index = parseInt(key.replace("Item ", ""));
                currentData = currentData[index];
            } else if (key.startsWith("Object ")) {
                const index = parseInt(key.replace("Object ", ""));
                currentData = currentData[index];
            } else {
                currentData = currentData[key];
            }
        }

        // Return keys at current level
        if (currentData && typeof currentData === "object") {
            if (Array.isArray(currentData)) {
                if (currentData.length === 0) {
                    return ["All"]; // Empty array
                }

                // Always show array items as "Item X"
                return ["All", ...currentData.map((_, index) => `Item ${index}`)];
            } else {
                // For regular objects with keys
                const keys = Object.keys(currentData);
                if (keys.length > 0) {
                    return ["All", ...keys];
                } else {
                    // Empty object
                    return ["All"];
                }
            }
        }

        return ["All"];
    } catch (error) {
        console.error("Error getting keys at path:", error);
        return ["All"];
    }
};

export const getDataAtPath = (data, path = []) => {
    try {
        let currentData = data;

        // Navigate through the path, but skip 'All' selections
        for (const key of path) {
            if (key === "All") continue;

            // Handle various key formats
            if (key.startsWith("Item ")) {
                const index = parseInt(key.replace("Item ", ""));
                currentData = currentData[index];
            } else if (key.startsWith("Object ")) {
                const index = parseInt(key.replace("Object ", ""));
                currentData = currentData[index];
            } else {
                currentData = currentData[key];
            }
        }

        return currentData;
    } catch (error) {
        console.error("Error getting data at path:", error);
        return null;
    }
};

// Helper to handle complex array structures
export const getNextLevelOptions = (data) => {
    if (!data || typeof data !== "object") return ["All"];

    if (Array.isArray(data)) {
        if (data.length === 0) return ["All"];

        // Special handling for arrays of arrays or arrays of objects
        return ["All", ...data.map((_, index) => `Item ${index}`)];
    } else {
        const keys = Object.keys(data);
        if (keys.length === 0) return ["All"];
        return ["All", ...keys];
    }
};

const RawJsonExplorer = ({ pageData }) => {
    // Initialize with cleaned data
    const [originalData, setOriginalData] = useState(null);
    const [currentPath, setCurrentPath] = useState<[number, string][]>([[0, "All"]]); // [[rowIndex, selectedKey], ...]
    const [displayData, setDisplayData] = useState(null);

    // Bookmark-related state
    const [bookmarks, setBookmarks] = useState([]);
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
        const newPath: [number, string][] = currentPath.slice(0, rowIndex + 1).map((item, idx) => 
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

    // Render navigation rows with placeholders for minimizing UI shifts
    const renderNavigationRows = () => {
        if (!originalData) return null;

        // Create array of rows to render (including placeholders)
        const rowsToRender = [];

        // Add actual navigation rows
        currentPath.forEach(([rowIndex, selectedKey], idx) => {
            // Calculate the path up to this row for getting available keys
            const pathToHere = currentPath.slice(0, idx).map(([_, key]) => key);
            const keysForThisRow = getKeysAtPath(originalData, pathToHere);

            rowsToRender.push(
                <div key={`row-${rowIndex}`} className="flex flex-wrap gap-2 mb-2">
                    {keysForThisRow.map((key) => (
                        <Button
                            key={key}
                            size="sm"
                            variant={selectedKey === key ? "default" : "outline"}
                            onClick={() => handleKeySelect(rowIndex, key)}
                            className="text-xs"
                        >
                            {key}
                        </Button>
                    ))}
                </div>
            );
        });

        // Add placeholder rows to minimize UI shifts (up to 3 rows total)
        const placeholdersNeeded = Math.max(0, 3 - rowsToRender.length);
        for (let i = 0; i < placeholdersNeeded; i++) {
            rowsToRender.push(
                <div key={`placeholder-${i}`} className="h-10 mb-2 invisible">
                    {/* Invisible placeholder with same height as a row */}
                </div>
            );
        }

        return rowsToRender;
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

    // Generate access path string for the current data
    const generateAccessPath = () => {
        if (currentPath.length === 0) return "data";

        // Start with the base
        let accessPath = "data";

        // Iterate through all path elements
        for (let i = 0; i < currentPath.length; i++) {
            const [_, key] = currentPath[i];
            if (key === "All") continue; // Skip "All" selections

            // Ensure key is treated as a string
            const keyStr = String(key);

            if (keyStr.startsWith("Item ")) {
                // For array items
                const index = parseInt(keyStr.replace("Item ", ""));
                accessPath += `[${index}]`;
            } else if (keyStr.startsWith("Object ")) {
                // For object items in arrays
                const index = parseInt(keyStr.replace("Object ", ""));
                accessPath += `[${index}]`;
            } else {
                // For normal object keys
                accessPath += `["${keyStr}"]`;
            }
        }

        return accessPath;
    };

    // Generate a comprehensive path description
    const generatePathDescription = () => {
        if (currentPath.length === 0) return "Root object";

        const pathElements = [];

        // Iterate through all path elements
        for (let i = 0; i < currentPath.length; i++) {
            const [_, key] = currentPath[i];
            if (key === "All") continue; // Skip "All" selections

            // Ensure key is treated as a string
            const keyStr = String(key);

            if (keyStr.startsWith("Item ")) {
                // For array items
                const index = parseInt(keyStr.replace("Item ", ""));
                pathElements.push(`Item ${index}`);
            } else if (keyStr.startsWith("Object ")) {
                // For object items in arrays
                const index = parseInt(keyStr.replace("Object ", ""));
                pathElements.push(`Object ${index}`);
            } else {
                // For normal object keys
                pathElements.push(`"${keyStr}"`);
            }
        }

        return pathElements.length > 0 ? pathElements.join(" → ") : "Root object";
    };

    const handleSaveBookmark = () => {
        const pathString = generateAccessPath();
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
                const newPath: [number, string][] = [[0, "All"]];
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
        copyToClipboard(generateAccessPath());
    };

    const renderBookmarksDialog = () => {
        return (
            <Dialog open={bookmarksDialogOpen} onOpenChange={setBookmarksDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Saved Paths</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto">
                        {bookmarks.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No saved paths yet. Navigate to a location and save it!</div>
                        ) : (
                            <div className="space-y-3">
                                {bookmarks.map((bookmark, index) => (
                                    <div key={index} className="border rounded p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-medium">{bookmark.name}</h3>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => jumpToBookmark(bookmark)}>
                                                    Go
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => deleteBookmark(index)}
                                                    className="text-red-500"
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                        {bookmark.description && <p className="text-sm text-gray-500 mb-2">{bookmark.description}</p>}
                                        <code className="text-xs block bg-gray-100 dark:bg-gray-800 p-2 rounded">{bookmark.path}</code>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        );
    };

    // Add a bookmark creation dialog
    const renderBookmarkDialog = () => {
        return (
            <Dialog open={bookmarkDialogOpen} onOpenChange={setBookmarkDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save Current Path</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium">Path:</label>
                            <code className="text-xs block bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">{generateAccessPath()}</code>
                        </div>
                        <div>
                            <label htmlFor="bookmark-name" className="text-sm font-medium block mb-1">
                                Name:
                            </label>
                            <Input
                                id="bookmark-name"
                                value={bookmarkName}
                                onChange={(e) => setBookmarkName(e.target.value)}
                                placeholder="Enter a name for this path"
                            />
                        </div>
                        <div>
                            <label htmlFor="bookmark-description" className="text-sm font-medium block mb-1">
                                Description (optional):
                            </label>
                            <Input
                                id="bookmark-description"
                                value={bookmarkDescription}
                                onChange={(e) => setBookmarkDescription(e.target.value)}
                                placeholder="What does this path point to?"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBookmarkDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveBookmark}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
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
            <div className="mb-4 flex justify-between items-center">
                <div className="flex-1">
                    {generatePathDescription() !== "Root object" && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 pl-2">
                            <span className="font-medium">Path:</span> {generatePathDescription()}
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <BookmarkManagerActions jsonStr={jsonStr} />
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBookmarksDialogOpen(true)}
                        title="View Saved Paths"
                        className="text-xs"
                    >
                        <IoBookmarks className="w-3 h-3 mr-1" />
                        Paths
                    </Button>

                    {bookmarks.length > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleExportBookmarks}
                            title="Export All Bookmarks"
                            className="text-xs"
                        >
                            Export
                        </Button>
                    )}

                    {generateAccessPath() !== "data" && (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setBookmarkDialogOpen(true)}
                                title="Save Current Path"
                                className="text-xs"
                            >
                                <BookmarkIcon className="w-3 h-3 mr-1" />
                                Save
                            </Button>

                            <Button size="sm" variant="outline" onClick={copyAccessPath} title="Copy Access Path" className="text-xs">
                                Copy Path
                            </Button>
                        </>
                    )}

                    <Button size="sm" variant="ghost" onClick={handleReset} title="Reset">
                        <RefreshCw className="w-4 h-4" />
                    </Button>

                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(jsonStr)} title="Copy JSON">
                        <CopyIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {generateAccessPath() !== "data" && (
                <div className="mb-4 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-x-auto">
                    {generateAccessPath()}
                </div>
            )}

            <div className="mb-4 border-b pb-4 border-gray-200 dark:border-gray-700">{renderNavigationRows()}</div>

            <pre className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 overflow-auto max-h-[70vh]">
                {jsonStr}
            </pre>

            {renderBookmarkDialog()}
            {renderBookmarksDialog()}
        </div>
    );
};

export default RawJsonExplorer;
