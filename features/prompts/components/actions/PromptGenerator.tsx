/**
 * Prompt Generator Component
 * 
 * Provides AI-powered generation of new prompts from user specifications
 */

"use client";

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles, Check, X, Loader2, Copy, AlertTriangle, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import CodeBlock from '@/components/mardown-display/code/CodeBlock';
import { extractJsonFromText } from '@/features/prompts/utils/json-extraction';
import { useRouter } from 'next/navigation';

interface PromptGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROMPT_GENERATOR_PROMPT_ID = 'fbdb6b57-8b4e-44fe-8354-6286251f638a';

export function PromptGenerator({
  isOpen,
  onClose,
}: PromptGeneratorProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  
  const [promptPurpose, setPromptPurpose] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [promptName, setPromptName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [extractedJson, setExtractedJson] = useState<any>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // Watch streaming text
  const streamingText = useAppSelector(state => 
    currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ''
  );
  
  const isResponseEnded = useAppSelector(state =>
    currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
  );

  // Extract JSON from streaming response when it ends
  useEffect(() => {
    if (isResponseEnded && streamingText && isGenerating) {
      setIsGenerating(false);
      
      // Use the safe extraction utility
      const result = extractJsonFromText(streamingText);
      
      if (result.success && result.data) {
        setExtractedJson(result.data);
        setExtractionError(null);
        toast.success('Prompt generated successfully', {
          description: 'Review the generated prompt and click "Create Prompt" to save it'
        });
      } else {
        // Extraction failed
        setExtractionError(result.error || 'Could not extract JSON from response');
        toast.error('Could not extract JSON', {
          description: 'The raw response is still available below. You may need to manually extract the JSON.',
          duration: 5000,
        });
      }
    }
  }, [isResponseEnded, streamingText, isGenerating]);

  const handleGenerate = async () => {
    if (!promptPurpose.trim()) {
      toast.error('Please describe the purpose of your prompt');
      return;
    }

    setIsGenerating(true);
    setExtractedJson(null);
    setExtractionError(null);
    
    try {
      // 1. Fetch prompt template
      const supabase = createClient();
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', PROMPT_GENERATOR_PROMPT_ID)
        .single();

      if (promptError || !prompt) {
        throw new Error('Prompt generator template not found');
      }

      // 2. Build the full prompt_purpose value
      let fullPurpose = `**Primary Purpose:**\n${promptPurpose}`;
      
      if (additionalContext.trim()) {
        fullPurpose += `\n\n**Additional Context & Requirements:**\n${additionalContext}`;
      }

      // 3. Replace variables in messages
      const messages = prompt.messages.map((msg: any) => {
        let content = msg.content;
        content = content.replace(/{{prompt_purpose}}/g, fullPurpose);
        return {
          role: msg.role,
          content
        };
      });

      // 4. Build chat config
      const modelId = prompt.settings?.model_id;
      if (!modelId) {
        throw new Error('No model specified in prompt');
      }

      const chatConfig = {
        model_id: modelId,
        messages,
        stream: true,
        ...prompt.settings
      };

      // 5. Submit task via Socket.IO
      const taskId = uuidv4();
      
      const result = await dispatch(createAndSubmitTask({
        service: 'chat_service',
        taskName: 'direct_chat',
        taskData: { chat_config: chatConfig },
        customTaskId: taskId
      })).unwrap();

      // Store the taskId for streaming
      setCurrentTaskId(result.taskId);
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate prompt', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsGenerating(false);
      setCurrentTaskId(null);
    }
  };

  const handleCreatePrompt = async () => {
    if (!extractedJson) {
      toast.error('No generated prompt to save');
      return;
    }

    if (!promptName.trim()) {
      toast.error('Please enter a name for your prompt');
      return;
    }

    setIsSaving(true);
    
    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create new prompt using the same DB field pattern as importPrompt
      const promptId = uuidv4();
      const dbPromptData = {
        id: promptId,
        user_id: user.id,
        name: promptName.trim(),
        description: extractedJson.description || null,
        messages: extractedJson.messages || [],
        variable_defaults: extractedJson.variableDefaults || extractedJson.variables || [],
        settings: extractedJson.settings || {},
        // created_at and updated_at are automatically set by the database
      };

      const { error: insertError } = await supabase
        .from('prompts')
        .insert([dbPromptData]);

      if (insertError) {
        throw insertError;
      }

      toast.success('Prompt created successfully!', {
        description: 'Redirecting to your new prompt...'
      });

      // Close modal and navigate to the new prompt
      handleClose();
      router.push(`/ai/prompts/edit/${promptId}`);
      router.refresh();
      
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error('Failed to create prompt', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setCurrentTaskId(null);
    setPromptPurpose('');
    setAdditionalContext('');
    setPromptName('');
    setIsGenerating(false);
    setIsSaving(false);
    setExtractedJson(null);
    setExtractionError(null);
    onClose();
  };

  const handleCopyGenerated = () => {
    if (extractedJson) {
      navigator.clipboard.writeText(JSON.stringify(extractedJson, null, 2));
      toast.success('Copied generated prompt to clipboard');
    }
  };

  const handleCopyRawResponse = () => {
    navigator.clipboard.writeText(streamingText);
    toast.success('Copied raw response to clipboard');
  };

  const hasGeneratedPrompt = extractedJson !== null;
  const canGenerate = promptPurpose.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-7xl h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            AI Prompt Generator
          </DialogTitle>
          <DialogDescription>
            Describe what you want your prompt to do, and AI will generate a complete prompt configuration
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 px-6 overflow-hidden min-h-0 mt-4">
          {/* Input Section */}
          <div className="flex flex-col min-h-0 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Prompt Purpose
                  <span className="text-xs text-red-500">*</span>
                </Label>
                <Textarea
                  value={promptPurpose}
                  onChange={(e) => setPromptPurpose(e.target.value)}
                  placeholder="Describe what you want your prompt or agent to do. For example: 'A creative writing assistant that helps users write engaging blog posts with SEO optimization' or 'A code review assistant that provides constructive feedback on code quality'"
                  className="min-h-[180px] text-sm"
                  disabled={isGenerating || hasGeneratedPrompt}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Be specific about the main purpose and goals of your prompt
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Additional Context & Specifications
                  <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                </Label>
                <Textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Add any specific requirements, limitations, tone preferences, output formats, or other details. For example: 'Should use a friendly, conversational tone' or 'Must output JSON format' or 'Should avoid technical jargon'"
                  className="min-h-[180px] text-sm"
                  disabled={isGenerating || hasGeneratedPrompt}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Any additional context, requirements, or constraints
                </p>
              </div>

              {hasGeneratedPrompt && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Prompt Name
                    <span className="text-xs text-red-500">*</span>
                  </Label>
                  <Input
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    placeholder="Enter a name for your new prompt"
                    className="text-sm"
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>
          </div>

          {/* AI Response Section */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Generated Prompt</Label>
              {streamingText && !isGenerating && (
                <div className="flex gap-1">
                  {hasGeneratedPrompt && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyGenerated}
                      className="h-7 px-2 text-xs"
                      title="Copy extracted JSON"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy JSON
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyRawResponse}
                    className="h-7 px-2 text-xs"
                    title="Copy raw response"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Raw
                  </Button>
                </div>
              )}
            </div>
            <div className="flex-1 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-700 rounded-lg overflow-hidden">
              {isGenerating ? (
                <div className="p-6 space-y-4 h-full flex flex-col">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm font-medium">Generating your prompt...</span>
                  </div>
                  
                  {streamingText && (
                    <div className="flex-1 bg-white/50 dark:bg-gray-900/50 rounded-lg overflow-hidden flex flex-col">
                      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Live Response:</p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        <EnhancedChatMarkdown
                          content={streamingText}
                          isStreamActive={true}
                          hideCopyButton={true}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Streaming response...</span>
                  </div>
                </div>
              ) : streamingText ? (
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Show extraction status */}
                  {extractionError && (
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-xs text-amber-700 dark:text-amber-300">
                        <strong>JSON Extraction Failed:</strong> {extractionError}
                        <br />
                        <span className="text-amber-600 dark:text-amber-400">The full AI response is displayed below.</span>
                      </div>
                    </div>
                  )}
                  
                  {hasGeneratedPrompt && !extractionError && (
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-700 dark:text-green-300">
                        Prompt generated successfully! Review the configuration below or click "Create Prompt" to save.
                      </span>
                    </div>
                  )}
                  
                  {/* Show the extracted JSON if available */}
                  {hasGeneratedPrompt && (
                    <div className="flex-1 overflow-y-auto p-4 bg-white/50 dark:bg-gray-900/50">
                      <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Extracted Prompt Configuration:</p>
                      </div>
                      <CodeBlock
                        code={JSON.stringify(extractedJson, null, 2)}
                        language="json"
                        showLineNumbers={true}
                        wrapLines={false}
                        fontSize={12}
                      />
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Full AI Response:</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Always show the full raw response */}
                  <div className={`${hasGeneratedPrompt ? '' : 'flex-1'} overflow-y-auto p-4 bg-white/50 dark:bg-gray-900/50`}>
                    <EnhancedChatMarkdown
                      content={streamingText}
                      isStreamActive={false}
                      hideCopyButton={false}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Sparkles className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Ready to generate
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md">
                    Fill in the prompt purpose and click "Generate" to let AI create your prompt configuration
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 dark:bg-gray-900">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {hasGeneratedPrompt && !isGenerating && (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-600" />
                Ready to create
              </span>
            )}
            {extractionError && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                Check response manually
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating || isSaving}
            >
              <X className="h-4 w-4 mr-2" />
              {hasGeneratedPrompt ? 'Discard' : 'Cancel'}
            </Button>
            
            {hasGeneratedPrompt && !isGenerating ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setExtractedJson(null);
                    setPromptName('');
                  }}
                  disabled={isSaving}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  onClick={handleCreatePrompt}
                  disabled={!promptName.trim() || isSaving}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Prompt
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Prompt
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

