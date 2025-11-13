/**
 * DynamicContextMenu
 * 
 * Fully database-driven context menu that loads system prompts.
 * Shows "Coming Soon" for placeholders without actual prompts.
 * Replaces all hardcoded menu items.
 */

'use client';

import React, { useMemo, useState, useEffect } from 'react';
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
import { PromptRunnerModal } from '@/features/prompts/components/modal/PromptRunnerModal';
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
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>(null);

  // Track selected text on selection change
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      setSelectedText(text);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    // Capture text on context menu open
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
    console.log('[DynamicContextMenu] Action triggered:', systemPrompt.name);
    
    // Check if placeholder
    if (systemPrompt.prompt_snapshot?.placeholder) {
      console.log('[DynamicContextMenu] Skipping placeholder:', systemPrompt.name);
      return; // Disabled
    }

    try {
      // Merge selected text with UI context
      const contextWithSelection = {
        ...uiContext,
        selection: selectedText,
        text: selectedText,
        content: selectedText,
        selected_text: selectedText,
        content_to_explain: selectedText,
        current_code: selectedText,
      };

      console.log('[DynamicContextMenu] Context with selection:', {
        selectedTextLength: selectedText.length,
        contextKeys: Object.keys(contextWithSelection),
      });

      // Resolve variables using the CODE
      const variables = PromptContextResolver.resolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'context-menu',
        contextWithSelection
      );

      console.log('[DynamicContextMenu] Resolved variables:', variables);

      // Check if can resolve
      const canResolve = PromptContextResolver.canResolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'context-menu',
        contextWithSelection
      );

      console.log('[DynamicContextMenu] Can resolve check:', canResolve);

      if (!canResolve.canResolve) {
        console.warn(`[DynamicContextMenu] Cannot resolve variables for ${systemPrompt.name}:`, canResolve.missingVariables);
        alert(`Cannot execute: Missing variables - ${canResolve.missingVariables.join(', ')}`);
        return;
      }

      // Get placement settings
      const settings = systemPrompt.placement_settings || {};
      const allowChat = settings.allowChat ?? true;
      const allowInitialMessage = settings.allowInitialMessage ?? false;

      console.log('[DynamicContextMenu] Opening modal with config:', {
        title: systemPrompt.name,
        mode: allowChat ? 'auto-run' : 'auto-run-one-shot',
        variableCount: Object.keys(variables).length,
      });

      // Open modal with the prompt
      const config = {
        promptData: systemPrompt.prompt_snapshot,
        variables,
        mode: allowChat ? 'auto-run' : 'auto-run-one-shot',
        title: systemPrompt.name,
        initialMessage: allowInitialMessage ? undefined : '',
      };
      
      setModalConfig(config);
      setModalOpen(true);
      
      console.log('[DynamicContextMenu] Modal state set - modalOpen should be true');
    } catch (error) {
      console.error('[DynamicContextMenu] Error executing system prompt:', error);
      alert(`Error: ${error.message}`);
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
    <>
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

    {/* Modal for execution */}
    {modalOpen && modalConfig ? (
      <PromptRunnerModal
        isOpen={modalOpen}
        onClose={() => {
          console.log('[DynamicContextMenu] Closing modal');
          setModalOpen(false);
          setModalConfig(null);
        }}
        promptData={modalConfig.promptData}
        variables={modalConfig.variables}
        mode={modalConfig.mode}
        title={modalConfig.title}
        initialMessage={modalConfig.initialMessage}
      />
    ) : null}
  </>
  );
}

// Helper function to format category names
function formatCategoryName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

