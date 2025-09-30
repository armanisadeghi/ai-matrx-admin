"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Copy, 
  Eye, 
  Edit, 
  Save, 
  X, 
  FileJson, 
  FileText, 
  FileSpreadsheet, 
  FileDown,
  ChevronDown,
  Database,
  ExternalLink 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useToastManager } from "@/hooks/useToastManager";
import { THEMES } from "../themes";
import SaveTableModal from "./SaveTableModal";
import ViewTableModal from "./ViewTableModal";

interface ExportDropdownMenuProps {
  tableData: {
    headers: string[];
    rows: string[][];
    normalizedData?: Array<{ [key: string]: string }>;
  };
  content?: string;
  copyTableToClipboard: () => void;
  copyMarkdownToClipboard: () => void;
  copyJsonToClipboard: () => void;
  downloadCSV: () => void;
  downloadMarkdown: () => void;
  isStreamActive?: boolean;
}

const ExportDropdownMenu: React.FC<ExportDropdownMenuProps> = ({
  tableData,
  content,
  copyTableToClipboard,
  copyMarkdownToClipboard,
  copyJsonToClipboard,
  downloadCSV,
  downloadMarkdown,
  isStreamActive = false,
}) => {
  const [isDataStable, setIsDataStable] = useState(false);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize the tableData to prevent unnecessary re-renders when references change but content is same
  const stableTableData = useMemo(() => ({
    headers: tableData.headers,
    rows: tableData.rows,
    normalizedData: tableData.normalizedData,
  }), [
    JSON.stringify(tableData.headers), 
    JSON.stringify(tableData.rows), 
    JSON.stringify(tableData.normalizedData)
  ]);

  useEffect(() => {
    // Don't process stability during streaming
    if (isStreamActive) {
      setIsDataStable(false);
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
        stabilityTimerRef.current = null;
      }
      return;
    }

    // Clear any existing timer
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
    }

    // Hide menu immediately when data changes
    setIsDataStable(false);

    // Set a timeout to show menu after 1 second of stability
    stabilityTimerRef.current = setTimeout(() => {
      setIsDataStable(true);
    }, 1000);

    return () => {
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
    };
  }, [stableTableData, content, isStreamActive]);

  // Don't render anything during streaming or if data is not stable
  if (isStreamActive || !isDataStable) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30">
          <Download className="h-4 w-4" />
          Export
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={copyTableToClipboard} className="flex items-center gap-2 cursor-pointer">
          <FileText className="h-4 w-4 text-green-500" />
          <span>Copy as Text</span>
        </DropdownMenuItem>
        {content && (
          <DropdownMenuItem onClick={copyMarkdownToClipboard} className="flex items-center gap-2 cursor-pointer">
            <FileDown className="h-4 w-4 text-purple-500" />
            <span>Copy as Markdown</span>
          </DropdownMenuItem>
        )}
        {tableData.normalizedData && (
          <DropdownMenuItem onClick={copyJsonToClipboard} className="flex items-center gap-2 cursor-pointer">
            <FileJson className="h-4 w-4 text-blue-500" />
            <span>Copy as JSON</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={downloadCSV} className="flex items-center gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4 text-orange-500" />
          <span>Download as CSV</span>
        </DropdownMenuItem>
        {content && (
          <DropdownMenuItem onClick={downloadMarkdown} className="flex items-center gap-2 cursor-pointer">
            <FileDown className="h-4 w-4 text-indigo-500" />
            <span>Download as Markdown</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface SavedTableInfo {
  table_id: string;
  table_name: string;
  row_count: string;
  field_count: string;
}

interface MarkdownTableProps {
    data: {
        headers: string[];
        rows: string[][];
        normalizedData?: Array<{ [key: string]: string }>;
    };
    className?: string;
    fontSize?: number;
    theme?: string;
    onSave?: (tableData: { headers: string[]; rows: string[][] }) => void;
    content?: string;
    onContentChange?: (updatedMarkdown: string) => void;
    isStreamActive?: boolean;
}
const MarkdownTable: React.FC<MarkdownTableProps> = ({
    data,
    className = "",
    fontSize = 16,
    theme = "professional",
    onSave = () => {},
    content = "",
    onContentChange,
    isStreamActive = false,
}) => {
    const [savedTableInfo, setSavedTableInfo] = useState<SavedTableInfo | null>(null);

    // Use useMemo to create stable table data based on content, not object references
    const tableData = useMemo(() => {
        if (!data) {
            return {
                headers: [],
                rows: [],
                normalizedData: undefined,
            };
        }
        
        return {
            headers: data.headers || [],
            rows: data.rows || [],
            normalizedData: data.normalizedData,
        };
    }, [
        JSON.stringify(data?.headers || []),
        JSON.stringify(data?.rows || []),
        JSON.stringify(data?.normalizedData || [])
    ]);

    const [internalTableData, setInternalTableData] = useState(tableData);
    const [showNormalized, setShowNormalized] = useState(false);
    const [editMode, setEditMode] = useState<"none" | "header" | number>("none");
    const tableFontsize = fontSize;
    const toast = useToastManager();
    const tableTheme = THEMES[theme].table || THEMES.professional.table;
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const previousDataRef = useRef<string>("");

    // Update internal state when tableData changes
    useEffect(() => {
        setInternalTableData(tableData);
    }, [tableData]);

    useEffect(() => {
        if (data) {
            // Create a stable hash of the data to detect actual changes
            const dataHash = JSON.stringify({
                headers: data.headers || [],
                rows: data.rows || [],
                normalizedData: data.normalizedData,
            });
            
            // Only update if the data has actually changed
            if (dataHash !== previousDataRef.current) {
                previousDataRef.current = dataHash;
                setInternalTableData({
                    headers: data.headers || [],
                    rows: data.rows || [],
                    normalizedData: data.normalizedData,
                });
            }
        }
    }, [data]);

    // Enhanced Markdown renderer for bold, italic, and links
    const renderMarkdown = (text: string) => {
        // First handle links to preserve them as JSX elements
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = linkRegex.exec(text)) !== null) {
            // Add text before the link
            if (match.index > lastIndex) {
                const beforeText = text.substring(lastIndex, match.index);
                const processedBefore = beforeText
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold with **
                    .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic with *
                    .replace(/_([^_]+)_/g, '<em>$1</em>'); // Italic with _
                parts.push(processedBefore);
            }

            // Add the link as a clickable element
            const linkText = match[1];
            const linkUrl = match[2];
            parts.push(
                `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">${linkText}</a>`
            );
            
            lastIndex = linkRegex.lastIndex;
        }

        // Add remaining text after the last link
        if (lastIndex < text.length) {
            const remainingText = text.substring(lastIndex);
            const processedRemaining = remainingText
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold with **
                .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic with *
                .replace(/_([^_]+)_/g, '<em>$1</em>'); // Italic with _
            parts.push(processedRemaining);
        }

        // If no links were found, just process formatting
        if (parts.length === 0) {
            return text
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') // Bold with **
                .replace(/\*([^*]+)\*/g, '<em>$1</em>') // Italic with *
                .replace(/_([^_]+)_/g, '<em>$1</em>'); // Italic with _
        }

        return parts.join('');
    };

    const generateMarkdownTable = () => {
        const dataToUse = editMode !== "none" ? internalTableData : internalTableData;
        const maxLengths = Array(dataToUse.headers.length).fill(0);
        [dataToUse.headers, ...dataToUse.rows].forEach((row) => {
            row.forEach((cell, i) => {
                maxLengths[i] = Math.max(maxLengths[i], cell.length);
            });
        });
        const formatRow = (row: string[]) => "| " + row.map((cell, i) => cell.padEnd(maxLengths[i])).join(" | ") + " |";
        const separator = "|-" + maxLengths.map((len) => "-".repeat(len)).join("-|-") + "-|";
        return [formatRow(dataToUse.headers), separator, ...dataToUse.rows.map((row) => formatRow(row))].join("\n");
    };

    const notifyContentChange = () => {
        if (onContentChange && content) {
            const updatedMarkdown = generateMarkdownTable();
            onContentChange(updatedMarkdown);
        }
    };

    const copyTableToClipboard = async () => {
        try {
            const formattedTable = generateMarkdownTable();
            await navigator.clipboard.writeText(formattedTable);
            toast.success("Table copied to clipboard");
        } catch (err: any) {
            toast.error(err.message || "Failed to copy table");
        }
    };

    const copyJsonToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(internalTableData.normalizedData, null, 2));
            toast.success("JSON copied to clipboard");
        } catch (err: any) {
            toast.error(err.message || "Failed to copy JSON");
        }
    };

    const copyMarkdownToClipboard = async () => {
        try {
            if (content) {
                await navigator.clipboard.writeText(content);
                toast.success("Markdown copied to clipboard");
            } else {
                copyTableToClipboard();
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to copy markdown");
        }
    };

    const downloadCSV = () => {
        try {
            const csvContent = [
                internalTableData.headers.map((h) => h.replace(/"/g, '""')).join(","),
                ...internalTableData.rows.map((row) =>
                    row
                        .map((cell) => {
                            const escaped = cell.replace(/"/g, '""');
                            return cell.includes(",") ? `"${escaped}"` : escaped;
                        })
                        .join(",")
                ),
            ].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "table_data.csv";
            link.click();
            URL.revokeObjectURL(url);
            toast.success("Table exported to CSV", {
                action: {
                    label: "Download Again",
                    onClick: () => link.click(),
                    className: "font-medium",
                },
            });
        } catch (err: any) {
            toast.error(err.message || "Failed to download CSV");
        }
    };

    const downloadMarkdown = () => {
        try {
            const markdownContent = content || '';
            const fileName = internalTableData.headers && internalTableData.headers[0] 
                ? `${internalTableData.headers[0].replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md` 
                : 'table_data.md';
            const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("Markdown file downloaded", {
                action: {
                    label: "Download Again",
                    onClick: () => {
                        const newLink = document.createElement('a');
                        newLink.href = url;
                        newLink.download = fileName;
                        document.body.appendChild(newLink);
                        newLink.click();
                        document.body.removeChild(newLink);
                    },
                    className: "font-medium",
                },
            });
        } catch (err: any) {
            toast.error(err.message || "Failed to download Markdown");
        }
    };

    const toggleGlobalEditMode = () => {
        if (editMode !== "none") {
            onSave(internalTableData);
            setEditMode("none");
            toast.info("Edit mode deactivated");
            notifyContentChange();
        } else {
            setEditMode("header");
            toast.info("Edit mode activated");
        }
    };

    const handleHeaderChange = (index: number, value: string) => {
        const newHeaders = [...internalTableData.headers];
        newHeaders[index] = value;
        setInternalTableData({ ...internalTableData, headers: newHeaders });
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...internalTableData.rows];
        newRows[rowIndex][colIndex] = value;
        setInternalTableData({ ...internalTableData, rows: newRows });
    };

    const handleRowClick = (rowIndex: number) => {
        if (editMode === "none") return;
        onSave(internalTableData);
        setEditMode(rowIndex);
    };

    const handleHeaderClick = () => {
        if (editMode === "none") return;
        onSave(internalTableData);
        setEditMode("header");
    };

    const handleSave = () => {
        onSave(internalTableData);
        setEditMode("none");
        toast.success("Table data saved");
        notifyContentChange();
    };

    const handleCancel = () => {
        if (data) {
            setInternalTableData({
                headers: data.headers || [],
                rows: data.rows || [],
                normalizedData: data.normalizedData,
            });
        }
        setEditMode("none");
        toast.info("Edits cancelled");
    };

    const isEditingEnabled = editMode !== "none";
    const isEditingHeader = editMode === "header";
    const editingBorderStyle = "overflow-x-auto rounded-xl border-3 border-dashed border-red-500 rounded-xl";
    const normalBorderStyle = `overflow-x-auto rounded-xl border-3 ${tableTheme.border}`;

    const handleSaveComplete = (tableInfo: SavedTableInfo) => {
        setSavedTableInfo(tableInfo);
        setShowSaveModal(false);
        setShowViewModal(true);
    };

    const renderTableActionButton = () => {
        if (!internalTableData.normalizedData) return null;
        if (savedTableInfo) {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowViewModal(true)}
                    className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                >
                    <ExternalLink className="h-4 w-4" />
                    View Saved Table
                </Button>
            );
        } else {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                >
                    <Database className="h-4 w-4" />
                    Save
                </Button>
            );
        }
    };

    return (
        <div className={cn("relative", className)}>
            {showNormalized && internalTableData.normalizedData ? (
                <div className="relative p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <pre className="text-sm overflow-auto">{JSON.stringify(internalTableData.normalizedData, null, 2)}</pre>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNormalized(false)}
                        className="absolute top-2 right-2 opacity-90 hover:opacity-100 flex items-center gap-1 shadow-md"
                    >
                        <Eye className="h-4 w-4" />
                        View Table
                    </Button>
                </div>
            ) : (
                <div className={isEditingEnabled ? editingBorderStyle : normalBorderStyle}>
                    <table className="w-full border-collapse" style={{ fontSize: `${tableFontsize}px` }}>
                        <thead className={tableTheme.header}>
                            <tr onClick={handleHeaderClick}>
                                {internalTableData.headers.map((header, i) => (
                                    <th key={i} className={cn("p-2 text-left", tableTheme.headerText)}>
                                        {isEditingHeader ? (
                                            <input
                                                type="text"
                                                value={internalTableData.headers[i] || header}
                                                onChange={(e) => handleHeaderChange(i, e.target.value)}
                                                className={cn(
                                                    "w-full bg-transparent outline-none border border-dashed border-blue-300 p-1",
                                                    tableTheme.headerText
                                                )}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <span dangerouslySetInnerHTML={{ __html: renderMarkdown(header) }} />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {internalTableData.rows.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className={cn("border-t", tableTheme.row, editMode === rowIndex && "bg-blue-50 dark:bg-blue-900/20")}
                                    onClick={() => handleRowClick(rowIndex)}
                                >
                                    {row.map((cell, colIndex) => (
                                        <td key={colIndex} className={cn("p-2", colIndex === 0 && "font-semibold")}>
                                            {editMode === rowIndex ? (
                                                <textarea
                                                    value={internalTableData.rows[rowIndex]?.[colIndex] || cell}
                                                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                    className={cn(
                                                        "w-full bg-transparent outline-none border border-dashed border-blue-300 p-1",
                                                        "resize-y min-h-[8rem]",
                                                        colIndex === 0 && "font-semibold"
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onFocus={(e) => e.target.select()}
                                                />
                                            ) : (
                                                <span dangerouslySetInnerHTML={{ __html: renderMarkdown(cell) }} />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="flex justify-end gap-2 mt-2">
                {internalTableData.normalizedData && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNormalized(!showNormalized)}
                        className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                    >
                        <Eye className="h-4 w-4" />
                        {showNormalized ? "Table" : "Data"}
                    </Button>
                )}
                {renderTableActionButton()}
                <ExportDropdownMenu
                    tableData={internalTableData}
                    content={content}
                    copyTableToClipboard={copyTableToClipboard}
                    copyMarkdownToClipboard={copyMarkdownToClipboard}
                    copyJsonToClipboard={copyJsonToClipboard}
                    downloadCSV={downloadCSV}
                    downloadMarkdown={downloadMarkdown}
                    isStreamActive={isStreamActive}
                />
                {isEditingEnabled ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            className="flex items-center gap-2 border-1 border-dashed border-green-500 rounded-xl"
                        >
                            <Save className="h-4 w-4" />
                            Save
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            className="flex items-center gap-2 border-1 border-dashed border-red-500 rounded-xl"
                        >
                            <X className="h-4 w-4" />
                            Cancel
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleGlobalEditMode}
                        className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                    >
                        <Edit className="h-4 w-4" />
                        Edit
                    </Button>
                )}
            </div>
            {showSaveModal && (
                <SaveTableModal
                    isOpen={showSaveModal}
                    onClose={() => setShowSaveModal(false)}
                    onSaveComplete={handleSaveComplete}
                    tableData={internalTableData.normalizedData}
                />
            )}
            {showViewModal && savedTableInfo && (
                <ViewTableModal
                    isOpen={showViewModal}
                    onClose={() => setShowViewModal(false)}
                    tableInfo={savedTableInfo}
                />
            )}
        </div>
    );
};

export default MarkdownTable;