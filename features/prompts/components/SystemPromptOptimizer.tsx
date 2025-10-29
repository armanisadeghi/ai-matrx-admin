/**
 * System Prompt Optimizer Component
 * 
 * Provides AI-powered optimization of system prompts with optional guidance
 * and real-time streaming of the improved version.
 */

"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Wand2, Check, X, Loader2, Copy } from 'lucide-react';
import { usePromptExecution } from '../hooks/usePromptExecution';
import { cn } from '@/lib/utils';
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
  const [additionalGuidance, setAdditionalGuidance] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [showGuidanceInput, setShowGuidanceInput] = useState(false);
  
  const { execute, isExecuting, progress } = usePromptExecution();

  const handleOptimize = async () => {
    if (!currentSystemMessage.trim()) {
      toast.error('No system message to optimize');
      return;
    }

    setOptimizedText('');
    
    try {
      await execute({
        promptId: OPTIMIZER_PROMPT_ID,
        variables: {
          current_system_message: { 
            type: 'hardcoded', 
            value: currentSystemMessage 
          },
          ...(additionalGuidance.trim() && {
            additional_guidance: {
              type: 'hardcoded',
              value: additionalGuidance
            }
          })
        },
        onProgress: (progressUpdate) => {
          if (progressUpdate.streamedText) {
            setOptimizedText(progressUpdate.streamedText);
          }
        }
      });
    } catch (error) {
      toast.error('Failed to optimize', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleAccept = () => {
    if (optimizedText.trim()) {
      onAccept(optimizedText);
      handleClose();
      toast.success('System message updated', {
        description: 'The optimized version has been applied'
      });
    }
  };

  const handleClose = () => {
    setOptimizedText('');
    setAdditionalGuidance('');
    setShowGuidanceInput(false);
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(optimizedText);
    toast.success('Copied to clipboard');
  };

  const hasOptimizedText = optimizedText.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            Optimize System Message
          </DialogTitle>
          <DialogDescription>
            AI will help improve your system message for better clarity and effectiveness
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Original System Message */}
          <div className="flex flex-col min-h-0">
            <Label className="text-sm font-medium mb-2">Current System Message</Label>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {currentSystemMessage || <span className="text-gray-400 italic">No system message</span>}
              </p>
            </div>
          </div>

          {/* Optimized System Message */}
          <div className="flex flex-col min-h-0">
            <Label className="text-sm font-medium mb-2">Optimized Version</Label>
            <div className="flex-1 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4 overflow-y-auto relative">
              {isExecuting ? (
                <div className="space-y-3">
                  {optimizedText ? (
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                      {optimizedText}
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">{progress?.message || 'Processing...'}</span>
                    </div>
                  )}
                  {optimizedText && (
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Streaming response...</span>
                    </div>
                  )}
                </div>
              ) : hasOptimizedText ? (
                <>
                  <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {optimizedText}
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
        <div className="space-y-2">
          {!showGuidanceInput ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuidanceInput(true)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              + Add additional guidance (optional)
            </Button>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs text-gray-600 dark:text-gray-400">
                Additional Guidance (Optional)
              </Label>
              <Textarea
                value={additionalGuidance}
                onChange={(e) => setAdditionalGuidance(e.target.value)}
                placeholder="e.g., 'Make it more concise' or 'Focus on technical accuracy'"
                className="text-sm h-20 resize-none"
                disabled={isExecuting}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {hasOptimizedText && !isExecuting && (
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
              disabled={isExecuting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            
            {hasOptimizedText && !isExecuting ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleOptimize}
                  disabled={isExecuting}
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
                disabled={isExecuting || !currentSystemMessage.trim()}
                className={cn(
                  "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700",
                  isExecuting && "opacity-75"
                )}
              >
                {isExecuting ? (
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

