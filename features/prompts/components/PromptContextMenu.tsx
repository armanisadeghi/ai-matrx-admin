/**
 * PromptContextMenu Component
 * 
 * Provides a context menu with prompt execution options.
 * Allows users to right-click and select from available prompts.
 */

"use client";

import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PromptContextMenuProps } from '../types/execution';
import { usePromptExecution } from '../hooks/usePromptExecution';
import { toast } from 'sonner';

/**
 * Context menu for executing prompts on selected content
 */
export function PromptContextMenu({
  options,
  context,
  children,
  className
}: PromptContextMenuProps) {
  const { execute } = usePromptExecution();

  // Group options by group property
  const groupedOptions = options.reduce((acc, option) => {
    // Check visibility
    const isVisible = typeof option.visible === 'function'
      ? option.visible(context)
      : option.visible !== false;

    if (!isVisible) return acc;

    const group = option.group || 'default';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(option);
    return acc;
  }, {} as Record<string, typeof options>);

  const groups = Object.keys(groupedOptions);

  const handleOptionClick = async (option: typeof options[0]) => {
    const config = {
      ...option.config,
      context
    };

    try {
      const result = await execute(config);
      
      if (result.success) {
        toast.success('Prompt executed', {
          description: result.metadata.promptName
        });
      } else {
        toast.error('Execution failed', {
          description: result.error?.message
        });
      }
    } catch (error) {
      toast.error('Execution failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger className={cn('select-none', className)}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {groups.length === 0 ? (
          <ContextMenuItem disabled>
            No prompts available
          </ContextMenuItem>
        ) : groups.length === 1 ? (
          // Single group - render items directly
          groupedOptions[groups[0]].map((option, index) => {
            const Icon = option.icon || Sparkles;
            return (
              <ContextMenuItem
                key={index}
                onClick={() => handleOptionClick(option)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4" />
                {option.label}
              </ContextMenuItem>
            );
          })
        ) : (
          // Multiple groups - use submenus
          <>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Prompts
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56">
                {groups.map((group, groupIndex) => (
                  <React.Fragment key={group}>
                    {groupIndex > 0 && <ContextMenuSeparator />}
                    {groupedOptions[group].map((option, index) => {
                      const Icon = option.icon || Sparkles;
                      return (
                        <ContextMenuItem
                          key={`${group}-${index}`}
                          onClick={() => handleOptionClick(option)}
                          className="cursor-pointer"
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {option.label}
                        </ContextMenuItem>
                      );
                    })}
                  </React.Fragment>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Simple wrapper for text selection prompts
 */
export function TextSelectionPromptMenu({
  options,
  children,
  className
}: Omit<PromptContextMenuProps, 'context'>) {
  const [selectedText, setSelectedText] = React.useState('');

  const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString() || '';
    setSelectedText(text);
  };

  return (
    <div onMouseUp={handleSelection} onKeyUp={handleSelection}>
      <PromptContextMenu
        options={options}
        context={{ selectedText, selection: selectedText }}
        className={className}
      >
        {children}
      </PromptContextMenu>
    </div>
  );
}

