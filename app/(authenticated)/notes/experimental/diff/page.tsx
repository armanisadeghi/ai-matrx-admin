"use client";

/**
 * Experimental Diff System Demo Page
 * 
 * Test environment for the AI-driven text diff system
 */

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import {
  initializeDiffSession,
  addPendingDiffs,
  acceptDiff,
  rejectDiff,
  acceptAllDiffs,
  rejectAllDiffs,
  undoLastAccept,
  markSaved,
  selectDiffState,
  selectPendingDiffs,
  selectAcceptedDiffs,
  selectIsDirty,
  selectCanUndo,
  selectCurrentText,
} from '@/lib/redux/slices/textDiffSlice';
import { parseDiff } from '@/features/text-diff';
import { DiffViewer, DiffControls, DiffHistory } from '@/features/text-diff/components';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, FileText, Upload, AlertCircle } from 'lucide-react';
import { useToastManager } from '@/hooks/useToastManager';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';

const SAMPLE_TEXT = `# AI-Powered Writing Assistant

Welcome to the future of collaborative writing. This system allows you to work seamlessly with AI to improve your content.

## How It Works

1. **Write your content**: Start with your initial draft
2. **Request AI edits**: Ask the AI to improve specific sections
3. **Review changes**: See exactly what the AI suggests changing
4. **Accept or reject**: You maintain full control

## Key Features

- **Precise editing**: AI makes surgical changes, not complete rewrites
- **Version history**: Track all changes and restore any version
- **Diff visualization**: See before/after for every change
- **Smart matching**: Handles whitespace differences intelligently

Try selecting some text and requesting improvements!`;

const SAMPLE_AI_RESPONSE = `Here are some improvements to your content:

SEARCH:
<<<
## How It Works

1. **Write your content**: Start with your initial draft
2. **Request AI edits**: Ask the AI to improve specific sections
3. **Review changes**: See exactly what the AI suggests changing
4. **Accept or reject**: You maintain full control
>>>
REPLACE:
<<<
## How It Works

1. **Write your content**: Begin by creating your initial draft
2. **Request AI assistance**: Ask the AI to refine specific sections
3. **Review suggestions**: Examine each proposed change in detail
4. **Make your decision**: You have complete control over what stays and what goes
>>>

SEARCH:
<<<
Try selecting some text and requesting improvements!
>>>
REPLACE:
<<<
Ready to get started? Select any text and ask for AI-powered improvements!
>>>`;

export default function DiffExperimentalPage() {
  const dispatch = useAppDispatch();
  const toast = useToastManager('diff-demo');
  
  const diffState = useAppSelector(selectDiffState);
  const pendingDiffs = useAppSelector(selectPendingDiffs);
  const acceptedDiffs = useAppSelector(selectAcceptedDiffs);
  const isDirty = useAppSelector(selectIsDirty);
  const canUndo = useAppSelector(selectCanUndo);
  const currentText = useAppSelector(selectCurrentText);
  
  const [aiResponse, setAiResponse] = useState('');
  const [activeTab, setActiveTab] = useState('current');
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize with sample text
  useEffect(() => {
    dispatch(
      initializeDiffSession({
        sourceId: 'demo-note',
        sourceType: 'note',
        initialText: SAMPLE_TEXT,
      })
    );
  }, [dispatch]);

  const handleLoadSampleDiff = () => {
    setAiResponse(SAMPLE_AI_RESPONSE);
    handleProcessAIResponse(SAMPLE_AI_RESPONSE);
  };

  const handleProcessAIResponse = (response: string) => {
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
      
      toast.success(`Diffs parsed successfully. Found ${parseResult.diffs.length} change(s) to review`);
      
      setActiveTab('diffs');
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

  const handleSave = () => {
    dispatch(markSaved());
    toast.success('Changes saved');
  };

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden bg-textured">
      {/* Header */}
      <div className="flex-none border-b border-border bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AI Text Diff System</h1>
                <p className="text-sm text-muted-foreground">
                  Experimental collaborative editing environment
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleLoadSampleDiff}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              <Upload className="h-4 w-4 mr-2" />
              Load Sample Diff
            </Button>
          </div>
        </div>
      </div>

      {/* Controls */}
      {(pendingDiffs.length > 0 || acceptedDiffs.length > 0 || isDirty) && (
        <div className="flex-none px-6 pt-4">
          <DiffControls
            pendingCount={pendingDiffs.length}
            acceptedCount={acceptedDiffs.length}
            rejectedCount={diffState.rejectedDiffs.length}
            isDirty={isDirty}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onSave={handleSave}
            onUndo={handleUndo}
            canUndo={canUndo}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left Panel: Text Views */}
          <Card className="p-4 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="current">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Current
                </TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="original">Original</TabsTrigger>
              </TabsList>
              
              <TabsContent value="current" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full border rounded-lg">
                  <div className="p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {currentText}
                    </pre>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full border rounded-lg">
                  <div className="p-4 prose dark:prose-invert max-w-none">
                    <EnhancedChatMarkdown content={currentText} />
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="original" className="flex-1 overflow-hidden m-0">
                <ScrollArea className="h-full border rounded-lg">
                  <div className="p-4">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {diffState.originalText}
                    </pre>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Right Panel: Diffs & Controls */}
          <div className="flex flex-col gap-4 overflow-hidden">
            {/* Pending Diffs */}
            {pendingDiffs.length > 0 ? (
              <Card className="p-4 flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-semibold mb-3">Pending Changes</h3>
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
                <div className="text-center text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No pending changes</p>
                  <p className="text-xs mt-1">
                    Load a sample diff or paste AI response below
                  </p>
                </div>
              </Card>
            )}

            {/* AI Response Input */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">AI Response</h3>
              <Textarea
                value={aiResponse}
                onChange={(e) => setAiResponse(e.target.value)}
                placeholder="Paste AI diff response here..."
                className="min-h-[120px] font-mono text-xs"
              />
              <Button
                onClick={() => handleProcessAIResponse(aiResponse)}
                disabled={!aiResponse.trim() || isProcessing}
                className="mt-3 w-full"
              >
                Process Diff
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

