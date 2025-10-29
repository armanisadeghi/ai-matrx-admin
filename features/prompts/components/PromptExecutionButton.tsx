/**
 * PromptExecutionButton Component
 * 
 * A button component that executes a prompt when clicked.
 * Handles loading states, errors, and provides visual feedback.
 */

"use client";

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PromptExecutionButtonProps } from '../types/execution';
import { usePromptExecution } from '../hooks/usePromptExecution';
import { toast } from 'sonner';

/**
 * Button component for executing prompts programmatically
 */
export function PromptExecutionButton({
  config,
  label = 'Execute',
  variant = 'default',
  size = 'default',
  icon: Icon,
  fullWidth = false,
  className,
  disabled = false,
  tooltip,
  onExecutionStart,
  onExecutionComplete
}: PromptExecutionButtonProps) {
  const { execute, isExecuting, progress } = usePromptExecution();
  const [isPending, startTransition] = useTransition();
  const [showOverlay, setShowOverlay] = useState(false);

  const handleClick = async () => {
    if (isExecuting || disabled) return;

    setShowOverlay(true);
    onExecutionStart?.();

    startTransition(() => {
      execute(config).then(result => {
        setShowOverlay(false);
        
        if (result.success) {
          toast.success('Prompt executed successfully', {
            description: result.metadata.promptName
          });
          onExecutionComplete?.(result);
        } else {
          toast.error('Execution failed', {
            description: result.error?.message || 'Unknown error'
          });
        }
      }).catch(error => {
        setShowOverlay(false);
        toast.error('Execution failed', {
          description: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    });
  };

  const isLoading = isExecuting || isPending;
  const showLoadingOverlay = showOverlay && config.showLoading !== false;

  const button = (
    <div className="relative inline-block">
      <Button
        onClick={handleClick}
        disabled={disabled || isLoading}
        variant={variant}
        size={size}
        className={cn(
          fullWidth && 'w-full',
          className
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress?.message || 'Executing...'}
          </>
        ) : (
          <>
            {Icon && <Icon className="mr-2 h-4 w-4" />}
            {label}
          </>
        )}
      </Button>

      {showLoadingOverlay && (
        <div className="absolute inset-0 bg-background/50 dark:bg-background/70 rounded-md flex items-center justify-center backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}

/**
 * Icon-only variant for compact UIs
 */
export function PromptExecutionIconButton({
  config,
  icon: Icon,
  tooltip,
  variant = 'ghost',
  size = 'icon',
  className,
  disabled = false,
  onExecutionStart,
  onExecutionComplete
}: Omit<PromptExecutionButtonProps, 'label'> & {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <PromptExecutionButton
      config={config}
      label=""
      icon={Icon}
      variant={variant}
      size={size}
      className={className}
      disabled={disabled}
      tooltip={tooltip}
      onExecutionStart={onExecutionStart}
      onExecutionComplete={onExecutionComplete}
    />
  );
}

