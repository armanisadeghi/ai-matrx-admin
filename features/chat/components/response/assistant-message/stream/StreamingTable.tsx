"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface StreamingTableProps {
    data?: {
        headers: string[];
        rows: string[][];
    };
    className?: string;
    fontSize?: number;
    children?: React.ReactNode;
}

const StreamingTable = ({
    data,
    className = "",
    fontSize = 16,
    children,
}: StreamingTableProps) => {
    // If data is provided, render from data
    if (data && data.headers && data.rows) {
        const cleanData = {
            headers: data.headers.map((header) => header.replace(/\*\*/g, "").trim()),
            rows: data.rows.map((row) => row.map((cell) => cell.replace(/\*\*/g, "").trim())),
        };

        return (
            <div className="w-full min-w-0 space-y-4 my-4">
                <div className={cn("overflow-x-auto rounded-xl border-3 border-gray-300 dark:border-gray-900 min-w-0")}>
                    <table className={cn("w-full border-collapse min-w-0", className)} style={{ fontSize: `${fontSize}px` }}>
                        <thead>
                            <tr
                                className={cn(
                                    "border-b border-gray-300 dark:border-gray-900 bg-gray-300 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                                )}
                            >
                                {cleanData.headers.map((header, i) => (
                                    <th key={i} className={cn("px-4 py-2 text-left font-semibold text-bold text-gray-900 dark:text-gray-100")}>
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
                                        "border-b transition-colors border-gray-300 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-600/20 cursor-pointer",
                                        i % 2 === 0
                                            ? "bg-white dark:bg-transparent cursor-pointer"
                                            : "bg-gray-50/50 dark:bg-gray-900/30 cursor-pointer"
                                    )}
                                >
                                    {row.map((cell, j) => (
                                        <td key={j} className={cn("px-4 py-2", j === 0 && "font-semibold")}>
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Otherwise, render children (for react-markdown AST nodes)
    return (
        <div className="w-full min-w-0 space-y-4 my-4">
            <div className={cn("overflow-x-auto rounded-xl border-3 border-gray-300 dark:border-gray-900 min-w-0")}>
                <table className={cn("w-full border-collapse min-w-0", className)} style={{ fontSize: `${fontSize}px` }}>
                    {children}
                </table>
            </div>
        </div>
    );
};

export default StreamingTable;