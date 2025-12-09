'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
    RefreshCw,
    Plus,
    Download,
    MoreHorizontal,
    Copy,
    Trash2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranscriptsContext } from '../context/TranscriptsContext';
import { useToastManager } from '@/hooks/useToastManager';
import { cn } from '@/lib/utils';

interface TranscriptsHeaderProps {
    onCreateNew: () => void;
    onDeleteTranscript: () => void;
    className?: string;
}

export function TranscriptsHeader({ 
    onCreateNew, 
    onDeleteTranscript,
    className 
}: TranscriptsHeaderProps) {
    const {
        activeTranscript,
        copyTranscript,
        refreshTranscripts,
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
        <div className={cn("flex items-center gap-2", className)}>
            <Button size="sm" onClick={onCreateNew} className="h-8">
                <Plus className="h-4 w-4 mr-1.5" />
                New Transcript
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-8"
            >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh
            </Button>

            <div className="flex-1" />

            {activeTranscript && (
                <>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-8 hidden sm:flex"
                    >
                        <Copy className="h-4 w-4 mr-1.5" />
                        Copy
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleCopy} className="sm:hidden">
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Transcript
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExport}>
                                <Download className="h-4 w-4 mr-2" />
                                Export as Text
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={onDeleteTranscript}
                                className="text-red-600 dark:text-red-400"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </>
            )}
        </div>
    );
}

