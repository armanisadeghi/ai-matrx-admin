"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import type { SearchAnalyticsResponse, Dimension } from "../types";

interface DataTableProps {
    data: SearchAnalyticsResponse | null;
    dimension: Dimension;
    title: string;
}

export function DataTable({ data, dimension, title }: DataTableProps) {
    if (!data || !data.rows || data.rows.length === 0) {
        return (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No data available for the selected period
                    </p>
                </CardContent>
            </Card>
        );
    }

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat('en-US').format(Math.round(num));
    };

    const formatPercent = (num: number) => {
        return (num * 100).toFixed(2) + '%';
    };

    const formatPosition = (num: number) => {
        return num.toFixed(1);
    };

    const getDimensionLabel = (keys: string[] | undefined) => {
        if (!keys || keys.length === 0) return 'N/A';
        return keys[0];
    };

    const isUrl = (text: string) => {
        return text.startsWith('http://') || text.startsWith('https://');
    };

    return (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {title}
                    </CardTitle>
                    <Badge variant="outline">
                        {data.rows.length} {data.rows.length === 1 ? 'result' : 'results'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                    {dimension.charAt(0).toUpperCase() + dimension.slice(1)}
                                </th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                    Clicks
                                </th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                    Impressions
                                </th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                    CTR
                                </th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                                    Position
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map((row, index) => {
                                const label = getDimensionLabel(row.keys);
                                const isLinkable = dimension === 'page' && isUrl(label);
                                
                                return (
                                    <tr
                                        key={index}
                                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                    >
                                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">
                                            <div className="flex items-center gap-2 max-w-md">
                                                {isLinkable ? (
                                                    <a
                                                        href={label}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                                    >
                                                        <span className="truncate">{label}</span>
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                ) : (
                                                    <span className="truncate">{label}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300 font-medium">
                                            {formatNumber(row.clicks)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                            {formatNumber(row.impressions)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                            {formatPercent(row.ctr)}
                                        </td>
                                        <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                                            {formatPosition(row.position)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

