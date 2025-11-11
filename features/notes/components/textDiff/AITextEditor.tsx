// features/notes/components/textDiff/AITextEditor.tsx

'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, Sparkles } from 'lucide-react';
import { useTextDiff } from '../../hooks/useTextDiff';
import { DiffReviewPanel } from './DiffReviewPanel';
import { SaveIndicator, FloatingSaveButton } from './SaveIndicator';
import { VersionHistoryModal } from './VersionHistoryModal';
import { cn } from '@/lib/utils';

interface AITextEditorProps {
    noteId: string;
    initialContent: string;
    onContentChange?: (content: string) => void;
    className?: string;
    placeholder?: string;
}

export function AITextEditor({
    noteId,
    initialContent,
    onContentChange,
    className,
    placeholder = 'Start writing...',
}: AITextEditorProps) {
    const [localContent, setLocalContent] = useState(initialContent);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const {
        isDirty,
        pendingDiffs,
        currentContent,
        processAIResponse,
        acceptAll,
        saveChanges,
        discardChanges,
    } = useTextDiff({
        noteId,
        content: localContent,
        onContentChange: (newContent) => {
            setLocalContent(newContent);
            if (onContentChange) {
                onContentChange(newContent);
            }
        },
    });

    // Demo function - in real implementation, this would call your AI service
    const handleAIEdit = async () => {
        // Example AI response with diffs
        const mockAIResponse = `
I've analyzed your text and here are my suggestions:

\`\`\`diff
- Hello world
+ Hello, world!
\`\`\`

\`\`\`diff
- This is a test.
+ This is an example.
\`\`\`

\`\`\`replace
START_LINE: 1
END_LINE: 1
---
This is the new first line content
\`\`\`
        `;

        const result = processAIResponse(mockAIResponse);
        console.log('AI Response processed:', result);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveChanges();
        } finally {
            setIsSaving(false);
        }
    };

    const handleAcceptAll = async () => {
        setIsSaving(true);
        try {
            await acceptAll();
        } finally {
            setIsSaving(false);
        }
    };

    const hasPendingDiffs = pendingDiffs.length > 0;

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            {/* Header with controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <SaveIndicator
                        isDirty={isDirty}
                        isSaving={isSaving}
                        onSave={handleSave}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowVersionHistory(true)}
                        className="gap-1"
                    >
                        <Clock className="h-3 w-3" />
                        History
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleAIEdit}
                        className="gap-1"
                    >
                        <Sparkles className="h-3 w-3" />
                        AI Edit (Demo)
                    </Button>
                </div>
            </div>

            {/* Main editor area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Text editor */}
                <Card className="p-4">
                    <Textarea
                        value={currentContent}
                        onChange={(e) => {
                            setLocalContent(e.target.value);
                            if (onContentChange) {
                                onContentChange(e.target.value);
                            }
                        }}
                        placeholder={placeholder}
                        className="min-h-[500px] resize-none font-mono text-sm"
                    />
                </Card>

                {/* Diff review panel */}
                {hasPendingDiffs && (
                    <DiffReviewPanel
                        noteId={noteId}
                        onSaveAll={handleAcceptAll}
                    />
                )}
            </div>

            {/* Floating save button */}
            <FloatingSaveButton
                isDirty={isDirty}
                isSaving={isSaving}
                onSave={handleSave}
            />

            {/* Version history modal */}
            <VersionHistoryModal
                noteId={noteId}
                currentContent={currentContent}
                open={showVersionHistory}
                onOpenChange={setShowVersionHistory}
                onRestore={() => {
                    // Refresh content after restore
                    window.location.reload();
                }}
            />
        </div>
    );
}
