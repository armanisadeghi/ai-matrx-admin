'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Download, Copy } from 'lucide-react';
import { MarkdownTableProps } from './types';
import { useToastManager } from '@/hooks/useToastManager';

const MarkdownTable: React.FC<MarkdownTableProps> = ({ data, className, fontSize = 16 }) => {
    const tableFontsize = fontSize + 6;
    const toast = useToastManager();

    // Clean data by removing markdown formatting
    const cleanData = {
        headers: data.headers.map(header => header.replace(/\*\*/g, '').trim()),
        rows: data.rows.map(row =>
            row.map(cell => cell.replace(/\*\*/g, '').trim())
        )
    };

    const copyTableToClipboard = async () => {
        try {
            // Format data as a visually appealing table
            const maxLengths = Array(cleanData.headers.length).fill(0);

            // Calculate maximum lengths for each column
            [cleanData.headers, ...cleanData.rows].forEach(row => {
                row.forEach((cell, i) => {
                    maxLengths[i] = Math.max(maxLengths[i], cell.length);
                });
            });

            // Create formatted table
            const formatRow = (row: string[]) =>
                '| ' + row.map((cell, i) => cell.padEnd(maxLengths[i])).join(' | ') + ' |';

            const separator = '|-' + maxLengths.map(len => '-'.repeat(len)).join('-|-') + '-|';

            const formattedTable = [
                formatRow(cleanData.headers),
                separator,
                ...cleanData.rows.map(row => formatRow(row))
            ].join('\n');

            await navigator.clipboard.writeText(formattedTable);
            toast.success('Table copied to clipboard');
        } catch (err) {
            toast.error(err);
        }
    };

    const downloadCSV = () => {
        try {
            // Create CSV with clean data
            const csvContent = [
                cleanData.headers.join(','),
                ...cleanData.rows.map(row =>
                    row.map(cell => {
                        // Handle cells containing commas or quotes
                        const escaped = cell.replace(/"/g, '""');
                        return cell.includes(',') ? `"${escaped}"` : escaped;
                    }).join(',')
                )
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            // Create and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = 'table_data.csv';
            link.click();
            URL.revokeObjectURL(url);

            toast.success('Table exported to CSV', {
                action: {
                    label: 'Download Again',
                    onClick: () => {
                        link.click();
                    },
                    className: 'font-medium'
                }
            });
        } catch (err) {
            toast.error(err);
        }
    };

    return (
        <div className="w-full space-y-4 my-4">
            <div className="overflow-x-auto rounded-lg border border-border">
                <table className={cn(
                    "w-full border-collapse",
                    className
                )} style={{ fontSize: `${tableFontsize}px` }}>
                    <thead>
                    <tr className="border-b border-border bg-muted hover:bg-muted/80">
                        {cleanData.headers.map((header, i) => (
                            <th key={i} className="px-4 py-2 text-left font-semibold text-foreground">
                                {header}
                            </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {cleanData.rows.map((row, i) => (
                        <tr key={i} className={cn(
                            "border-b border-border transition-colors",
                            "hover:bg-accent/10",
                            i % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                        )}>
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
        </div>
    );
};

export default MarkdownTable;
