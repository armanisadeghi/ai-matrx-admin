"use client";

/**
 * AI-Assisted Note Editing Page
 * 
 * Route: /notes/ai-edit
 * Full note editor with AI diff integration
 */

import React from 'react';
import { useNotesContext } from '@/features/notes/context/NotesContext';
import { NoteDiffEditor } from '@/features/notes/components/NoteDiffEditor';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AIEditNotePage() {
  const router = useRouter();
  const { activeNote, updateNote } = useNotesContext();

  if (!activeNote) {
    return (
      <div className="h-[calc(100vh-2.5rem)] flex flex-col items-center justify-center bg-textured">
        <Card className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No Note Selected</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Select or create a note to use AI-assisted editing
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
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg font-semibold">{activeNote.label}</h1>
                <p className="text-xs text-muted-foreground">
                  AI-Assisted Editing
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Select text and right-click for AI improvements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden p-6">
        <NoteDiffEditor
          note={activeNote}
          onUpdate={updateNote}
        />
      </div>
    </div>
  );
}

