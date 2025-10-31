/**
 * MatrxActionsContextMenu Component
 * 
 * Enhanced context menu that displays actions hierarchically
 * - Top-level standalone actions
 * - Grouped actions in submenus
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
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvailableContext } from '../types';
import { buildContextMenu, getStandaloneActions, getGroupedActions } from '../utils/menu-builder';
import { toast } from 'sonner';

interface MatrxActionsContextMenuProps {
  /** Available context for actions */
  context?: AvailableContext;
  /** Children to wrap with context menu */
  children: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Callback when action is triggered */
  onActionTrigger?: (actionId: string, context: AvailableContext) => void;
}

/**
 * Get Lucide icon component by name
 */
function getIconComponent(iconName?: string): React.ComponentType<{ className?: string }> {
  if (!iconName) return LucideIcons.Sparkles;
  
  // @ts-ignore - Dynamic icon lookup
  const Icon = LucideIcons[iconName as keyof typeof LucideIcons];
  return Icon as React.ComponentType<{ className?: string }> || LucideIcons.Sparkles;
}

/**
 * Enhanced context menu for Matrx Actions
 */
export function MatrxActionsContextMenu({
  context = {},
  children,
  className,
  onActionTrigger
}: MatrxActionsContextMenuProps) {
  // Build menu structure based on context
  const standaloneActions = getStandaloneActions(context);
  const groupedActions = getGroupedActions(context);

  const handleActionClick = (actionId: string, actionName: string) => {
    console.log('Action triggered:', actionId, 'with context:', context);
    
    if (onActionTrigger) {
      onActionTrigger(actionId, context);
    } else {
      // Default behavior - show toast
      toast.info(`Action: ${actionName}`, {
        description: `This would execute the action with the provided context.${context.selectedText ? ` (${context.selectedText.length} chars selected)` : ''}`
      });
    }
  };

  const hasActions = standaloneActions.length > 0 || groupedActions.length > 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger className={cn('select-none', className)}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {!hasActions ? (
          <ContextMenuItem disabled>
            No actions available
          </ContextMenuItem>
        ) : (
          <>
            {/* Standalone Actions (Top-level) */}
            {standaloneActions.map((item, index) => {
              const Icon = getIconComponent(item.effectiveIcon);
              return (
                <ContextMenuItem
                  key={item.id}
                  onClick={() => handleActionClick(item.action.id, item.effectiveLabel)}
                  className="cursor-pointer"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.effectiveLabel}
                </ContextMenuItem>
              );
            })}

            {/* Separator between standalone and grouped */}
            {standaloneActions.length > 0 && groupedActions.length > 0 && (
              <ContextMenuSeparator />
            )}

            {/* Grouped Actions (Submenus) */}
            {groupedActions.map((category, categoryIndex) => {
              const categoryIcon = getIconComponent(
                category.category === 'matrx_create' ? 'Plus' :
                category.category === 'translation' ? 'Languages' :
                category.category === 'personal' ? 'User' :
                category.category === 'org' ? 'Building' :
                category.category === 'workspace' ? 'Folder' :
                'Sparkles'
              );
              
              return (
                <React.Fragment key={category.category}>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      {React.createElement(categoryIcon, { className: "mr-2 h-4 w-4" })}
                      {category.label}
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-56">
                      {/* Items directly in this category (no subcategory) */}
                      {category.items.map((item) => {
                        const Icon = getIconComponent(item.effectiveIcon);
                        return (
                          <ContextMenuItem
                            key={item.id}
                            onClick={() => handleActionClick(item.action.id, item.effectiveLabel)}
                            className="cursor-pointer"
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            {item.effectiveLabel}
                          </ContextMenuItem>
                        );
                      })}

                      {/* Subcategories */}
                      {category.subcategories && category.subcategories.length > 0 && (
                        <>
                          {category.items.length > 0 && <ContextMenuSeparator />}
                          {category.subcategories.map((subcategory) => (
                            <React.Fragment key={subcategory.subcategory}>
                              {subcategory.items.map((item) => {
                                const Icon = getIconComponent(item.effectiveIcon);
                                return (
                                  <ContextMenuItem
                                    key={item.id}
                                    onClick={() => handleActionClick(item.action.id, item.effectiveLabel)}
                                    className="cursor-pointer"
                                  >
                                    <Icon className="mr-2 h-4 w-4" />
                                    {item.effectiveLabel}
                                  </ContextMenuItem>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </>
                      )}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                </React.Fragment>
              );
            })}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Simple wrapper for text selection context menus
 */
export function TextSelectionMatrxMenu({
  children,
  className,
  onActionTrigger
}: Omit<MatrxActionsContextMenuProps, 'context'>) {
  const [context, setContext] = React.useState<AvailableContext>({});

  const handleSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    setContext({
      selectedText,
      // Could add more context here like editorContent, etc.
    });
  };

  return (
    <div onMouseUp={handleSelection} onKeyUp={handleSelection}>
      <MatrxActionsContextMenu
        context={context}
        className={className}
        onActionTrigger={onActionTrigger}
      >
        {children}
      </MatrxActionsContextMenu>
    </div>
  );
}

