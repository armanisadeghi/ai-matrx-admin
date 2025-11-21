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
  Copy,
  Check,
} from 'lucide-react';
import { parseCodeEdits, validateEdits } from '@/features/code-editor/utils/parseCodeEdits';
import { applyCodeEdits } from '@/features/code-editor/utils/applyCodeEdits';
import { getDiffStats } from '@/features/code-editor/utils/generateDiff';
import { getCodeEditorBuiltinId, CODE_EDITOR_PROMPT_BUILTINS } from '@/features/code-editor/utils/codeEditorPrompts';
import {
  buildSpecialVariables,
  filterOutSpecialVariables,
  getRequiredSpecialVariables,
  logSpecialVariablesUsage,
  type CodeEditorContext
} from '@/features/code-editor/utils/specialVariables';
import CodeBlock from '@/features/code-editor/components/code-block/CodeBlock';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { DiffView } from './DiffView';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { shallowEqual } from 'react-redux';
import { selectPromptsPreferences } from '@/lib/redux/selectors/userPreferenceSelectors';
import { completeExecutionThunk } from '@/lib/redux/prompt-execution/thunks/completeExecutionThunk';
import {
  startPromptInstance,
  executeMessage,
  updateVariable,
  setCurrentInput,
  removeInstance,
  selectInstance,
  selectStreamingTextForInstance,
  selectIsResponseEndedForInstance,
  selectMergedVariables,
} from '@/lib/redux/prompt-execution';
import { PromptInput } from '@/features/prompts/components/PromptInput';
import { PromptVariable } from '@/features/prompts/types/core';
import type { Resource } from '@/features/prompts/components/resource-display';
import { selectCachedPrompt } from '@/lib/redux/slices/promptCacheSlice';
import { cn } from '@/lib/utils';

export interface AICodeEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCode: string;
  language: string;
  builtinId?: string; // Optional: explicit builtin ID
  promptContext?: 'prompt-app-ui' | 'generic'; // Or use context to auto-select
  onCodeChange: (newCode: string) => void;
  title?: string;
  description?: string;
  allowPromptSelection?: boolean; // Whether to show the prompt selector dropdown

  // Optional: Special context variables (for future features)
  selection?: string; // Currently selected/highlighted text
  context?: string; // Multi-file context
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
  builtinId,
  promptContext = 'generic',
  onCodeChange,
  title = 'AI Code Editor',
  description = '',
  allowPromptSelection = false,
  selection,
  context,
}: AICodeEditorModalProps) {
  const dispatch = useAppDispatch();

  // Get user preferences
  const promptsPreferences = useAppSelector(selectPromptsPreferences);
  const submitOnEnterPreference = promptsPreferences.submitOnEnter;

  // Normalize the language for consistent syntax highlighting
  const language = normalizeLanguage(rawLanguage);

  // Use explicit builtinId if provided, otherwise use context
  const defaultBuiltinId = builtinId || getCodeEditorBuiltinId(promptContext);

  // State for prompt selection
  const [selectedBuiltinId, setSelectedBuiltinId] = useState(defaultBuiltinId);

  // State for submit on enter (defaults to user preference)
  const [submitOnEnter, setSubmitOnEnter] = useState(promptsPreferences.submitOnEnter);

  // Redux instance management
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const instance = useAppSelector(state =>
    instanceId ? selectInstance(state, instanceId) : null
  );
  const streamingText = useAppSelector(state =>
    instanceId ? selectStreamingTextForInstance(state, instanceId) : ''
  );
  const isResponseEnded = useAppSelector(state =>
    instanceId ? selectIsResponseEndedForInstance(state, instanceId) : false
  );
  // Use shallowEqual to prevent unnecessary re-renders from object reference changes
  const variables = useAppSelector(
    state => instanceId ? selectMergedVariables(state, instanceId) : {},
    shallowEqual
  );
  const cachedPrompt = useAppSelector(state =>
    selectedBuiltinId ? selectCachedPrompt(state, selectedBuiltinId) : null
  );

  // Resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [expandedVariable, setExpandedVariable] = useState<string | null>(null);

  const [state, setState] = useState<EditorState>('input');
  const [parsedEdits, setParsedEdits] = useState<ReturnType<typeof parseCodeEdits> | null>(null);
  const [modifiedCode, setModifiedCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rawAIResponse, setRawAIResponse] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const isExecuting = instance?.status === 'executing' || instance?.status === 'streaming';
  const isLoadingPrompt = instance?.status === 'initializing';

  // Initialize prompt instance when modal opens or builtin changes
  useEffect(() => {
    if (open && selectedBuiltinId) {
      const initInstance = async () => {
        try {
          // First, we need to fetch the prompt to see what variables it needs
          // We'll let startPromptInstance handle the fetch, then update special vars after
          const id = await dispatch(startPromptInstance({
            promptId: selectedBuiltinId,
            promptSource: 'prompt_builtins',
            variables: {}, // Empty for now, we'll populate after
            executionConfig: {
              auto_run: false,
              allow_chat: false,
              show_variables: true,
              apply_variables: true,
              track_in_runs: false, // Don't track code edits in runs
            },
          })).unwrap();

          setInstanceId(id);

          // Now populate special variables based on what the prompt needs
          // This will happen in the next effect when cachedPrompt is loaded
        } catch (err) {
          console.error('Error initializing prompt instance:', err);
          setState('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize');
        }
      };

      initInstance();
    }
  }, [open, selectedBuiltinId, dispatch]);

  // Populate special variables when prompt is loaded
  useEffect(() => {
    if (instanceId && cachedPrompt) {
      const promptVariables = cachedPrompt.variableDefaults || [];
      const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);

      if (requiredSpecialVars.length > 0) {
        // Build code context
        const codeContext: CodeEditorContext = {
          currentCode,
          selection,
          context,
        };

        // Build special variables
        const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars);

        // Log what we're doing (helpful for debugging)
        logSpecialVariablesUsage(cachedPrompt.name, specialVars);

        // Update Redux with special variables
        Object.entries(specialVars).forEach(([name, value]) => {
          dispatch(updateVariable({
            instanceId,
            variableName: name,
            value,
          }));
        });
      }
    }
  }, [instanceId, cachedPrompt, currentCode, selection, context, dispatch]);

  // Reset state and cleanup when modal closes
  useEffect(() => {
    if (!open) {
      // Cleanup instance
      if (instanceId) {
        dispatch(removeInstance({ instanceId }));
      }
      
      // Reset all state
      setInstanceId(null);
      setResources([]);
      setExpandedVariable(null);
      setState('input');
      setParsedEdits(null);
      setModifiedCode('');
      setErrorMessage('');
      setRawAIResponse('');
      setIsCopied(false);
      setSelectedBuiltinId(defaultBuiltinId);
      setSubmitOnEnter(submitOnEnterPreference);
    }
  }, [open, defaultBuiltinId, submitOnEnterPreference, instanceId, dispatch]);

  // Update selected builtin when default changes (e.g., when modal reopens with different context)
  useEffect(() => {
    if (open) {
      setSelectedBuiltinId(defaultBuiltinId);
    }
  }, [open, defaultBuiltinId]);

  // Complete execution when streaming ends
  useEffect(() => {
    if (
      instanceId &&
      instance &&
      isResponseEnded &&
      streamingText &&
      (instance.status === 'streaming' || instance.status === 'executing') &&
      instance.execution.messageStartTime
    ) {
      // CRITICAL: Save the streaming text BEFORE calling completeExecutionThunk
      // The thunk sets currentTaskId to null, which makes the selector return ''
      // So we must preserve the text in component state first
      setRawAIResponse(streamingText);

      const totalTime = Date.now() - instance.execution.messageStartTime;
      const timeToFirstToken = instance.execution.timeToFirstToken;

      console.log('🏁 Streaming ended, completing execution...', {
        instanceId,
        streamingTextLength: streamingText.length,
        totalTime,
        timeToFirstToken,
      });

      dispatch(completeExecutionThunk({
        instanceId,
        responseText: streamingText,
        timeToFirstToken,
        totalTime,
      }));
    }
  }, [instanceId, instance, isResponseEnded, streamingText, dispatch]);

  // Parse response when streaming completes
  useEffect(() => {
    // Use rawAIResponse instead of streamingText because streamingText
    // becomes empty after completeExecution sets currentTaskId to null
    if (rawAIResponse && !isExecuting && state === 'processing') {
      // Response complete, try to parse for edits
      const parsed = parseCodeEdits(rawAIResponse);
      setParsedEdits(parsed);

      // CRITICAL: No edits found = normal conversation, NOT an error
      // The AI can chat, ask questions, provide explanations without edits
      if (!parsed.success || parsed.edits.length === 0) {
        console.log('📝 No code edits found in response - continuing conversation');
        // Reset to input state to continue the conversation
        setState('input');
        return;
      }

      // Edits found - now validate them
      console.log(`✏️ Found ${parsed.edits.length} edit(s) - validating...`);

      // Validate edits against current code
      const validation = validateEdits(currentCode, parsed.edits);

      // Show warnings if using fuzzy matching
      if (validation.warnings.length > 0) {
        console.log('⚠️ Fuzzy Matching Applied:');
        validation.warnings.forEach(w => console.log(`  - ${w}`));
      }

      if (!validation.valid) {
        console.error('❌ Edit validation failed');
        setState('error');
        let errorMsg = `⚠️ INVALID CODE EDITS\n\n`;
        errorMsg += `The AI provided ${parsed.edits.length} edit${parsed.edits.length !== 1 ? 's' : ''}, but some SEARCH patterns don't match the current code.\n\n`;
        errorMsg += `This usually means the AI is trying to edit code that doesn't exist or has changed.\n`;
        errorMsg += `You can continue the conversation to clarify or try again.\n\n`;

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
  }, [rawAIResponse, isExecuting, state, currentCode]);

  const handleSubmit = async () => {
    if (!instanceId || !cachedPrompt) {
      setErrorMessage('Instance not initialized');
      setState('error');
      return;
    }

    setState('processing');

    try {
      // Update ALL special variables with latest values before execution
      const promptVariables = cachedPrompt.variableDefaults || [];
      const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);

      if (requiredSpecialVars.length > 0) {
        const codeContext: CodeEditorContext = {
          currentCode,
          selection,
          context,
        };

        const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars);

        // Update each special variable
        Object.entries(specialVars).forEach(([name, value]) => {
          dispatch(updateVariable({
            instanceId,
            variableName: name,
            value,
          }));
        });
      }

      // Prepare user input with resources if any
      // CRITICAL: NEVER modify the user's message - instructions are in the prompt itself
      let finalUserInput = instance?.conversation.currentInput.trim() || '';

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

      await dispatch(executeMessage({
        instanceId,
        userInput: finalUserInput || undefined,
      })).unwrap();
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Handlers for PromptInput
  const handleVariableValueChange = useCallback((variableName: string, value: string) => {
    if (!instanceId) return;
    dispatch(updateVariable({
      instanceId,
      variableName,
      value,
    }));
  }, [instanceId, dispatch]);

  const handleChatInputChange = useCallback((value: string) => {
    if (!instanceId) return;
    dispatch(setCurrentInput({
      instanceId,
      input: value,
    }));
  }, [instanceId, dispatch]);

  const handleSubmitOnEnterChange = useCallback((value: boolean) => {
    setSubmitOnEnter(value);
  }, []);

  const handleCopyResponse = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawAIResponse);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [rawAIResponse]);

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


  const diffStats = modifiedCode ? getDiffStats(currentCode, modifiedCode) : null;

  // Get available builtins for the selector
  const availableBuiltins = Object.values(CODE_EDITOR_PROMPT_BUILTINS);

  // Get display variables (filter out ALL special variables as they're auto-managed)
  const displayVariables = filterOutSpecialVariables(
    cachedPrompt?.variableDefaults || []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[95vh] p-0 flex flex-col overflow-hidden gap-0">
        {/* Compact Header - Only show when needed */}
        {(allowPromptSelection || title !== 'AI Code Editor') && (
          <DialogHeader className="px-3 py-2 border-b shrink-0 bg-muted/30">
            <div className="flex items-center justify-between gap-2 pr-8">
              {title !== 'AI Code Editor' && (
                <DialogTitle className="flex items-center gap-1.5 text-sm font-medium">
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="truncate">{title}</span>
                </DialogTitle>
              )}

              <div className="flex items-center gap-2 ml-auto">
                {allowPromptSelection && (
                  <Select value={selectedBuiltinId} onValueChange={setSelectedBuiltinId} disabled={isLoadingPrompt}>
                    <SelectTrigger className="w-[160px] h-7 text-xs">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBuiltins.map((builtin) => (
                        <SelectItem key={builtin.id} value={builtin.id} className="text-xs">
                          {builtin.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </DialogHeader>
        )}

        {/* Main Content - Two-column layout */}
        <div className="flex-1 overflow-hidden min-h-0 flex gap-2 p-2">
          {/* Left: Main Content Area (changes based on state) */}
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            {/* Code Display (input/processing states) */}
            {(state === 'input' || state === 'processing') && (
              <div className="flex-1 flex flex-col min-h-0 border rounded overflow-hidden bg-background">
                <div className="px-2 py-1 border-b bg-muted/20 flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Current Code</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                    {language}
                  </Badge>
                </div>
                <div className="flex-1 overflow-auto relative">
                  <CodeBlock
                    code={currentCode}
                    language={language}
                    showLineNumbers={true}
                  />

                  {/* Processing Overlay - Compact */}
                  {state === 'processing' && (
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                      <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                      <p className="text-sm font-medium">AI is responding...</p>

                      {streamingText && (
                        <div className="mt-4 w-full max-w-xl px-4">
                          <div className="bg-muted/50 rounded border p-2 max-h-[150px] overflow-y-auto font-mono text-[10px]">
                            <p className="text-muted-foreground mb-1 text-[9px] uppercase tracking-wider font-semibold">Live Response</p>
                            <pre className="whitespace-pre-wrap break-words">{streamingText}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Review Stage */}
            {state === 'review' && parsedEdits && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">Review Changes</span>
                    <span className="text-xs text-muted-foreground">
                      {parsedEdits.edits.length} edit{parsedEdits.edits.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {diffStats && (
                    <div className="flex gap-1.5 pr-8">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-green-600 border-green-600 bg-green-50 dark:bg-green-950/30">
                        +{diffStats.additions}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-red-600 border-red-600 bg-red-50 dark:bg-red-950/30">
                        -{diffStats.deletions}
                      </Badge>
                    </div>
                  )}
                </div>

                {parsedEdits.explanation && (
                  <Alert className="mb-2 shrink-0 py-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <AlertDescription className="text-xs">{parsedEdits.explanation}</AlertDescription>
                  </Alert>
                )}

                <Tabs defaultValue="diff" className="flex-1 flex flex-col min-h-0">
                  <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto shrink-0">
                    <TabsTrigger
                      value="diff"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Diff
                    </TabsTrigger>
                    <TabsTrigger
                      value="after"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs"
                    >
                      <FileCode className="w-3.5 h-3.5 mr-1.5" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger
                      value="response"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-1.5 text-xs"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Response
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex-1 mt-2 min-h-0 border rounded overflow-hidden bg-background">
                    <TabsContent value="diff" className="h-full m-0 p-0 overflow-hidden">
                      <DiffView
                        originalCode={currentCode}
                        modifiedCode={modifiedCode}
                        language={language}
                        showLineNumbers={true}
                      />
                    </TabsContent>

                    <TabsContent value="after" className="h-full m-0 p-0 overflow-hidden">
                      <div className="h-full overflow-auto">
                        <CodeBlock
                          code={modifiedCode}
                          language={language}
                          showLineNumbers={true}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="response" className="h-full m-0 p-0 overflow-hidden">
                      <div className="h-full overflow-auto p-3">
                        <EnhancedChatMarkdown
                          content={rawAIResponse}
                          type="message"
                          role="assistant"
                          hideCopyButton={false}
                          allowFullScreenEditor={false}
                        />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            )}

            {/* Applying Stage - Compact */}
            {state === 'applying' && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium">Applying Changes...</p>
                </div>
              </div>
            )}

            {/* Complete Stage - Compact */}
            {state === 'complete' && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm font-medium">Changes Applied!</p>
                </div>
              </div>
            )}

            {/* Error Stage - Compact */}
            {state === 'error' && (
              <div className="flex-1 flex flex-col min-h-0 gap-2">
                <Alert variant="destructive" className="shrink-0 py-2">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <AlertDescription className="text-xs font-medium">
                    Failed to process AI response
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1 min-h-0">
                  <div className="border rounded p-2 overflow-auto bg-destructive/5">
                    <h4 className="font-semibold text-destructive mb-1 text-xs">Error Details</h4>
                    <pre className="text-[10px] whitespace-pre-wrap font-mono text-destructive/80">{errorMessage}</pre>
                  </div>

                  <div className="border rounded flex flex-col overflow-hidden">
                    <div className="px-2 py-1 bg-muted/50 border-b flex items-center justify-between shrink-0">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Raw AI Response</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5"
                        onClick={handleCopyResponse}
                        disabled={!rawAIResponse}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 mr-1 text-green-600" />
                            <span className="text-[10px]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex-1 overflow-auto p-2 bg-background">
                      <pre className="text-[10px] whitespace-pre-wrap font-mono">{rawAIResponse}</pre>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Persistent Conversation Panel */}
          {instance?.conversation.messages && instance.conversation.messages.length > 0 && (
            <div className="w-[400px] flex flex-col min-h-0 border rounded overflow-hidden bg-background shrink-0">
              <div className="px-2 py-1 border-b bg-muted/20 shrink-0">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Conversation</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {instance.conversation.messages.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "p-2 rounded text-xs",
                    msg.role === 'user' ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'
                  )}>
                    <div className="font-semibold text-[10px] uppercase tracking-wide mb-1 text-muted-foreground">
                      {msg.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)}
                    </div>
                  </div>
                ))}
                {/* Show streaming response in conversation */}
                {isExecuting && streamingText && (
                  <div className="p-2 rounded text-xs bg-muted mr-4 animate-pulse">
                    <div className="font-semibold text-[10px] uppercase tracking-wide mb-1 text-muted-foreground">
                      Assistant
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {streamingText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer - Input Area - Compact */}
        <DialogFooter className="px-2 py-2 border-t shrink-0 bg-background z-20">
          <div className="w-full">
            {state === 'review' ? (
              <div className="flex items-center justify-between w-full">
                <Button variant="ghost" size="sm" onClick={() => setState('input')}>
                  Retry
                </Button>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => setState('input')}>
                    Discard
                  </Button>
                  <Button size="sm" onClick={handleApplyChanges} className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Apply
                  </Button>
                </div>
              </div>
            ) : state === 'error' ? (
              <div className="flex justify-end w-full">
                <Button size="sm" onClick={() => setState('input')}>
                  Continue Conversation
                </Button>
              </div>
            ) : (
              /* Input State - Show PromptInput */
              <>
                {isLoadingPrompt ? (
                  <div className="h-[50px] flex items-center justify-center text-muted-foreground text-sm">
                    Initializing editor...
                  </div>
                ) : cachedPrompt && instance ? (
                  <div className="w-full">
                    {(() => {
                      const variablesWithValues = displayVariables.map(v => ({
                        ...v,
                        defaultValue: variables[v.name] || v.defaultValue || ''
                      }));

                      return (
                        <PromptInput
                          variableDefaults={variablesWithValues}
                          onVariableValueChange={handleVariableValueChange}
                          expandedVariable={expandedVariable}
                          onExpandedVariableChange={setExpandedVariable}
                          chatInput={instance.conversation.currentInput}
                          onChatInputChange={handleChatInputChange}
                          onSendMessage={handleSubmit}
                          isTestingPrompt={isExecuting}
                          submitOnEnter={submitOnEnter}
                          onSubmitOnEnterChange={handleSubmitOnEnterChange}
                          messages={instance?.conversation.messages || []}
                          showVariables={variablesWithValues.length > 0}
                          showAttachments={true}
                          attachmentCapabilities={{
                            supportsImageUrls: true,
                            supportsFileUrls: true,
                            supportsYoutubeVideos: true,
                          }}
                          placeholder="Describe the changes you want to make..."
                          sendButtonVariant="default"
                          resources={resources}
                          onResourcesChange={setResources}
                          enablePasteImages={true}
                          uploadBucket="userContent"
                          uploadPath="code-editor-attachments"
                        />
                      );
                    })()}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

