"use client";
import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Copy, Eye, Edit, Save, X } from "lucide-react";
import { useToastManager } from "@/hooks/useToastManager";
import { THEMES } from "../themes";
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
}
const MarkdownTable: React.FC<MarkdownTableProps> = ({
    data,
    className = "",
    fontSize = 16,
    theme = "professional",
    onSave = () => {},
}) => {
    const [tableData, setTableData] = useState<{
        headers: string[];
        rows: string[][];
        normalizedData?: Array<{ [key: string]: string }>;
    }>({
        headers: [],
        rows: [],
        normalizedData: data?.normalizedData, // Add optional chaining here
    });
    const [showNormalized, setShowNormalized] = useState(false);
    const [editMode, setEditMode] = useState<"none" | "header" | number>("none");
    const tableFontsize = fontSize;
    const toast = useToastManager();
    const tableTheme = THEMES[theme].table || THEMES.professional.table;
    useEffect(() => {
        // Use the raw data with Markdown intact
        if (data) { // Safely check if data exists
            setTableData({
                headers: data.headers || [], // Add fallbacks
                rows: data.rows || [],
                normalizedData: data.normalizedData, // normalizedData is already optional
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
        if (data) { // Safely check if data exists
            setTableData({
                headers: data.headers || [], // Add fallbacks
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
    return (
        <div className="w-full space-y-4 my-4">
            {showNormalized && tableData.normalizedData ? ( // Check if normalizedData exists
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto ">
                    {JSON.stringify(tableData.normalizedData, null, 2)}
                </pre>
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
                {tableData.normalizedData && ( // Check if normalizedData exists
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNormalized(!showNormalized)}
                        className="flex items-center gap-2"
                    >
                        <Eye className="h-4 w-4" />
                        {showNormalized ? "Table" : "Data"}
                    </Button>
                )}
                {tableData.normalizedData && ( // Check if normalizedData exists
                    <Button variant="outline" size="sm" onClick={copyJsonToClipboard} className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Data
                    </Button>
                )}
                <Button variant="outline" size="sm" onClick={downloadCSV} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    CSV
                </Button>
                <Button variant="outline" size="sm" onClick={copyTableToClipboard} className="flex items-center gap-2">
                    <Copy className="h-4 w-4" />
                    Text
                </Button>
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
                    <Button variant="outline" size="sm" onClick={toggleGlobalEditMode} className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                    </Button>
                )}
            </div>
        </div>
    );
};
export default MarkdownTable;