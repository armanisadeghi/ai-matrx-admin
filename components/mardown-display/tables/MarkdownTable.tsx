"use client";
import React, { useState, useEffect } from "react";
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
}

const MarkdownTable: React.FC<MarkdownTableProps> = ({
    data,
    className = "",
    fontSize = 16,
    theme = "professional",
    onSave = () => {},
    content = "",
}) => {
    const [tableData, setTableData] = useState<{
        headers: string[];
        rows: string[][];
        normalizedData?: Array<{ [key: string]: string }>;
    }>({
        headers: [],
        rows: [],
        normalizedData: data?.normalizedData,
    });
    const [showNormalized, setShowNormalized] = useState(false);
    const [editMode, setEditMode] = useState<"none" | "header" | number>("none");
    const tableFontsize = fontSize;
    const toast = useToastManager();
    const tableTheme = THEMES[theme].table || THEMES.professional.table;
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [savedTableInfo, setSavedTableInfo] = useState<SavedTableInfo | null>(null);

    useEffect(() => {
        // Use the raw data with Markdown intact
        if (data) {
            setTableData({
                headers: data.headers || [],
                rows: data.rows || [],
                normalizedData: data.normalizedData,
            });
        }
    }, [data]);

    // Simple Markdown renderer for bold and italic
    const renderMarkdown = (text: string) => {
        let html = text
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>") // Bold with **
            .replace(/\*([^*]+)\*/g, "<em>$1</em>") // Italic with *
            .replace(/_([^_]+)_/g, "<em>$1</em>"); // Italic with _
        // Handle cases where bold and italic overlap (e.g., ***text***)
        html = html.replace(/<em><strong>([^<]+)<\/strong><\/em>/g, "<strong><em>$1</em></strong>");
        return <span dangerouslySetInnerHTML={{ __html: html }} />;
    };

    const copyTableToClipboard = async () => {
        try {
            const maxLengths = Array(tableData.headers.length).fill(0);
            [tableData.headers, ...tableData.rows].forEach((row) => {
                row.forEach((cell, i) => {
                    maxLengths[i] = Math.max(maxLengths[i], cell.length);
                });
            });
            const formatRow = (row: string[]) => "| " + row.map((cell, i) => cell.padEnd(maxLengths[i])).join(" | ") + " |";
            const separator = "|-" + maxLengths.map((len) => "-".repeat(len)).join("-|-") + "-|";
            const formattedTable = [formatRow(tableData.headers), separator, ...tableData.rows.map((row) => formatRow(row))].join("\n");
            await navigator.clipboard.writeText(formattedTable);
            toast.success("Table copied to clipboard");
        } catch (err: any) {
            toast.error(err.message || "Failed to copy table");
        }
    };

    const copyJsonToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(tableData.normalizedData, null, 2));
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
                // Fallback if content isn't provided
                copyTableToClipboard();
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to copy markdown");
        }
    };

    const downloadCSV = () => {
        try {
            const csvContent = [
                tableData.headers.map((h) => h.replace(/"/g, '""')).join(","),
                ...tableData.rows.map((row) =>
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
            const fileName = tableData.headers && tableData.headers[0] 
                ? `${tableData.headers[0].replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md` 
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
            onSave(tableData);
            setEditMode("none");
            toast.info("Edit mode deactivated");
        } else {
            setEditMode("header");
            toast.info("Edit mode activated");
        }
    };

    const handleHeaderChange = (index: number, value: string) => {
        const newHeaders = [...tableData.headers];
        newHeaders[index] = value;
        setTableData({ ...tableData, headers: newHeaders });
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...tableData.rows];
        newRows[rowIndex][colIndex] = value;
        setTableData({ ...tableData, rows: newRows });
    };

    const handleRowClick = (rowIndex: number) => {
        if (editMode === "none") return;
        onSave(tableData);
        setEditMode(rowIndex);
    };

    const handleHeaderClick = () => {
        if (editMode === "none") return;
        onSave(tableData);
        setEditMode("header");
    };

    const handleSave = () => {
        onSave(tableData);
        setEditMode("none");
        toast.success("Table data saved");
    };

    const handleCancel = () => {
        if (data) {
            setTableData({
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

    // Handle save table completion
    const handleSaveComplete = (tableInfo: SavedTableInfo) => {
        setSavedTableInfo(tableInfo);
        setShowSaveModal(false);
        setShowViewModal(true);
    };

    // Render either a Save or View button based on whether the table is already saved
    const renderTableActionButton = () => {
        if (!tableData.normalizedData) return null;
        
        if (savedTableInfo) {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowViewModal(true)}
                    className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                >
                    <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                    <Database className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Save
                </Button>
            );
        }
    };

    return (
        <div className="w-full space-y-4 my-4">
            {showNormalized && tableData.normalizedData ? (
                <div className="relative">
                    <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(tableData.normalizedData, null, 2)}
                    </pre>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowNormalized(false)}
                        className="absolute top-2 right-2 opacity-90 hover:opacity-100 flex items-center gap-1 shadow-md"
                    >
                        <Eye className="h-4 w-4" />
                        <span>View Table</span>
                    </Button>
                </div>
            ) : (
                <div className={cn(isEditingEnabled ? editingBorderStyle : normalBorderStyle)}>
                    <table className={cn("w-full border-collapse", className)} style={{ fontSize: `${tableFontsize}px` }}>
                        <thead>
                            <tr
                                className={cn("border-b", tableTheme.border, tableTheme.header, isEditingEnabled && "cursor-pointer")}
                                onClick={isEditingEnabled ? handleHeaderClick : undefined}
                            >
                                {tableData.headers.map((header, i) => (
                                    <th
                                        key={i}
                                        className={cn(
                                            "px-1 py-2 text-left font-semibold",
                                            tableTheme.headerText,
                                            i < tableData.headers.length - 1 && "border-r border-gray-300 dark:border-gray-700"
                                        )}
                                    >
                                        {isEditingHeader ? (
                                            <input
                                                type="text"
                                                value={header}
                                                onChange={(e) => handleHeaderChange(i, e.target.value)}
                                                className={cn(
                                                    "w-full bg-transparent outline-none border border-dashed border-blue-300 p-1",
                                                    tableTheme.headerText
                                                )}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            renderMarkdown(header)
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.rows.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    className={cn(
                                        "border-b transition-colors",
                                        tableTheme.border,
                                        tableTheme.row.hover,
                                        rowIndex % 2 === 0 ? tableTheme.row.even : tableTheme.row.odd,
                                        isEditingEnabled && "cursor-pointer",
                                        editMode === rowIndex && "bg-blue-50 dark:bg-blue-900/20"
                                    )}
                                    onClick={isEditingEnabled ? () => handleRowClick(rowIndex) : undefined}
                                >
                                    {row.map((cell, colIndex) => (
                                        <td
                                            key={colIndex}
                                            className={cn(
                                                "px-1 pt-1 pb-0",
                                                colIndex < row.length - 1 && "border-r border-gray-300 dark:border-gray-700",
                                                colIndex === 0 && "font-semibold"
                                            )}
                                        >
                                            {editMode === rowIndex ? (
                                                <textarea
                                                    value={cell}
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
                                                renderMarkdown(cell)
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="flex justify-end gap-2">
                {tableData.normalizedData && (
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
                
                {/* Render either Save or View button */}
                {renderTableActionButton()}
                
                {/* Export dropdown menu replacing individual buttons */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30">
                            <Download className="h-4 w-4" />
                            Export
                            <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        {/* Copy section */}
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
                        
                        {/* Download section */}
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
                    <Button variant="outline" size="sm" onClick={toggleGlobalEditMode} className="flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-800/30">
                        <Edit className="h-4 w-4" />
                        Edit
                    </Button>
                )}
            </div>
            
            {/* Save Modal */}
            {showSaveModal && (
                <SaveTableModal
                    isOpen={showSaveModal}
                    onClose={() => setShowSaveModal(false)}
                    onSaveComplete={handleSaveComplete}
                    tableData={tableData.normalizedData}
                />
            )}
            
            {/* View Modal */}
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