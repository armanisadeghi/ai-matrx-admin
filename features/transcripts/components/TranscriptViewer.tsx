// features/transcripts/components/TranscriptViewer.tsx
'use client';

import React from 'react';
import { useTranscriptsContext } from '../context/TranscriptsContext';
import AdvancedTranscriptViewer from '@/components/mardown-display/blocks/transcripts/AdvancedTranscriptViewer';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import type { TranscriptSegment } from '../types';

export function TranscriptViewer() {
    const { activeTranscript, updateTranscript } = useTranscriptsContext();

    if (!activeTranscript) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Transcript Selected
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Select a transcript from the sidebar or create a new one
                    </p>
                </div>
            </div>
        );
    }

    const handleTitleChange = (title: string) => {
        updateTranscript(activeTranscript.id, { title });
    };

    const handleDescriptionChange = (description: string) => {
        updateTranscript(activeTranscript.id, { description });
    };

    const handleUpdateSegments = (segments: TranscriptSegment[]) => {
        updateTranscript(activeTranscript.id, { segments });
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="border-b border-border p-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                        Title
                    </Label>
                    <Input
                        id="title"
                        value={activeTranscript.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="text-lg font-semibold"
                        placeholder="Transcript title..."
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">
                        Description
                    </Label>
                    <Textarea
                        id="description"
                        value={activeTranscript.description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        className="resize-none"
                        rows={2}
                        placeholder="Add a description..."
                    />
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500 dark:text-gray-400">
                    <Badge variant="outline">
                        {activeTranscript.source_type}
                    </Badge>
                    {activeTranscript.metadata?.segmentCount && (
                        <span>{activeTranscript.metadata.segmentCount} segments</span>
                    )}
                    {activeTranscript.metadata?.wordCount && (
                        <span>{activeTranscript.metadata.wordCount.toLocaleString()} words</span>
                    )}
                    {activeTranscript.metadata?.speakers && activeTranscript.metadata.speakers.length > 0 && (
                        <span>{activeTranscript.metadata.speakers.length} speakers</span>
                    )}
                </div>
            </div>

            {/* Transcript Content */}
            <div className="flex-1 overflow-auto">
                <AdvancedTranscriptViewer
                    content=""
                    hideTitle={true}
                    onUpdateTranscript={handleUpdateSegments}
                    readOnly={false}
                />
            </div>
        </div>
    );
}

