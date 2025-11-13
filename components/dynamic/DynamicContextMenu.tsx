/**
 * DynamicContextMenu
 * 
 * Fully database-driven context menu that loads system prompts.
 * Shows "Coming Soon" for placeholders without actual prompts.
 * Replaces all hardcoded menu items.
 */

'use client';

import React, { useMemo } from 'react';
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
import { useContextMenuPrompts } from '@/hooks/useSystemPrompts';
import { PromptContextResolver, type UIContext } from '@/lib/services/prompt-context-resolver';
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DynamicContextMenuProps {
  children: React.ReactNode;
  uiContext?: UIContext;
  category?: string;
  subcategory?: string;
  className?: string;
}

interface GroupedPrompts {
  [category: string]: {
    label: string;
    subcategories?: {
      [subcategory: string]: {
        label: string;
        items: any[];
      };
    };
    items: any[];
  };
}

export function DynamicContextMenu({
  children,
  uiContext = {},
  category,
  subcategory,
  className,
}: DynamicContextMenuProps) {
  const { systemPrompts, loading } = useContextMenuPrompts(category, subcategory);
  const { execute, isExecuting } = usePromptExecution();
  const [executingId, setExecutingId] = React.useState<string | null>(null);
  const [selectedText, setSelectedText] = React.useState<string>('');

  // Capture selected text when context menu opens
  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    setSelectedText(text);
  };

  // Group prompts by category and subcategory
  const groupedPrompts = useMemo(() => {
    const groups: GroupedPrompts = {};

    systemPrompts.forEach((prompt) => {
      const cat = prompt.category || 'other';
      const subcat = prompt.subcategory;

      // Initialize category if needed
      if (!groups[cat]) {
        groups[cat] = {
          label: formatCategoryName(cat),
          items: [],
          subcategories: {},
        };
      }

      // If has subcategory, group there
      if (subcat) {
        if (!groups[cat].subcategories![subcat]) {
          groups[cat].subcategories![subcat] = {
            label: formatCategoryName(subcat),
            items: [],
          };
        }
        groups[cat].subcategories![subcat].items.push(prompt);
      } else {
        // Add to category directly
        groups[cat].items.push(prompt);
      }
    });

    return groups;
  }, [systemPrompts]);

  const handleActionTrigger = async (systemPrompt: any) => {
    // Check if placeholder
    if (systemPrompt.prompt_snapshot?.placeholder) {
      return; // Disabled
    }

    try {
      setExecutingId(systemPrompt.id);

      // Merge selected text with UI context
      const contextWithSelection = {
        ...uiContext,
        selection: selectedText,
        text: selectedText,
        content: selectedText,
      };

      // Resolve variables using the CODE
      const variables = PromptContextResolver.resolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'context-menu',
        contextWithSelection
      );

      // Check if can resolve
      const canResolve = PromptContextResolver.canResolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'context-menu',
        contextWithSelection
      );

      if (!canResolve.canResolve) {
        console.warn(`Cannot resolve variables for ${systemPrompt.name}:`, canResolve.missingVariables);
        return;
      }

      // Execute with resolved variables
      await execute({
        promptData: systemPrompt.prompt_snapshot,
        variables,
      });
    } catch (error) {
      console.error('Error executing system prompt:', error);
    } finally {
      setExecutingId(null);
    }
  };

  const checkRequirements = (systemPrompt: any): boolean => {
    const settings = systemPrompt.placement_settings || {};

    // If placeholder, disable
    if (systemPrompt.prompt_snapshot?.placeholder) {
      return true; // disabled
    }

    // If requires selection but none available
    if (settings.requiresSelection && !selectedText) {
      return true; // disabled
    }

    // If requires minimum selection length
    if (
      settings.minSelectionLength &&
      (!selectedText || selectedText.length < settings.minSelectionLength)
    ) {
      return true; // disabled
    }

    return false; // enabled
  };

  const renderMenuItem = (item: any) => {
    const isPlaceholder = item.prompt_snapshot?.placeholder;
    const isDisabled = checkRequirements(item);
    const isExecuting = executingId === item.id;

    return (
      <ContextMenuItem
        key={item.id}
        onClick={() => handleActionTrigger(item)}
        disabled={isDisabled || isExecuting}
        className={cn(
          'flex items-center gap-2',
          isPlaceholder && 'text-muted-foreground italic'
        )}
      >
        {isExecuting && <Loader2 className="h-3 w-3 animate-spin" />}
        {item.display_config?.icon && !isExecuting && (
          <span className="text-muted-foreground">{/* Icon placeholder */}</span>
        )}
        <span>{item.name}</span>
        {isPlaceholder && <span className="text-xs">(Coming Soon)</span>}
      </ContextMenuItem>
    );
  };

  if (loading) {
    return (
      <ContextMenu>
        <ContextMenuTrigger className={className} onContextMenu={handleContextMenu}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled>
            <Loader2 className="h-3 w-3 animate-spin mr-2" />
            Loading...
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  if (systemPrompts.length === 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger className={className} onContextMenu={handleContextMenu}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled>No actions available</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className={className} onContextMenu={handleContextMenu}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {Object.entries(groupedPrompts).map(([categoryKey, categoryData], index) => {
          const hasSubcategories =
            categoryData.subcategories && Object.keys(categoryData.subcategories).length > 0;

          // If category has both direct items and subcategories, render both
          if (hasSubcategories && categoryData.items.length > 0) {
            return (
              <React.Fragment key={categoryKey}>
                {index > 0 && <ContextMenuSeparator />}
                <ContextMenuSub>
                  <ContextMenuSubTrigger>{categoryData.label}</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {/* Direct items */}
                    {categoryData.items.map(renderMenuItem)}

                    {/* Subcategories */}
                    {categoryData.items.length > 0 && <ContextMenuSeparator />}
                    {Object.entries(categoryData.subcategories!).map(([subKey, subData]) => (
                      <ContextMenuSub key={subKey}>
                        <ContextMenuSubTrigger>{subData.label}</ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          {subData.items.map(renderMenuItem)}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </React.Fragment>
            );
          }

          // Category with only subcategories
          if (hasSubcategories) {
            return (
              <React.Fragment key={categoryKey}>
                {index > 0 && <ContextMenuSeparator />}
                <ContextMenuSub>
                  <ContextMenuSubTrigger>{categoryData.label}</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {Object.entries(categoryData.subcategories!).map(([subKey, subData]) => (
                      <ContextMenuSub key={subKey}>
                        <ContextMenuSubTrigger>{subData.label}</ContextMenuSubTrigger>
                        <ContextMenuSubContent>
                          {subData.items.map(renderMenuItem)}
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </React.Fragment>
            );
          }

          // Category with only direct items (standalone)
          if (categoryKey === 'standalone') {
            // Render standalone items at top level
            return (
              <React.Fragment key={categoryKey}>
                {index > 0 && <ContextMenuSeparator />}
                {categoryData.items.map(renderMenuItem)}
              </React.Fragment>
            );
          }

          // Regular category with direct items
          return (
            <React.Fragment key={categoryKey}>
              {index > 0 && <ContextMenuSeparator />}
              <ContextMenuSub>
                <ContextMenuSubTrigger>{categoryData.label}</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {categoryData.items.map(renderMenuItem)}
                </ContextMenuSubContent>
              </ContextMenuSub>
            </React.Fragment>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Helper function to format category names
function formatCategoryName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

