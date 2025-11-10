'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Code2,
  Eye,
  FileCode,
  FileText,
} from 'lucide-react';
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { parseCodeEdits, validateEdits } from '@/utils/code-editor/parseCodeEdits';
import { applyCodeEdits } from '@/utils/code-editor/applyCodeEdits';
import { getDiffStats } from '@/utils/code-editor/generateDiff';
import { getCodeEditorPromptId, CODE_EDITOR_PROMPTS } from '@/utils/code-editor/codeEditorPrompts';
import CodeBlock from '@/components/mardown-display/code/CodeBlock';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { DiffView } from './DiffView';
import { useAppSelector } from '@/lib/redux/hooks';
import { selectPromptsPreferences } from '@/lib/redux/selectors/userPreferenceSelectors';
import { PromptInput } from '@/features/prompts/components/PromptInput';
import { PromptVariable } from '@/features/prompts/types/core';
import { createClient } from '@/utils/supabase/client';
import type { Resource } from '@/features/prompts/components/resource-display';

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
  allowPromptSelection?: boolean; // Whether to show the prompt selector dropdown
}

type EditorState = 'input' | 'processing' | 'review' | 'applying' | 'complete' | 'error';

// Normalize language for better syntax highlighting
function normalizeLanguage(lang: string): string {
  const langLower = lang.toLowerCase();
  
  // Map common variations to standard language identifiers
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'react': 'typescript',
    'typescript': 'typescript',
    'javascript': 'javascript',
    'py': 'python',
    'python': 'python',
    'rb': 'ruby',
    'ruby': 'ruby',
    'go': 'go',
    'rust': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'csharp': 'csharp',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql',
    'bash': 'bash',
    'sh': 'bash',
    'shell': 'bash',
    'markdown': 'markdown',
    'md': 'markdown',
  };
  
  return languageMap[langLower] || lang;
}

export function AICodeEditorModal({
  open,
  onOpenChange,
  currentCode,
  language: rawLanguage,
  promptId,
  promptContext = 'generic',
  onCodeChange,
  title = 'AI Code Editor',
  description = '',
  allowPromptSelection = false,
}: AICodeEditorModalProps) {
  // Get user preferences
  const promptsPreferences = useAppSelector(selectPromptsPreferences);
  const supabase = createClient();
  
  // Normalize the language for consistent syntax highlighting
  const language = normalizeLanguage(rawLanguage);
  
  // Use explicit promptId if provided, otherwise use context
  const defaultPromptId = promptId || getCodeEditorPromptId(promptContext);
  
  // State for prompt selection
  const [selectedPromptId, setSelectedPromptId] = useState(defaultPromptId);
  
  // State for submit on enter (defaults to user preference)
  const [submitOnEnter, setSubmitOnEnter] = useState(promptsPreferences.submitOnEnter);
  
  // Prompt data state
  const [promptData, setPromptData] = useState<{variables: PromptVariable[]} | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  
  // Variables and input
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [userInstructions, setUserInstructions] = useState('');
  const [expandedVariable, setExpandedVariable] = useState<string | null>(null);
  
  // Resources
  const [resources, setResources] = useState<Resource[]>([]);
  
  const [state, setState] = useState<EditorState>('input');
  const [parsedEdits, setParsedEdits] = useState<ReturnType<typeof parseCodeEdits> | null>(null);
  const [modifiedCode, setModifiedCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rawAIResponse, setRawAIResponse] = useState('');

  const { execute, isExecuting, streamingText, error: execError, reset } = usePromptExecution();

  // Fetch prompt data when modal opens or prompt changes
  useEffect(() => {
    if (open && selectedPromptId) {
      const fetchPromptData = async () => {
        setIsLoadingPrompt(true);
        try {
          const { data: prompt, error } = await supabase
            .from('prompts')
            .select('variable_defaults')
            .eq('id', selectedPromptId)
            .single();

          if (error || !prompt) {
            console.error('Failed to fetch prompt:', error);
            setPromptData({ variables: [] });
            return;
          }

          // Filter out current_code from displayed variables
          const displayVariables = (prompt.variable_defaults || []).filter(
            (v: PromptVariable) => v.name !== 'current_code'
          );

          setPromptData({ variables: displayVariables });
          
          // Initialize variable values
          const initialValues: Record<string, string> = {};
          displayVariables.forEach((v: PromptVariable) => {
            initialValues[v.name] = v.defaultValue || '';
          });
          setVariableValues(initialValues);
        } catch (err) {
          console.error('Error loading prompt:', err);
          setPromptData({ variables: [] });
        } finally {
          setIsLoadingPrompt(false);
        }
      };

      fetchPromptData();
    }
  }, [open, selectedPromptId, supabase]);

  // Reset state when modal closes or when defaultPromptId changes
  useEffect(() => {
    if (!open) {
      setUserInstructions('');
      setVariableValues({});
      setResources([]);
      setExpandedVariable(null);
      setState('input');
      setParsedEdits(null);
      setModifiedCode('');
      setErrorMessage('');
      setRawAIResponse('');
      setSelectedPromptId(defaultPromptId);
      setSubmitOnEnter(promptsPreferences.submitOnEnter);
      setPromptData(null);
      reset();
    }
  }, [open, reset, defaultPromptId, promptsPreferences.submitOnEnter]);
  
  // Update selected prompt when default changes (e.g., when modal reopens with different context)
  useEffect(() => {
    if (open) {
      setSelectedPromptId(defaultPromptId);
    }
  }, [open, defaultPromptId]);

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
    setState('processing');

    try {
      // Combine automatic current_code variable with user variables
      const allVariables: Record<string, { type: 'hardcoded'; value: string }> = {
        current_code: {
          type: 'hardcoded',
          value: currentCode,
        },
      };

      // Add user-provided variables
      Object.entries(variableValues).forEach(([key, value]) => {
        allVariables[key] = { type: 'hardcoded', value };
      });

      // Prepare user input with resources if any
      let finalUserInput = userInstructions.trim();
      if (resources.length > 0) {
        // Add resources as context in the user message
        const resourceContext = resources.map((resource, index) => {
          if (resource.type === 'file') {
            const filename = resource.data.filename || resource.data.details?.filename || 'file';
            return `[Attachment ${index + 1}: ${filename}]`;
          } else if (resource.type === 'image_url') {
            return `[Image ${index + 1}: ${resource.data.url}]`;
          } else if (resource.type === 'file_url') {
            const filename = resource.data.filename || 'file';
            return `[File URL ${index + 1}: ${filename}]`;
          } else if (resource.type === 'webpage') {
            return `[Webpage ${index + 1}: ${resource.data.title || resource.data.url}]`;
          } else if (resource.type === 'youtube') {
            return `[YouTube ${index + 1}: ${resource.data.title || resource.data.videoId}]`;
          }
          return `[Resource ${index + 1}]`;
        }).filter(Boolean).join('\n');

        if (resourceContext) {
          finalUserInput = resourceContext + (finalUserInput ? '\n\n' + finalUserInput : '');
        }
      }

      await execute({
        promptId: selectedPromptId,
        variables: allVariables,
        userInput: finalUserInput || undefined,
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
  
  // Handlers for PromptInput
  const handleVariableValueChange = useCallback((variableName: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [variableName]: value }));
  }, []);

  const handleSubmitOnEnterChange = useCallback((value: boolean) => {
    setSubmitOnEnter(value);
  }, []);

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

  // Get available prompts for the selector
  const availablePrompts = Object.values(CODE_EDITOR_PROMPTS);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <span className="truncate">{title}</span>
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {allowPromptSelection && (
                <Select value={selectedPromptId} onValueChange={setSelectedPromptId} disabled={isLoadingPrompt}>
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id} className="text-xs">
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0">
          <div className="space-y-4">
          {/* Input Stage */}
          {state === 'input' && (
            <div className="space-y-3 sm:space-y-4">
              {isLoadingPrompt ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="ml-2 text-sm text-muted-foreground">Loading prompt...</p>
                </div>
              ) : promptData ? (
                <>
                  {/* Prepare variables with their values */}
                  {(() => {
                    const variablesWithValues = promptData.variables.map(v => ({
                      ...v,
                      defaultValue: variableValues[v.name] || v.defaultValue || ''
                    }));

                    return (
                      <PromptInput
                        variableDefaults={variablesWithValues}
                        onVariableValueChange={handleVariableValueChange}
                        expandedVariable={expandedVariable}
                        onExpandedVariableChange={setExpandedVariable}
                        chatInput={userInstructions}
                        onChatInputChange={setUserInstructions}
                        onSendMessage={handleSubmit}
                        isTestingPrompt={isExecuting}
                        submitOnEnter={submitOnEnter}
                        onSubmitOnEnterChange={handleSubmitOnEnterChange}
                        messages={[]}
                        showVariables={variablesWithValues.length > 0}
                        showAttachments={true}
                        attachmentCapabilities={{
                          supportsImageUrls: true,
                          supportsFileUrls: true,
                          supportsYoutubeVideos: true,
                        }}
                        placeholder="What changes would you like to make? (e.g., Add error handling, improve performance, etc.)"
                        sendButtonVariant="blue"
                        resources={resources}
                        onResourcesChange={setResources}
                        enablePasteImages={true}
                        uploadBucket="userContent"
                        uploadPath="code-editor-attachments"
                      />
                    );
                  })()}
                </>
              ) : null}
            </div>
          )}

          {/* Processing Stage */}
          {state === 'processing' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-center py-6 sm:py-8">
                <div className="text-center space-y-2 sm:space-y-3">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary mx-auto" />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    AI is analyzing your code and generating changes...
                  </p>
                </div>
              </div>

              {streamingText && (
                <div className="border rounded-lg p-3 sm:p-4 bg-muted/50 overflow-hidden">
                  <p className="text-xs text-muted-foreground mb-2">Live Response:</p>
                  <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                    <pre className="text-xs sm:text-sm whitespace-pre-wrap break-words">{streamingText}</pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Review Stage */}
          {state === 'review' && parsedEdits && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">Review Changes</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {parsedEdits.edits.length} change{parsedEdits.edits.length !== 1 ? 's' : ''} proposed
                  </p>
                </div>
                {diffStats && (
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                      +{diffStats.additions} additions
                    </Badge>
                    <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                      -{diffStats.deletions} deletions
                    </Badge>
                  </div>
                )}
              </div>

              {parsedEdits.explanation && (
                <Alert>
                  <AlertDescription className="text-xs sm:text-sm">{parsedEdits.explanation}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="diff" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                  <TabsTrigger value="diff" className="text-xs sm:text-sm py-2">
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Diff</span>
                  </TabsTrigger>
                  <TabsTrigger value="before" className="text-xs sm:text-sm py-2">
                    <FileCode className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Before</span>
                  </TabsTrigger>
                  <TabsTrigger value="after" className="text-xs sm:text-sm py-2">
                    <FileCode className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">After</span>
                  </TabsTrigger>
                  <TabsTrigger value="response" className="text-xs sm:text-sm py-2">
                    <FileText className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Full Response</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="diff" className="mt-4 overflow-hidden">
                  <DiffView
                    originalCode={currentCode}
                    modifiedCode={modifiedCode}
                    language={language}
                    showLineNumbers={true}
                  />
                </TabsContent>

                <TabsContent value="before" className="mt-4 overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <CodeBlock
                      code={currentCode}
                      language={language}
                      showLineNumbers={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="after" className="mt-4 overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <CodeBlock
                      code={modifiedCode}
                      language={language}
                      showLineNumbers={true}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="response" className="mt-4 overflow-hidden">
                  <div className="w-full overflow-x-auto prose prose-sm dark:prose-invert max-w-none">
                    <EnhancedChatMarkdown
                      content={rawAIResponse}
                      type="message"
                      role="assistant"
                      className="text-xs sm:text-sm"
                      hideCopyButton={false}
                      allowFullScreenEditor={false}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Applying Stage */}
          {state === 'applying' && (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <div className="text-center space-y-2 sm:space-y-3">
                <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-primary mx-auto" />
                <p className="text-xs sm:text-sm text-muted-foreground">Applying changes...</p>
              </div>
            </div>
          )}

          {/* Complete Stage */}
          {state === 'complete' && (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <div className="text-center space-y-2 sm:space-y-3">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto" />
                <p className="text-xs sm:text-sm font-medium">Changes applied successfully!</p>
              </div>
            </div>
          )}

          {/* Error Stage */}
          {state === 'error' && (
            <div className="space-y-3 sm:space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <AlertDescription>
                  <p className="font-semibold text-xs sm:text-sm">Error Parsing AI Response</p>
                  <pre className="text-xs mt-2 whitespace-pre-wrap overflow-x-auto">{errorMessage}</pre>
                </AlertDescription>
              </Alert>

              {parsedEdits?.parseDetails && (
                <Alert>
                  <Code2 className="w-4 h-4 shrink-0" />
                  <AlertDescription>
                    <p className="font-semibold text-xs sm:text-sm">Parse Details:</p>
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

              {/* Always show raw AI response on error */}
              {rawAIResponse && (
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-semibold">Full AI Response (for debugging):</Label>
                  <div className="w-full overflow-hidden border rounded-lg bg-muted/50">
                    <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
                      <EnhancedChatMarkdown
                        content={rawAIResponse}
                        type="message"
                        role="assistant"
                        className="text-xs"
                        hideCopyButton={false}
                        allowFullScreenEditor={false}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t shrink-0 flex-row justify-end gap-2 sm:gap-3">
          {/* Input stage footer is now handled by PromptInput component */}
          
          {state === 'processing' && (
            <Button 
              variant="outline" 
              disabled
              className="text-xs sm:text-sm px-3 sm:px-4"
            >
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
              Processing...
            </Button>
          )}

          {state === 'review' && (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleApplyChanges}
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Apply Changes</span>
                <span className="sm:hidden">Apply</span>
              </Button>
            </>
          )}

          {state === 'error' && (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Close
              </Button>
              <Button 
                onClick={() => setState('input')}
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Try Again
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

