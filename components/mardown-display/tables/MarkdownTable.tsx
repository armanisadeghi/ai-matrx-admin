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
    onSave = () => {} 
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [tableData, setTableData] = useState<{
        headers: string[];
        rows: string[][];
    }>({
        headers: [],
        rows: []
    });
    const tableFontsize = fontSize + 4;
    const toast = useToastManager();
    const tableTheme = THEMES[theme].table || THEMES.professional.table;

    useEffect(() => {
        // Clean data when it changes
        const cleanHeaders = data.headers.map(header => header.replace(/\*\*/g, "").trim());
        const cleanRows = data.rows.map(row => 
            row.map(cell => cell.replace(/\*\*/g, "").trim())
        );
        
        setTableData({
            headers: cleanHeaders,
            rows: cleanRows
        });
    }, [data]);

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

    const downloadCSV = () => {
        try {
            const csvContent = [
                tableData.headers.join(","),
                ...tableData.rows.map((row) =>
                    row.map((cell) => {
                        const escaped = cell.replace(/"/g, '""');
                        return cell.includes(",") ? `"${escaped}"` : escaped;
                    }).join(",")
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

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
        toast.info(isEditMode ? "View mode activated" : "Edit mode activated");
    };

    const handleHeaderChange = (index: number, value: string) => {
        const newHeaders = [...tableData.headers];
        newHeaders[index] = value;
        setTableData({
            ...tableData,
            headers: newHeaders
        });
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...tableData.rows];
        newRows[rowIndex][colIndex] = value;
        setTableData({
            ...tableData,
            rows: newRows
        });
    };

    const handleSave = () => {
        onSave(tableData);
        toast.success("Table data saved");
        // Optionally switch back to view mode
        // setIsEditMode(false);
    };

    const handleCancel = () => {
        // Reset to original data
        const cleanHeaders = data.headers.map(header => header.replace(/\*\*/g, "").trim());
        const cleanRows = data.rows.map(row => 
            row.map(cell => cell.replace(/\*\*/g, "").trim())
        );
        
        setTableData({
            headers: cleanHeaders,
            rows: cleanRows
        });
        setIsEditMode(false);
        toast.info("Edits cancelled");
    };

    return (
        <div className="w-full space-y-4 my-4">
            <div className={cn("overflow-x-auto rounded-xl border-3", tableTheme.border)}>
                <table className={cn("w-full border-collapse", className)} style={{ fontSize: `${tableFontsize}px` }}>
                    <thead>
                        <tr className={cn("border-b", tableTheme.border, tableTheme.header)}>
                            {tableData.headers.map((header, i) => (
                                <th key={i} className={cn("px-4 py-2 text-left font-semibold", tableTheme.headerText)}>
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            value={header}
                                            onChange={(e) => handleHeaderChange(i, e.target.value)}
                                            className={cn(
                                                "w-full bg-transparent outline-none border border-dashed border-blue-300 p-1",
                                                tableTheme.headerText
                                            )}
                                        />
                                    ) : (
                                        header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.rows.map((row, i) => (
                            <tr
                                key={i}
                                className={cn(
                                    "border-b transition-colors",
                                    tableTheme.border,
                                    tableTheme.row.hover,
                                    i % 2 === 0 ? tableTheme.row.even : tableTheme.row.odd
                                )}
                            >
                                {row.map((cell, j) => (
                                    <td key={j} className={cn("px-4 py-2", j === 0 && "font-semibold")}>
                                        {isEditMode ? (
                                            <input
                                                type="text"
                                                value={cell}
                                                onChange={(e) => handleCellChange(i, j, e.target.value)}
                                                className={cn(
                                                    "w-full bg-transparent outline-none border border-dashed border-blue-300 p-1",
                                                    j === 0 && "font-semibold"
                                                )}
                                            />
                                        ) : (
                                            cell
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-between">
                {/* Left side buttons (only shown in edit mode) */}
                <div className="flex gap-2">
                    {isEditMode && (
                        <>
                            <Button variant="outline" size="sm" onClick={handleCancel} className="flex items-center gap-2">
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                            <Button variant="default" size="sm" onClick={handleSave} className="flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                Save
                            </Button>
                        </>
                    )}
                </div>
                
                {/* Right side buttons (always shown but toggled between edit/view) */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyTableToClipboard} className="flex items-center gap-2">
                        <Copy className="h-4 w-4" />
                        Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCSV} className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={toggleEditMode} className="flex items-center gap-2">
                        {isEditMode ? (
                            <>
                                <Eye className="h-4 w-4" />
                                View
                            </>
                        ) : (
                            <>
                                <Edit className="h-4 w-4" />
                                Edit
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default MarkdownTable;