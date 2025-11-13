"use client";

/**
 * Experimental Diff System - Integrated with Real Notes
 * 
 * Route: /notes/experimental/diff
 * 
 * Features:
 * - Works with real notes from notes context
 * - Full note editor with editable title, folder, tags
 * - AI diff visualization and acceptance
 * - Real save to database with version tracking
 * - Actual integration with notes system
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import {
  initializeDiffSession,
  addPendingDiffs,
  acceptDiff,
  rejectDiff,
  acceptAllDiffs,
  rejectAllDiffs,
  undoLastAccept,
  markSaved,
  updateCurrentText,
  selectDiffState,
  selectPendingDiffs,
  selectIsDirty,
  selectCanUndo,
  selectCurrentText,
  selectDiffError,
} from '@/lib/redux/slices/textDiffSlice';
import { parseDiff } from '@/features/text-diff';
import { DiffViewer, DiffControls } from '@/features/text-diff/components';
import { NoteEditor } from '@/features/notes/components/NoteEditor';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Upload, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToastManager } from '@/hooks/useToastManager';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const SAMPLE_AI_RESPONSE = `Here are some improvements to your content:

SEARCH:
<<<
## How It Works

1. **Write your content**: Start with your initial draft
2. **Request AI edits**: Ask the AI to improve specific sections
>>>
REPLACE:
<<<
## How It Works

1. **Write your content**: Begin by creating your initial draft
2. **Request AI assistance**: Ask the AI to refine specific sections
>>>`;

export default function DiffExperimentalPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToastManager('diff-experimental');
  
  const { notes, activeNote, setActiveNote, updateNote } = useNotesContext();
  
  const diffState = useAppSelector(selectDiffState);
  const pendingDiffs = useAppSelector(selectPendingDiffs);
  const isDirty = useAppSelector(selectIsDirty);
  const canUndo = useAppSelector(selectCanUndo);
  const currentText = useAppSelector(selectCurrentText);
  const diffError = useAppSelector(selectDiffError);
  
  const [aiResponse, setAiResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize diff session when active note changes
  useEffect(() => {
    if (activeNote) {
      dispatch(
        initializeDiffSession({
          sourceId: activeNote.id,
          sourceType: 'note',
          initialText: activeNote.content,
        })
      );
    }
  }, [activeNote?.id, dispatch]);

  // Sync current text back to diff state when user edits in NoteEditor
  useEffect(() => {
    if (activeNote && currentText !== activeNote.content) {
      dispatch(updateCurrentText(activeNote.content));
    }
  }, [activeNote?.content]);

  const handleLoadSampleDiff = () => {
    if (!activeNote) {
      toast.warning('Select a note first');
      return;
    }
    setAiResponse(SAMPLE_AI_RESPONSE);
    handleProcessAIResponse(SAMPLE_AI_RESPONSE);
  };

  const handleProcessAIResponse = (response: string) => {
    if (!activeNote) {
      toast.error('No note selected');
      return;
    }

    setIsProcessing(true);
    
    try {
      const parseResult = parseDiff(response);
      
      if (!parseResult.success) {
        toast.error(`Failed to parse diff: ${parseResult.error}`);
        return;
      }
      
      if (parseResult.diffs.length === 0) {
        toast.warning('No diffs found in the AI response');
        return;
      }
      
      dispatch(addPendingDiffs(parseResult.diffs));
      
      toast.success(`Parsed ${parseResult.diffs.length} change(s) successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error processing response');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAccept = (diffId: string) => {
    dispatch(acceptDiff(diffId));
    toast.success('Change accepted');
  };

  const handleReject = (diffId: string) => {
    dispatch(rejectDiff({ diffId }));
    toast.info('Change rejected');
  };

  const handleAcceptAll = () => {
    dispatch(acceptAllDiffs());
    toast.success('All changes accepted');
  };

  const handleRejectAll = () => {
    dispatch(rejectAllDiffs());
    toast.info('All changes rejected');
  };

  const handleUndo = () => {
    dispatch(undoLastAccept());
    toast.info('Undid last change');
  };

  const handleSave = async () => {
    if (!activeNote) return;
    
    setIsSaving(true);
    try {
      // Save with AI metadata
      const { error } = await supabase
        .from('notes')
        .update({
          content: currentText,
          metadata: {
            ...activeNote.metadata,
            last_change_source: 'ai',
            last_change_type: 'ai_diff',
            last_diff_metadata: {
              diffsApplied: diffState.acceptedDiffs.length,
              timestamp: new Date().toISOString(),
            },
          },
        })
        .eq('id', activeNote.id);

      if (error) throw error;
      
      // Update local state
      updateNote(activeNote.id, { content: currentText });
      dispatch(markSaved());
      
      toast.success('Changes saved with version history');
    } catch (error) {
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle note updates from NoteEditor
  const handleNoteUpdate = (noteId: string, updates: Partial<any>) => {
    updateNote(noteId, updates);
    if (updates.content) {
      dispatch(updateCurrentText(updates.content));
    }
  };

  if (!activeNote) {
    return (
      <div className="h-[calc(100vh-2.5rem)] flex flex-col items-center justify-center bg-textured">
        <Card className="p-8 text-center max-w-md">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No Note Selected</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Go to the notes page and select a note to try the AI diff system
          </p>
          <Button onClick={() => router.push('/notes')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go to Notes
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
      {/* Header */}
      <div className="flex-none border-b border-border bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/notes')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Notes
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h1 className="text-lg font-bold">AI Diff System (Experimental)</h1>
              </div>
            </div>
            
            <Button
              onClick={handleLoadSampleDiff}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Diff
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {diffError && (
        <div className="flex-none px-6 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{diffError}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Diff Controls */}
      {(pendingDiffs.length > 0 || isDirty) && (
        <div className="flex-none px-6 pt-4">
          <DiffControls
            pendingCount={pendingDiffs.length}
            acceptedCount={diffState.acceptedDiffs.length}
            rejectedCount={diffState.rejectedDiffs.length}
            isDirty={isDirty}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onSave={handleSave}
            onUndo={handleUndo}
            canUndo={canUndo}
            isProcessing={isProcessing || isSaving}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left: Note Editor */}
          <div className="flex flex-col h-full overflow-hidden">
            <NoteEditor
              note={activeNote}
              onUpdate={handleNoteUpdate}
              allNotes={notes}
              className="flex-1"
            />
          </div>

          {/* Right: Diffs Panel */}
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            {pendingDiffs.length > 0 ? (
              <Card className="p-4 flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Suggested Changes ({pendingDiffs.length})
                </h3>
                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {pendingDiffs.map((diff) => (
                      <DiffViewer
                        key={diff.id}
                        diff={diff}
                        onAccept={handleAccept}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            ) : (
              <Card className="p-6 flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground max-w-sm">
                  <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-2">No AI Changes Pending</p>
                  <p className="text-xs mb-4">
                    Click "Load Sample Diff" to test, or paste AI response below
                  </p>
                </div>
              </Card>
            )}

            {/* AI Response Input */}
            <Card className="p-4 flex-none">
              <h3 className="text-sm font-semibold mb-3">Paste AI Diff Response</h3>
              <Textarea
                value={aiResponse}
                onChange={(e) => setAiResponse(e.target.value)}
                placeholder="Paste AI diff response here..."
                className="min-h-[120px] font-mono text-xs mb-3"
              />
              <Button
                onClick={() => handleProcessAIResponse(aiResponse)}
                disabled={!aiResponse.trim() || isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Process AI Response'}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
