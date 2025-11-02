// features/quick-actions/components/QuickDataSheet.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UserTableViewer from '@/components/user-generated-table-data/UserTableViewer';
import { supabase } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface QuickDataSheetProps {
    onClose?: () => void;
    className?: string;
}

interface UserTable {
    id: string;
    table_name: string;
    description: string;
    row_count: number;
    field_count: number;
}

/**
 * QuickDataSheet - Access user-generated tables
 * Provides quick access to data tables without losing context
 */
export function QuickDataSheet({ onClose, className }: QuickDataSheetProps) {
    const [tables, setTables] = useState<UserTable[]>([]);
    const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load tables on mount
    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const { data, error: rpcError } = await supabase.rpc('get_user_tables');
            
            if (rpcError) throw rpcError;
            if (!data.success) throw new Error(data.error || 'Failed to load tables');
            
            const tablesList = data.tables || [];
            setTables(tablesList);
            
            // Auto-select first table if available
            if (tablesList.length > 0 && !selectedTableId) {
                setSelectedTableId(tablesList[0].id);
            }
        } catch (err) {
            console.error('Error loading tables:', err);
            setError(err instanceof Error ? err.message : 'Failed to load tables');
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (tableId: string) => {
        setSelectedTableId(tableId);
    };

    if (loading) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading tables...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full gap-3", className)}>
                <div className="text-sm text-red-500">{error}</div>
                <Button variant="outline" size="sm" onClick={loadTables}>
                    Try Again
                </Button>
            </div>
        );
    }

    if (tables.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full gap-3", className)}>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">No tables found</div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/data', '_blank')}
                >
                    Create a Table
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Compact Header with Table Selector */}
            <div className="flex items-center gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <Select
                    value={selectedTableId || undefined}
                    onValueChange={handleTableChange}
                >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Select a table" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                        {tables.map((table) => (
                            <SelectItem key={table.id} value={table.id} className="text-xs">
                                <div className="flex flex-col">
                                    <span className="font-medium">{table.table_name}</span>
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                        {table.row_count} rows • {table.field_count} fields
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open('/data', '_blank')}
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open in New Tab</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Table Viewer - Takes full remaining space */}
            <div className="flex-1 overflow-hidden">
                {selectedTableId && (
                    <UserTableViewer
                        tableId={selectedTableId}
                        showTableSelector={false}
                    />
                )}
            </div>
        </div>
    );
}

