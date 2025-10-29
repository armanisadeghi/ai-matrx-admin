/**
 * System Prompt Optimizer Component
 * 
 * Provides AI-powered optimization of system prompts with optional guidance
 * and real-time streaming of the improved version.
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
import { Wand2, Check, X, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SystemPromptOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSystemMessage: string;
  onAccept: (optimizedText: string) => void;
}

const OPTIMIZER_PROMPT_ID = '6e4e6335-dc04-4946-9435-561352db5b26';

export function SystemPromptOptimizer({
  isOpen,
  onClose,
  currentSystemMessage,
  onAccept
}: SystemPromptOptimizerProps) {
  const dispatch = useAppDispatch();
  const [additionalGuidance, setAdditionalGuidance] = useState('');
  const [showGuidanceInput, setShowGuidanceInput] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  // Watch streaming text - exactly like PromptRunner
  const streamingText = useAppSelector(state => 
    currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ''
  );
  
  const isResponseEnded = useAppSelector(state =>
    currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
  );

  // Reset when response ends
  useEffect(() => {
    if (isResponseEnded && isOptimizing) {
      setIsOptimizing(false);
    }
  }, [isResponseEnded, isOptimizing]);

  const handleOptimize = async () => {
    if (!currentSystemMessage.trim()) {
      toast.error('No system message to optimize');
      return;
    }

    setIsOptimizing(true);
    
    try {
      // 1. Fetch prompt
      const supabase = createClient();
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', OPTIMIZER_PROMPT_ID)
        .single();

      if (promptError || !prompt) {
        throw new Error('Optimizer prompt not found');
      }

      // 2. Replace variables in messages
      const messages = prompt.messages.map((msg: any) => {
        let content = msg.content;
        content = content.replace(/{{current_system_message}}/g, currentSystemMessage);
        if (additionalGuidance.trim()) {
          content = content.replace(/{{additional_guidance}}/g, additionalGuidance);
        }
        return {
          role: msg.role,
          content
        };
      });

      // 3. Build chat config
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

      // 4. Submit task via Socket.IO - EXACTLY like PromptRunner
      const taskId = uuidv4();
      
      const result = await dispatch(createAndSubmitTask({
        service: 'chat_service',
        taskName: 'direct_chat',
        taskData: { chat_config: chatConfig },
        customTaskId: taskId
      })).unwrap();

      // Store the taskId for streaming - EXACTLY like PromptRunner line 551
      setCurrentTaskId(result.taskId);
      
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('Failed to optimize', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      setIsOptimizing(false);
      setCurrentTaskId(null);
    }
  };

  const handleAccept = () => {
    if (streamingText.trim()) {
      onAccept(streamingText);
      handleClose();
      toast.success('System message updated', {
        description: 'The optimized version has been applied'
      });
    }
  };

  const handleClose = () => {
    setCurrentTaskId(null);
    setAdditionalGuidance('');
    setShowGuidanceInput(false);
    setIsOptimizing(false);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(streamingText);
    toast.success('Copied to clipboard');
  };

  const hasOptimizedText = streamingText.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Optimize System Message
          </DialogTitle>
          <DialogDescription>
            AI will help improve your system message for better clarity and effectiveness
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 px-6 overflow-hidden min-h-0">
          {/* Original System Message */}
          <div className="flex flex-col min-h-0">
            <Label className="text-sm font-medium mb-2">Current System Message</Label>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {currentSystemMessage || <span className="text-gray-400 italic">No system message</span>}
              </p>
            </div>
          </div>

          {/* Optimized System Message */}
          <div className="flex flex-col min-h-0">
            <Label className="text-sm font-medium mb-2">Optimized Version</Label>
            <div className="flex-1 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-700 rounded-lg p-3 overflow-y-auto relative">
              {isOptimizing ? (
                <div className="space-y-3">
                  {streamingText ? (
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {streamingText}
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Processing...</span>
                    </div>
                  )}
                  {streamingText && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Streaming response...</span>
                    </div>
                  )}
                </div>
              ) : hasOptimizedText ? (
                <>
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {streamingText}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <Wand2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Click "Optimize" to see the improved version
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Additional Guidance */}
        <div className="px-6 py-3 border-t space-y-2">
          {!showGuidanceInput ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuidanceInput(true)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-8"
            >
              + Add additional guidance (optional)
            </Button>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                Additional Guidance (Optional)
              </Label>
              <Textarea
                value={additionalGuidance}
                onChange={(e) => setAdditionalGuidance(e.target.value)}
                placeholder="e.g., 'Make it more concise' or 'Focus on technical accuracy'"
                className="text-sm h-16 resize-none"
                disabled={isOptimizing}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 dark:bg-gray-900">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {hasOptimizedText && !isOptimizing && (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-green-600" />
                Ready to apply
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isOptimizing}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            {hasOptimizedText && !isOptimizing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleOptimize}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Re-optimize
                </Button>
                <Button
                  onClick={handleAccept}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Accept & Replace
                </Button>
              </>
            ) : (
              <Button
                onClick={handleOptimize}
                disabled={isOptimizing || !currentSystemMessage.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Optimize
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
