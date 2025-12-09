'use client';

import React from 'react';
import { useTranscriptsContext } from '../context/TranscriptsContext';
import { Button } from '@/components/ui/button';
import {
    Save,
    Copy,
    Trash2,
    RefreshCw,
    Download,
    Share2,
    MoreHorizontal,
    Plus
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToastManager } from '@/hooks/useToastManager';
import { cn } from '@/lib/utils';

interface TranscriptToolbarProps {
    className?: string;
    onCreateNew?: () => void;
}

export function TranscriptToolbar({ className, onCreateNew }: TranscriptToolbarProps) {
    const {
        activeTranscript,
        copyTranscript,
        deleteTranscript,
        refreshTranscripts
    } = useTranscriptsContext();
    const toast = useToastManager('transcripts');

    const handleCopy = async () => {
        if (!activeTranscript) return;
        try {
            await copyTranscript(activeTranscript.id);
            toast.success('Transcript copied');
        } catch (error) {
            console.error('Error copying transcript:', error);
            toast.error('Failed to copy transcript');
        }
    };

    const handleDelete = async () => {
        if (!activeTranscript) return;
        if (!confirm(`Delete "${activeTranscript.title}"?`)) return;

        try {
            await deleteTranscript(activeTranscript.id);
            toast.success('Transcript deleted');
        } catch (error) {
            console.error('Error deleting transcript:', error);
            toast.error('Failed to delete transcript');
        }
    };

    const handleRefresh = async () => {
        try {
            await refreshTranscripts();
            toast.success('Transcripts refreshed');
        } catch (error) {
            console.error('Error refreshing transcripts:', error);
            toast.error('Failed to refresh');
        }
    };

    const handleExport = () => {
        if (!activeTranscript) return;

        // Create a downloadable text file
        const text = activeTranscript.segments
            .map(seg => `[${seg.timecode}]${seg.speaker ? ` ${seg.speaker}:` : ''} ${seg.text}`)
            .join('\n\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTranscript.title}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Transcript exported');
    };

    return (
        <div className={cn(
            "flex items-center justify-between px-4 py-2 border-b border-border bg-white dark:bg-gray-800",
            className
        )}>
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={onCreateNew}>
                    <Plus className="h-4 w-4 mr-1" />
                    New Transcript
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefresh}
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    disabled={!activeTranscript}
                >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={!activeTranscript}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export as Text
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleDelete}
                            className="text-red-600 dark:text-red-400"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
