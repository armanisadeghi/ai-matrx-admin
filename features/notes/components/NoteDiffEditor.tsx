"use client";

/**
 * NoteDiffEditor Component
 * 
 * Enhanced note editor with AI diff integration
 * Handles: text editing, AI updates via context menu, diff visualization, save with versioning
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import {
  initializeDiffSession,
  selectDiffState,
  selectPendingDiffs,
  selectIsDirty,
  selectCanUndo,
  selectCurrentText,
  updateCurrentText,
  markSaved,
  selectDiffError,
} from '@/lib/redux/slices/textDiffSlice';
import { useDiffHandler } from '@/features/text-diff';
import { DiffViewer, DiffControls } from '@/features/text-diff/components';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Sparkles, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Note } from '../types';
import { supabase } from '@/utils/supabase/client';

interface NoteDiffEditorProps {
  note: Note;
  onUpdate: (noteId: string, updates: Partial<Note>) => void;
  className?: string;
}

export function NoteDiffEditor({ note, onUpdate, className }: NoteDiffEditorProps) {
  const dispatch = useAppDispatch();
  const diffState = useAppSelector(selectDiffState);
  const pendingDiffs = useAppSelector(selectPendingDiffs);
  const isDirty = useAppSelector(selectIsDirty);
  const canUndo = useAppSelector(selectCanUndo);
  const currentText = useAppSelector(selectCurrentText);
  const diffError = useAppSelector(selectDiffError);
  
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [showDiffPanel, setShowDiffPanel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const diffHandler = useDiffHandler({
    onSaveCallback: async (text) => {
      // Save to database with AI metadata
      const { error } = await supabase
        .from('notes')
        .update({
          content: text,
          metadata: {
            ...note.metadata,
            last_change_source: 'ai',
            last_change_type: 'ai_diff',
            last_diff_metadata: {
              diffsApplied: diffState.acceptedDiffs.length,
              timestamp: new Date().toISOString(),
            },
          },
        })
        .eq('id', note.id);

      if (error) throw error;
      
      // Update parent component
      onUpdate(note.id, { content: text });
    },
    showToasts: true,
    toastContext: 'note-diff-editor',
  });

  // Initialize diff session when note changes
  useEffect(() => {
    if (note) {
      diffHandler.initialize(note.id, 'note', note.content);
    }
  }, [note.id]);

  // Update current text when user types
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch(updateCurrentText(e.target.value));
  };

  // Handle AI response (called from context menu or external trigger)
  const handleAIResponse = useCallback((response: string) => {
    setIsAIProcessing(true);
    const result = diffHandler.processAIResponse(response);
    setIsAIProcessing(false);
    
    if (result.success) {
      setShowDiffPanel(true);
    }
  }, [diffHandler]);

  // Expose handleAIResponse globally so context menu can call it
  useEffect(() => {
    (window as any).__noteEditorHandleAIDiff = handleAIResponse;
    return () => {
      delete (window as any).__noteEditorHandleAIDiff;
    };
  }, [handleAIResponse]);

  // Handle save
  const handleSave = async () => {
    await diffHandler.save(currentText);
  };

  // Handle manual user save (without AI)
  const handleManualSave = async () => {
    const { error } = await supabase
      .from('notes')
      .update({
        content: currentText,
        metadata: {
          ...note.metadata,
          last_change_source: 'user',
          last_change_type: 'manual_edit',
        },
      })
      .eq('id', note.id);

    if (!error) {
      dispatch(markSaved());
      onUpdate(note.id, { content: currentText });
    }
  };

  return (
    <div className={cn('flex flex-col h-full gap-4', className)}>
      {/* Error Display */}
      {diffError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{diffError}</AlertDescription>
        </Alert>
      )}

      {/* Diff Controls (when there are pending changes) */}
      {(pendingDiffs.length > 0 || isDirty) && (
        <DiffControls
          pendingCount={pendingDiffs.length}
          acceptedCount={diffState.acceptedDiffs.length}
          rejectedCount={diffState.rejectedDiffs.length}
          isDirty={isDirty}
          onAcceptAll={diffHandler.acceptAll}
          onRejectAll={diffHandler.rejectAll}
          onSave={handleSave}
          onUndo={diffHandler.undo}
          canUndo={canUndo}
          isProcessing={isAIProcessing}
        />
      )}

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Editor */}
        <Card className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Content</h3>
            {isDirty && !pendingDiffs.length && (
              <Button size="sm" onClick={handleManualSave}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
            )}
          </div>
          <Textarea
            ref={textareaRef}
            value={currentText}
            onChange={handleTextChange}
            className="flex-1 resize-none font-mono text-sm"
            placeholder="Start typing..."
          />
        </Card>

        {/* Right: Diffs (when active) */}
        {showDiffPanel && pendingDiffs.length > 0 ? (
          <Card className="p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Suggestions
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDiffPanel(false)}
              >
                Hide
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {pendingDiffs.map((diff) => (
                  <DiffViewer
                    key={diff.id}
                    diff={diff}
                    onAccept={diffHandler.accept}
                    onReject={diffHandler.reject}
                  />
                ))}
              </div>
            </ScrollArea>
          </Card>
        ) : (
          <Card className="p-6 flex items-center justify-center text-center text-muted-foreground">
            <div>
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">AI Assist</p>
              <p className="text-xs mt-1">
                Select text and right-click to request AI improvements
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

