// features/transcripts/components/TranscriptsSidebar.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useTranscriptsContext } from '../context/TranscriptsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
    FileText, 
    Search, 
    Plus, 
    Folder,
    Clock,
    Video,
    Mic,
    Users,
    FileAudio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Transcript } from '../types';

interface TranscriptsSidebarProps {
    onCreateTranscript?: () => void;
}

export function TranscriptsSidebar({ onCreateTranscript }: TranscriptsSidebarProps) {
    const { transcripts, activeTranscript, setActiveTranscript } = useTranscriptsContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

    // Group transcripts by folder
    const folderGroups = useMemo(() => {
        const groups = new Map<string, Transcript[]>();
        
        transcripts.forEach(transcript => {
            const folder = transcript.folder_name || 'Transcripts';
            if (!groups.has(folder)) {
                groups.set(folder, []);
            }
            groups.get(folder)!.push(transcript);
        });

        return Array.from(groups.entries()).map(([folder, items]) => ({
            folder,
            transcripts: items,
            count: items.length,
        }));
    }, [transcripts]);

    // Filter transcripts
    const filteredTranscripts = useMemo(() => {
        let filtered = transcripts;

        if (selectedFolder) {
            filtered = filtered.filter(t => t.folder_name === selectedFolder);
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(term) ||
                t.description.toLowerCase().includes(term) ||
                t.tags.some(tag => tag.toLowerCase().includes(term))
            );
        }

        return filtered;
    }, [transcripts, selectedFolder, searchTerm]);

    const getSourceIcon = (sourceType: string) => {
        switch (sourceType) {
            case 'audio':
                return <FileAudio className="h-4 w-4" />;
            case 'video':
                return <Video className="h-4 w-4" />;
            case 'meeting':
                return <Users className="h-4 w-4" />;
            case 'interview':
                return <Mic className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Transcripts
                    </h2>
                    <Button
                        size="sm"
                        onClick={onCreateTranscript}
                        className="h-8"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        New
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search transcripts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Folders */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <ScrollArea className="h-32">
                    <div className="space-y-1">
                        <button
                            onClick={() => setSelectedFolder(null)}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                !selectedFolder
                                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <Folder className="h-4 w-4" />
                                All Transcripts
                            </span>
                            <Badge variant="secondary" className="text-xs">
                                {transcripts.length}
                            </Badge>
                        </button>

                        {folderGroups.map(({ folder, count }) => (
                            <button
                                key={folder}
                                onClick={() => setSelectedFolder(folder)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                                    selectedFolder === folder
                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <Folder className="h-4 w-4" />
                                    {folder}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                    {count}
                                </Badge>
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Transcripts List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {filteredTranscripts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                            {searchTerm ? 'No transcripts found' : 'No transcripts yet'}
                        </div>
                    ) : (
                        filteredTranscripts.map(transcript => (
                            <button
                                key={transcript.id}
                                onClick={() => setActiveTranscript(transcript)}
                                className={cn(
                                    "w-full p-3 rounded-md text-left transition-colors group",
                                    activeTranscript?.id === transcript.id
                                        ? "bg-blue-50 border-l-2 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400"
                                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    <div className="mt-0.5 text-gray-500 dark:text-gray-400">
                                        {getSourceIcon(transcript.source_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                            {transcript.title}
                                        </h3>
                                        {transcript.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                                {transcript.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            {transcript.metadata?.duration && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDuration(transcript.metadata.duration)}
                                                </span>
                                            )}
                                            {transcript.metadata?.segmentCount && (
                                                <span>
                                                    {transcript.metadata.segmentCount} segments
                                                </span>
                                            )}
                                        </div>
                                        {transcript.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {transcript.tags.slice(0, 2).map(tag => (
                                                    <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                                {transcript.tags.length > 2 && (
                                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                                        +{transcript.tags.length - 2}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

