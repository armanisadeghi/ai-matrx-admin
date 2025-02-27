"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Copy, Eye, Edit } from "lucide-react";
import { MarkdownTableProps } from "../types";
import { useToastManager } from "@/hooks/useToastManager";
import { THEMES } from "../themes";

import EditableTable from "./EditableTable";

const MarkdownTable = ({ data, className = "", fontSize = 16, theme = "professional", onSave=()=>{} }: MarkdownTableProps) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const tableFontsize = fontSize + 4;
    const toast = useToastManager();
    const tableTheme = THEMES[theme].table || THEMES.professional.table;
    
    const cleanData = {
        headers: data.headers.map((header) => header.replace(/\*\*/g, "").trim()),
        rows: data.rows.map((row) => row.map((cell) => cell.replace(/\*\*/g, "").trim())),
    };
    
    const copyTableToClipboard = async () => {
        try {
            const maxLengths = Array(cleanData.headers.length).fill(0);
            [cleanData.headers, ...cleanData.rows].forEach((row) => {
                row.forEach((cell, i) => {
                    maxLengths[i] = Math.max(maxLengths[i], cell.length);
                });
            });
            const formatRow = (row) => 
                "| " + row.map((cell, i) => cell.padEnd(maxLengths[i])).join(" | ") + " |";
            const separator = "|-" + maxLengths.map((len) => "-".repeat(len)).join("-|-") + "-|";
            const formattedTable = [
                formatRow(cleanData.headers), 
                separator, 
                ...cleanData.rows.map((row) => formatRow(row))
            ].join("\n");
            await navigator.clipboard.writeText(formattedTable);
            toast.success("Table copied to clipboard");
        } catch (err) {
            toast.error(err);
        }
    };
    
    const downloadCSV = () => {
        try {
            const csvContent = [
                cleanData.headers.join(","),
                ...cleanData.rows.map((row) =>
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
        } catch (err) {
            toast.error(err);
        }
    };
    
    const handleEditableSave = (updatedData) => {
        // If parent component provided onSave handler, use it
        if (onSave) {
            onSave(updatedData);
        } else {
            toast.success("Table data updated");
            // Add logic here to handle saving if no parent handler
        }
    };
    
    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
        toast.info(isEditMode ? "View mode activated" : "Edit mode activated");
    };
    
    return (
        <div className="w-full space-y-4 my-4">
            {isEditMode ? (
                <EditableTable
                    data={cleanData}
                    theme={theme}
                    fontSize={fontSize}
                    onSave={(updatedData) => {
                        handleEditableSave(updatedData);
                        // Optionally switch back to view mode after save
                        // setIsEditMode(false);
                    }}
                    className={className}
                />
            ) : (
                <>
                    <div className={cn("overflow-x-auto rounded-xl border-3", tableTheme.border)}>
                        <table className={cn("w-full border-collapse", className)} style={{ fontSize: `${tableFontsize}px` }}>
                            <thead>
                                <tr className={cn("border-b", tableTheme.border, tableTheme.header)}>
                                    {cleanData.headers.map((header, i) => (
                                        <th key={i} className={cn(
                                            "px-4 py-2 text-left font-semibold",
                                            tableTheme.headerText
                                        )}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {cleanData.rows.map((row, i) => (
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
                                            <td key={j} className={cn(
                                                "px-4 py-2",
                                                j === 0 && "font-semibold"
                                            )}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={copyTableToClipboard} 
                            className="flex items-center gap-2"
                        >
                            <Copy className="h-4 w-4" />
                            Copy Table
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={downloadCSV} 
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                    </div>
                </>
            )}
            
            {/* Toggle button - always visible */}
            <div className="flex justify-end mt-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleEditMode}
                    className="flex items-center gap-2"
                >
                    {isEditMode ? (
                        <>
                            <Eye className="h-4 w-4" />
                            View Mode
                        </>
                    ) : (
                        <>
                            <Edit className="h-4 w-4" />
                            Edit Mode
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

export default MarkdownTable;
