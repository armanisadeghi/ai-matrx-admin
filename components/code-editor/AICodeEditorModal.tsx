'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Code2,
  Eye,
  FileCode,
} from 'lucide-react';
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { parseCodeEdits, validateEdits } from '@/utils/code-editor/parseCodeEdits';
import { applyCodeEdits } from '@/utils/code-editor/applyCodeEdits';
import { formatDiff, getDiffStats } from '@/utils/code-editor/generateDiff';
import { getCodeEditorPromptId } from '@/utils/code-editor/codeEditorPrompts';
import CodeBlock from '@/components/mardown-display/code/CodeBlock';

export interface AICodeEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCode: string;
  language: string;
  promptId?: string; // Optional: explicit prompt ID
  promptContext?: 'prompt-app-ui' | 'generic'; // Or use context to auto-select
  onCodeChange: (newCode: string) => void;
  title?: string;
  description?: string;
}

type EditorState = 'input' | 'processing' | 'review' | 'applying' | 'complete' | 'error';

export function AICodeEditorModal({
  open,
  onOpenChange,
  currentCode,
  language,
  promptId,
  promptContext = 'generic',
  onCodeChange,
  title = 'AI Code Editor',
  description = 'Describe the changes you want to make to the code',
}: AICodeEditorModalProps) {
  // Use explicit promptId if provided, otherwise use context
  const effectivePromptId = promptId || getCodeEditorPromptId(promptContext);
  const [userInstructions, setUserInstructions] = useState('');
  const [state, setState] = useState<EditorState>('input');
  const [parsedEdits, setParsedEdits] = useState<ReturnType<typeof parseCodeEdits> | null>(null);
  const [modifiedCode, setModifiedCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rawAIResponse, setRawAIResponse] = useState('');

  const { execute, isExecuting, streamingText, error: execError, reset } = usePromptExecution();

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setUserInstructions('');
      setState('input');
      setParsedEdits(null);
      setModifiedCode('');
      setErrorMessage('');
      setRawAIResponse('');
      reset();
    }
  }, [open, reset]);

  // Parse response when streaming completes
  useEffect(() => {
    if (streamingText && !isExecuting && state === 'processing') {
      // Save raw response FIRST - always preserve this
      setRawAIResponse(streamingText);
      
      // Response complete, parse it
      const parsed = parseCodeEdits(streamingText);
      setParsedEdits(parsed);

      if (!parsed.success) {
        setState('error');
        // Show detailed error with parse details
        let errorMsg = parsed.error || 'Failed to parse AI response';
        
        if (parsed.parseDetails) {
          errorMsg += `\n\nParse Details:`;
          errorMsg += `\n- SEARCH blocks found: ${parsed.parseDetails.foundSearchBlocks}`;
          errorMsg += `\n- REPLACE blocks found: ${parsed.parseDetails.foundReplaceBlocks}`;
          
          if (parsed.parseDetails.warnings.length > 0) {
            errorMsg += `\n\nWarnings:`;
            parsed.parseDetails.warnings.forEach((w, i) => {
              errorMsg += `\n${i + 1}. ${w}`;
            });
          }
        }
        
        setErrorMessage(errorMsg);
        return;
      }

      // Validate edits against current code
      const validation = validateEdits(currentCode, parsed.edits);
      
      // Show warnings if using fuzzy matching
      if (validation.warnings.length > 0) {
        console.log('⚠️ Fuzzy Matching Applied:');
        validation.warnings.forEach(w => console.log(`  - ${w}`));
      }
      
      if (!validation.valid) {
        setState('error');
        let errorMsg = `⚠️ VALIDATION FAILED\n\n`;
        errorMsg += `The AI generated ${parsed.edits.length} edit${parsed.edits.length !== 1 ? 's' : ''}, but some SEARCH patterns don't match the current code.\n\n`;
        
        if (validation.warnings.length > 0) {
          errorMsg += `✓ ${validation.warnings.length} edit${validation.warnings.length !== 1 ? 's' : ''} will use fuzzy matching (whitespace-tolerant)\n`;
        }
        
        errorMsg += `✗ ${validation.errors.length} edit${validation.errors.length !== 1 ? 's' : ''} failed validation\n\n`;
        errorMsg += `${'═'.repeat(70)}\n`;
        validation.errors.forEach((err) => {
          errorMsg += err;
          errorMsg += `\n`;
        });
        setErrorMessage(errorMsg);
        return;
      }

      // Apply edits to generate preview
      const result = applyCodeEdits(currentCode, parsed.edits);
      
      // Log warnings
      if (result.warnings.length > 0) {
        console.log('✓ Applied with fuzzy matching:');
        result.warnings.forEach(w => console.log(`  - ${w}`));
      }
      
      if (!result.success) {
        setState('error');
        let errorMsg = `Error Applying Edits:\n\n`;
        result.errors.forEach((err, i) => {
          errorMsg += `${i + 1}. ${err}\n`;
        });
        setErrorMessage(errorMsg);
        return;
      }

      setModifiedCode(result.code || '');
      setState('review');
    }
  }, [streamingText, isExecuting, state, currentCode]);

  const handleSubmit = async () => {
    if (!userInstructions.trim()) return;

    setState('processing');

    try {
      await execute({
        promptId: effectivePromptId,
        variables: {
          current_code: {
            type: 'hardcoded',
            value: currentCode,
          },
        },
        userInput: userInstructions, // Add user's instructions as additional message
        modelConfig: {
          stream: true,
        },
        onError: (error) => {
          setState('error');
          setErrorMessage(error.message);
        },
      });
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleApplyChanges = () => {
    setState('applying');
    
    // Apply the changes
    onCodeChange(modifiedCode);
    
    setState('complete');
    
    // Close modal after a brief delay
    setTimeout(() => {
      onOpenChange(false);
    }, 1500);
  };

  const handleCancel = () => {
    if (state === 'processing') {
      // Can't cancel during processing in this implementation
      return;
    }
    onOpenChange(false);
  };

  const diffStats = modifiedCode ? getDiffStats(currentCode, modifiedCode) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Stage */}
          {state === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instructions">What changes would you like to make?</Label>
                <Textarea
                  id="instructions"
                  value={userInstructions}
                  onChange={(e) => setUserInstructions(e.target.value)}
                  placeholder="Example: Add a loading spinner to the submit button and disable it while processing"
                  rows={4}
                  className="resize-none"
                />
              </div>

              <Alert>
                <Code2 className="w-4 h-4" />
                <AlertDescription>
                  The AI will analyze your code and provide precise changes using SEARCH/REPLACE blocks.
                  You'll be able to review all changes before applying them.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Processing Stage */}
          {state === 'processing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    AI is analyzing your code and generating changes...
                  </p>
                </div>
              </div>

              {streamingText && (
                <div className="border rounded-lg p-4 bg-muted/50 max-h-[400px] overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">Live Response:</p>
                  <pre className="text-sm whitespace-pre-wrap">{streamingText}</pre>
                </div>
              )}
            </div>
          )}

          {/* Review Stage */}
          {state === 'review' && parsedEdits && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Review Changes</h3>
                  <p className="text-sm text-muted-foreground">
                    {parsedEdits.edits.length} change{parsedEdits.edits.length !== 1 ? 's' : ''} proposed
                  </p>
                </div>
                {diffStats && (
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      +{diffStats.additions} additions
                    </Badge>
                    <Badge variant="outline" className="text-red-600 border-red-600">
                      -{diffStats.deletions} deletions
                    </Badge>
                  </div>
                )}
              </div>

              {parsedEdits.explanation && (
                <Alert>
                  <AlertDescription>{parsedEdits.explanation}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="diff" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="diff">
                    <Eye className="w-4 h-4 mr-2" />
                    Diff View
                  </TabsTrigger>
                  <TabsTrigger value="before">
                    <FileCode className="w-4 h-4 mr-2" />
                    Before
                  </TabsTrigger>
                  <TabsTrigger value="after">
                    <FileCode className="w-4 h-4 mr-2" />
                    After
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="diff" className="space-y-2">
                  <CodeBlock
                    code={formatDiff(currentCode, modifiedCode)}
                    language="diff"
                    showLineNumbers={true}
                  />
                </TabsContent>

                <TabsContent value="before">
                  <CodeBlock
                    code={currentCode}
                    language={language}
                    showLineNumbers={true}
                  />
                </TabsContent>

                <TabsContent value="after">
                  <CodeBlock
                    code={modifiedCode}
                    language={language}
                    showLineNumbers={true}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Applying Stage */}
          {state === 'applying' && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">Applying changes...</p>
              </div>
            </div>
          )}

          {/* Complete Stage */}
          {state === 'complete' && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <p className="text-sm font-medium">Changes applied successfully!</p>
              </div>
            </div>
          )}

          {/* Error Stage */}
          {state === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-semibold">Error Parsing AI Response</p>
                  <pre className="text-xs mt-2 whitespace-pre-wrap">{errorMessage}</pre>
                </AlertDescription>
              </Alert>

              {/* Always show raw AI response on error */}
              {rawAIResponse && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Full AI Response (for debugging):</Label>
                  <div className="border rounded-lg bg-muted/50 max-h-[400px] overflow-y-auto">
                    <CodeBlock
                      code={rawAIResponse}
                      language="markdown"
                      showLineNumbers={false}
                    />
                  </div>
                </div>
              )}

              {parsedEdits?.parseDetails && (
                <Alert>
                  <Code2 className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-semibold text-sm">Parse Details:</p>
                    <ul className="text-xs mt-2 space-y-1">
                      <li>• SEARCH blocks detected: {parsedEdits.parseDetails.foundSearchBlocks}</li>
                      <li>• REPLACE blocks detected: {parsedEdits.parseDetails.foundReplaceBlocks}</li>
                      {parsedEdits.parseDetails.skippedBlocks.length > 0 && (
                        <li>• Skipped blocks: {parsedEdits.parseDetails.skippedBlocks.length}</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {state === 'input' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!userInstructions.trim() || isExecuting}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Changes
              </Button>
            </>
          )}

          {state === 'processing' && (
            <Button variant="outline" disabled>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}

          {state === 'review' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleApplyChanges}>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Close
              </Button>
              <Button onClick={() => setState('input')}>
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

