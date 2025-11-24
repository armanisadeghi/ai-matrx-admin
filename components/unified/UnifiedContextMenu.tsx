/**
 * UnifiedContextMenu
 * 
 * App-wide context menu that dynamically loads shortcuts from the database.
 * Supports multiple placement types:
 * - AI Actions (ai-action)
 * - Content Blocks (content-block)
 * - Organization Tools (organization-tool)
 * - User Tools (user-tool)
 * - Quick Actions (hard-coded for now, will be migrated to DB)
 * 
 * Use this anywhere text is displayed or editable.
 */

'use client';

import React, { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuLabel,
} from '@/components/ui/context-menu';
import {
  StickyNote,
  CheckSquare,
  MessageSquare,
  Database,
  FolderOpen,
  Sparkles,
  FileText,
  Zap,
  Building,
  User,
  Scissors,
  Copy,
  Clipboard,
  Type,
  Search,
  Bug,
} from 'lucide-react';
import { useUnifiedContextMenu } from '@/features/prompt-builtins/hooks';
import { useShortcutExecution } from '@/features/prompt-builtins/hooks';
import { PLACEMENT_TYPES, PLACEMENT_TYPE_META } from '@/features/prompt-builtins/constants';
import type { MenuItem, ContentBlockItem, ShortcutItem } from '@/features/prompt-builtins/types/menu';
import { TextActionResultModal } from '@/components/modals/TextActionResultModal';
import { FindReplaceModal } from '@/components/modals/FindReplaceModal';
import { useQuickActions } from '@/features/quick-actions/hooks/useQuickActions';
import { useAppSelector } from '@/lib/redux';
import { selectIsDebugMode } from '@/lib/redux/slices/adminDebugSlice';
import { SystemPromptDebugModal } from '@/components/debug/SystemPromptDebugModal';
import { ContextDebugModal } from '@/components/debug/ContextDebugModal';
import { getIconComponent } from '@/components/official/IconResolver';

interface UnifiedContextMenuProps {
  children: React.ReactNode;
  /** For rich text editors: provide editor ID */
  editorId?: string;
  /** For textareas: provide getter function */
  getTextarea?: () => HTMLTextAreaElement | null;
  /** Callback after content inserted */
  onContentInserted?: () => void;
  /** For text editors: text replacement callbacks */
  onTextReplace?: (newText: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  /** Is this wrapping an editable element? */
  isEditable?: boolean;
  /** Enable/disable specific placement types */
  enabledPlacements?: string[];
  /** 
   * Context data for scope mapping
   * 
   * Standard scopes (automatically handled):
   * - selection: Captured automatically from user's text selection
   * 
   * Configurable scopes (set per usage):
   * - content: Primary content (e.g., full text of textarea, code file, note)
   * - context: Broader context (e.g., imported files, open tabs, surrounding data)
   * 
   * Custom variables (usage-specific):
   * - Any custom key-value pairs for special shortcuts
   * - Examples: ts_errors, terminal_output, file_path, etc.
   * 
   * Example usage in code editor:
   * {
   *   content: fullCodeFile,
   *   context: importedFiles + openTabs,
   *   ts_errors: typescriptErrors,
   *   terminal_output: recentTerminalOutput
   * }
   */
  contextData?: {
    /** Primary content - main text/data being worked with */
    content?: string;
    /** Broader context - surrounding or related information */
    context?: string;
    /** Context filter for enabled_contexts filtering */
    contextFilter?: string;
    /** Any custom variables for shortcuts */
    [key: string]: any;
  };
  className?: string;
}

const DEBUG = false;

export function UnifiedContextMenu({
  children,
  editorId,
  getTextarea,
  onContentInserted,
  onTextReplace,
  onTextInsertBefore,
  onTextInsertAfter,
  isEditable = false,
  enabledPlacements = [
    PLACEMENT_TYPES.AI_ACTION,
    PLACEMENT_TYPES.CONTENT_BLOCK,
    PLACEMENT_TYPES.ORGANIZATION_TOOL,
    PLACEMENT_TYPES.USER_TOOL,
    'quick-action', // Hard-coded for now
  ],
  contextData = {},
  className,
}: UnifiedContextMenuProps) {
  // Determine which placement types to load from DB (everything except quick-action)
  const dbPlacementTypes = enabledPlacements.filter(p => p !== 'quick-action');

  if (DEBUG) {
    console.log('[UnifiedContextMenu] Config:', {
      enabledPlacements,
      dbPlacementTypes,
      PLACEMENT_TYPES,
    });
  }

  // Load ALL menu items (shortcuts + content blocks) from unified view 
  // Extract contextFilter from contextData if provided
  const contextFilter = contextData?.contextFilter as string | undefined;
  const { categoryGroups, loading } = useUnifiedContextMenu(
    dbPlacementTypes,
    contextFilter, // Pass context filter for filtering by enabled_contexts
    dbPlacementTypes.length > 0
  );

  // Execution
  const { executeShortcut, streamingText } = useShortcutExecution();

  // Quick Actions via Redux (hard-coded)
  const {
    openQuickNotes,
    openQuickTasks,
    openQuickChat,
    openQuickData,
    openQuickFiles,
  } = useQuickActions();

  // Debug mode
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [contextDebugOpen, setContextDebugOpen] = useState(false);

  // Selection tracking
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{
    type: 'editable' | 'non-editable';
    // For editable elements
    element: HTMLElement | null;
    start: number;
    end: number;
    // For non-editable elements
    range?: Range | null;
    containerElement?: HTMLElement | null;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Text result modal
  const [textResultModalOpen, setTextResultModalOpen] = useState(false);
  const [textResultData, setTextResultData] = useState<{ original: string; result: string; promptName: string } | null>(null);

  // Find/Replace modal
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);

  // Track selection
  React.useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      setSelectedText(text);
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // EDITABLE PATH: textareas and inputs
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;
      const text = target.value.substring(start, end);
      
      setSelectedText(text);
      setSelectionRange({
        type: 'editable',
        element: target,
        start,
        end,
        range: null,
        containerElement: null,
      });
      setMenuOpen(true);

      if (DEBUG) {
        console.log('[UnifiedContextMenu] EDITABLE selection captured:', { 
          text, 
          start, 
          end, 
          hasText: text.length > 0,
          elementType: target.tagName
        });
      }
    } else {
      // NON-EDITABLE PATH: regular elements with text selection
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      let range: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        // Clone the range so we can restore it later
        range = selection.getRangeAt(0).cloneRange();
      }
      
      // Find the closest context menu container
      let containerElement = e.currentTarget as HTMLElement;
      if (containerElement.hasAttribute('data-radix-context-menu-trigger')) {
        // Already the trigger
      } else {
        // Search for the trigger within currentTarget
        const trigger = containerElement.querySelector('[data-radix-context-menu-trigger]');
        if (trigger instanceof HTMLElement) {
          containerElement = trigger;
        }
      }
      
      setSelectedText(text);
      setSelectionRange({
        type: 'non-editable',
        element: null,
        start: 0,
        end: 0,
        range,
        containerElement,
      });
      setMenuOpen(true);

      if (DEBUG) {
        console.log('[UnifiedContextMenu] NON-EDITABLE selection captured:', { 
          text,
          hasRange: !!range,
          hasText: text.length > 0,
          containerElement: containerElement.tagName
        });
      }
    }
  };

  // Restore selection when menu closes
  const handleMenuClose = () => {
    setMenuOpen(false);
    
    if (!selectionRange) return;
    
    if (selectionRange.type === 'editable') {
      // EDITABLE PATH: Restore textarea/input selection
      const { element, start, end } = selectionRange;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        // Longer delay to wait for menu animation to complete
        setTimeout(() => {
          element.focus();
          element.setSelectionRange(start, end);
          
          if (DEBUG) {
            console.log('[UnifiedContextMenu] Restored EDITABLE selection:', { start, end });
          }
        }, 150); // Increased delay for reliable restoration
      }
    } else {
      // NON-EDITABLE PATH: Restore DOM selection using Range
      const { range } = selectionRange;
      if (range) {
        setTimeout(() => {
          try {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
              
              if (DEBUG) {
                console.log('[UnifiedContextMenu] Restored NON-EDITABLE selection');
              }
            }
          } catch (error) {
            console.error('[UnifiedContextMenu] Failed to restore selection:', error);
          }
        }, 50); // Shorter delay for non-editable since no focus needed
      }
    }
  };

  // Browser action handlers
  const handleCut = () => {
    if (selectionRange?.element) {
      document.execCommand('cut');
      // Clear stored selection after cut
      setSelectionRange(null);
    }
  };

  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      // Don't clear selection for copy - we want to keep it
    }
  };

  const handlePaste = async () => {
    if (selectionRange?.element && isEditable) {
      try {
        const text = await navigator.clipboard.readText();
        const element = selectionRange.element;
        
        if (element instanceof HTMLTextAreaElement) {
          const { start, end } = selectionRange;
          const before = element.value.substring(0, start);
          const after = element.value.substring(end);
          const newValue = before + text + after;
          
          if (onTextReplace) {
            // Use callback if provided
            onTextReplace(newValue);
          } else {
            // Fallback: direct update
            element.value = newValue;
            element.setSelectionRange(start + text.length, start + text.length);
          }
        }
      } catch (err) {
        console.error('Failed to paste:', err);
      }
    }
  };

  const handleSelectAll = () => {
    if (!selectionRange) return;
    
    // Clear the stored selection so handleMenuClose doesn't restore the old one
    const selectionToUse = selectionRange;
    setSelectionRange(null);
    
    if (selectionToUse.type === 'editable') {
      // EDITABLE PATH: Use element.select()
      const element = selectionToUse.element;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        // Use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
          element.focus();
          element.select();
          
          if (DEBUG) {
            console.log('[UnifiedContextMenu] Select All - EDITABLE');
          }
        });
      }
    } else {
      // NON-EDITABLE PATH: Create Range for container content only
      const container = selectionToUse.containerElement;
      if (container) {
        requestAnimationFrame(() => {
          try {
            const range = document.createRange();
            range.selectNodeContents(container);
            
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
              
              if (DEBUG) {
                console.log('[UnifiedContextMenu] Select All - NON-EDITABLE');
              }
            }
          } catch (error) {
            console.error('[UnifiedContextMenu] Select all failed:', error);
          }
        });
      }
    }
  };

  const handleFind = () => {
    setFindReplaceOpen(true);
  };

  // Handle shortcut execution
  const handleShortcutTrigger = async (shortcut: any, placementType: string) => {
    try {
      // Build scope context with all provided data
      // Standard scopes
      const scopes: Record<string, string> = {
        selection: selectedText || '', // Auto-captured from user selection
        content: contextData?.content || '', // Primary content (configurable)
        context: contextData?.context || '', // Broader context (configurable)
      };

      // Add all custom variables from contextData
      if (contextData) {
        Object.keys(contextData).forEach(key => {
          // Skip standard keys and internal keys
          if (key !== 'content' && key !== 'context' && key !== 'contextFilter') {
            scopes[key] = contextData[key];
          }
        });
      }

      console.log('[UnifiedContextMenu] Executing with scopes:', JSON.stringify(scopes, null, 2));

      if (isDebugMode) {
        setDebugData({
          shortcutLabel: shortcut.label,
          placementType,
          scopes,
          scopeMappings: shortcut.scope_mappings,
          availableScopes: shortcut.available_scopes,
          builtinVariables: shortcut.prompt_builtin?.variableDefaults,
        });
        setDebugModalOpen(true);
      }

      // Check if builtin is connected
      if (!shortcut.prompt_builtin) {
        alert(`"${shortcut.label}" has no connected prompt. Please configure in admin panel.`);
        return;
      }

      // Check if shortcut is configured for inline execution
      const resultDisplay = shortcut.result_display || 'modal';

      if (resultDisplay === 'inline' && isEditable && selectionRange && onTextReplace) {
        // Execute inline - we'll handle the result with the captured selection range
        const result = await executeShortcut(shortcut, {
          scopes,
        });

        // If we got a result and have selection range, replace the text
        if (result && typeof result === 'string') {
          const resultText: string = result;

          if (selectionRange.element instanceof HTMLTextAreaElement) {
            const textarea = selectionRange.element;
            const { start } = selectionRange;

            // Update via callback
            onTextReplace(resultText);

            // Restore focus and select replaced text
            setTimeout(() => {
              textarea.focus();
              textarea.setSelectionRange(start, start + resultText.length);
            }, 0);
          }
        }
      } else {
        // Execute according to shortcut's configured result_display and boolean flags
        await executeShortcut(shortcut, {
          scopes,
        });
      }
    } catch (error) {
      console.error('[UnifiedContextMenu] Error executing shortcut:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  };

  // Handle content block insertion
  const handleContentBlockInsert = (block: ContentBlockItem) => {
    const template = block.template;

    if (editorId) {
      // Use editor insertion
      const { insertTextAtCursor } = require('@/features/rich-text-editor/utils/insertTextUtils');
      const success = insertTextAtCursor(editorId, template);
      if (success) onContentInserted?.();
    } else if (getTextarea) {
      // Use textarea insertion
      const { insertTextAtTextareaCursor } = require('@/features/prompts/utils/textareaInsertUtils');
      const textarea = getTextarea();
      if (textarea) {
        const success = insertTextAtTextareaCursor(textarea, template);
        if (success) onContentInserted?.();
      }
    }
  };

  // Handle menu item selection (handles BOTH shortcuts and content blocks!)
  const handleMenuItemSelect = (item: MenuItem, placementType: string) => {
    if (item.type === 'prompt_shortcut') {
      // Convert to the format expected by handleShortcutTrigger
      const shortcutData = {
        ...item,
        prompt_builtin: item.prompt_builtin,
        is_active: true,
      };
      handleShortcutTrigger(shortcutData as any, placementType);
    } else if (item.type === 'content_block') {
      handleContentBlockInsert(item);
    }
  };

  // Helper to get Lucide icon component
  const getIcon = (iconName?: string | null) => {
    if (!iconName) return FileText;
    return getIconComponent(iconName, "FileText");
  };

  // Get icon for placement type
  const getPlacementIcon = (placementType: string) => {
    const icons: Record<string, any> = {
      [PLACEMENT_TYPES.AI_ACTION]: Sparkles,
      [PLACEMENT_TYPES.CONTENT_BLOCK]: FileText,
      [PLACEMENT_TYPES.ORGANIZATION_TOOL]: Building,
      [PLACEMENT_TYPES.USER_TOOL]: User,
      'quick-action': Zap,
    };
    return icons[placementType] || FileText;
  };

  // Group category groups by placement type
  const groupedByPlacement = React.useMemo(() => {
    const groups: Record<string, typeof categoryGroups> = {};

    categoryGroups.forEach(group => {
      const placementType = group.category.placement_type;
      if (!groups[placementType]) {
        groups[placementType] = [];
      }
      groups[placementType].push(group);
    });

    if (DEBUG) {
      console.log('[UnifiedContextMenu] Grouped by placement:', {
        totalGroups: categoryGroups.length,
        placementTypes: Object.keys(groups),
        details: Object.entries(groups).map(([type, grps]) => ({
          type,
          categoryCount: grps.length,
          categories: grps.map(g => ({
            label: g.category.label,
            itemCount: g.items.length,
            itemTypes: [...new Set(g.items.map(i => i.type))],
          })),
        })),
      });
    }

    return groups;
  }, [categoryGroups]);

  // Check if a placement type should be shown
  const shouldShowPlacement = (placementType: string) => {
    return enabledPlacements.includes(placementType);
  };

  // Recursive function to render category hierarchy
  const renderCategoryGroup = (group: typeof categoryGroups[0], placementType: string) => {
    const { category, items, children } = group;
    const CategoryIcon = getIcon(category.icon_name);

    // Show category even if empty (user wants this!)
    const hasContent = items.length > 0 || (children && children.length > 0);

    return (
      <React.Fragment key={category.id}>
        <ContextMenuSub>
          <ContextMenuSubTrigger className={!hasContent ? 'opacity-50 cursor-not-allowed' : ''}>
            <CategoryIcon
              className="h-4 w-4 mr-2"
              style={{ color: category.color || 'currentColor' }}
            />
            {category.label}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64">
            {/* Show message if empty */}
            {!hasContent && (
              <div className="px-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">No items in {category.label}</p>
              </div>
            )}

            {/* Render items in this category */}
            {items.map(item => {
              // Get icon based on item type
              const ItemIcon = item.type === 'content_block'
                ? item.icon
                : getIcon(item.icon_name);

              // Check if disabled (only for shortcuts)
              const isDisabled = item.type === 'prompt_shortcut'
                && (!item.prompt_builtin || !item.prompt_builtin_id);

              return (
                <ContextMenuItem
                  key={item.id}
                  onSelect={() => handleMenuItemSelect(item, placementType)}
                  disabled={isDisabled}
                >
                  <ItemIcon className="h-4 w-4 mr-2" />
                  {item.label}
                  {isDisabled && (
                    <span className="ml-auto text-xs text-muted-foreground">Not configured</span>
                  )}
                </ContextMenuItem>
              );
            })}

            {/* Recursively render child categories */}
            {children && children.length > 0 && (
              <>
                {items.length > 0 && <ContextMenuSeparator />}
                {children.map(childGroup => renderCategoryGroup(childGroup, placementType))}
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </React.Fragment>
    );
  };

  return (
    <>
      <ContextMenu onOpenChange={(open) => !open && handleMenuClose()}>
        <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
          {children}
        </ContextMenuTrigger>

        <ContextMenuContent className={`w-64 ${className}`}>
          {loading && (
            <ContextMenuLabel className="text-xs text-muted-foreground">Loading...</ContextMenuLabel>
          )}

          {/* Selection Indicator - Show when editable element has selected text */}
          {selectionRange?.type === 'editable' && selectedText && (
            <>
              <div className="px-2 py-2 border-b border-border bg-primary/5">
                <div className="flex items-start gap-2">
                  <Type className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-primary mb-0.5">
                      Selected ({selectedText.length} char{selectedText.length !== 1 ? 's' : ''})
                    </div>
                    <div className="text-xs text-muted-foreground font-mono break-all leading-tight">
                      {selectedText.length <= 50 
                        ? `"${selectedText}"`
                        : `"${selectedText.substring(0, 20)}...${selectedText.substring(selectedText.length - 20)}"`
                      }
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Browser Actions - Always show, but disable when not applicable */}
          <ContextMenuItem onSelect={handleCopy} disabled={!selectedText}>
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleCut} disabled={!selectedText || !isEditable}>
            <Scissors className="h-4 w-4 mr-2" />
            Cut
          </ContextMenuItem>
          <ContextMenuItem onSelect={handlePaste} disabled={!isEditable}>
            <Clipboard className="h-4 w-4 mr-2" />
            Paste
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleSelectAll}>
            <Type className="h-4 w-4 mr-2" />
            Select All
          </ContextMenuItem>
          <ContextMenuItem onSelect={handleFind}>
            <Search className="h-4 w-4 mr-2" />
            Find...
          </ContextMenuItem>
          <ContextMenuSeparator />

          {/* Dynamically render placement type sections - Always show, disable if empty */}
          {enabledPlacements.filter(p => p !== 'quick-action').map((placementType) => {
            const groups = groupedByPlacement[placementType] || [];
            
            // Recursively check if any group or its children have items
            const hasItemsRecursive = (group: typeof groups[0]): boolean => {
              if (group.items.length > 0) return true;
              if (group.children && group.children.length > 0) {
                return group.children.some(child => hasItemsRecursive(child));
              }
              return false;
            };
            
            const hasItems = groups.length > 0 && groups.some(g => hasItemsRecursive(g));
            
            const PlacementIcon = getPlacementIcon(placementType);
            const placementMeta = PLACEMENT_TYPE_META[placementType as keyof typeof PLACEMENT_TYPE_META];
            const label = placementMeta?.label || placementType;

            return (
              <React.Fragment key={placementType}>
                <ContextMenuSub>
                  <ContextMenuSubTrigger 
                    disabled={!hasItems}
                    className={!hasItems ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    <PlacementIcon className="h-4 w-4 mr-2" />
                    {label}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-64">
                    {groups.length === 0 || !hasItems ? (
                      <div className="px-2 py-6 text-center">
                        <p className="text-sm text-muted-foreground">No {label}</p>
                      </div>
                    ) : (
                      <>
                        {/* Render hierarchical categories recursively */}
                        {groups.map(group => renderCategoryGroup(group, placementType))}
                      </>
                    )}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </React.Fragment>
            );
          })}

          {/* Quick Actions Section - Always show if enabled */}
          {shouldShowPlacement('quick-action') && (
            <>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Actions
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  <ContextMenuItem onSelect={() => openQuickNotes()}>
                    <StickyNote className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Notes</span>
                      <span className="text-xs text-muted-foreground">Quick capture</span>
                    </div>
                  </ContextMenuItem>

                  <ContextMenuItem onSelect={() => openQuickTasks()}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Tasks</span>
                      <span className="text-xs text-muted-foreground">Manage tasks</span>
                    </div>
                  </ContextMenuItem>

                  <ContextMenuItem onSelect={() => openQuickChat()}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Chat</span>
                      <span className="text-xs text-muted-foreground">AI assistant</span>
                    </div>
                  </ContextMenuItem>

                  <ContextMenuItem onSelect={() => openQuickData()}>
                    <Database className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Data</span>
                      <span className="text-xs text-muted-foreground">View tables</span>
                    </div>
                  </ContextMenuItem>

                  <ContextMenuItem onSelect={() => openQuickFiles()}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Files</span>
                      <span className="text-xs text-muted-foreground">Browse files</span>
                    </div>
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}

          {/* Debug: Context Inspector */}
          {isDebugMode && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem 
                onSelect={() => setContextDebugOpen(true)}
                className="text-amber-600 dark:text-amber-400"
              >
                <Bug className="h-4 w-4 mr-2" />
                Debug: Inspect Context
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Debug Modal */}
      {isDebugMode && (
        <SystemPromptDebugModal
          isOpen={debugModalOpen}
          onClose={() => setDebugModalOpen(false)}
          debugData={debugData}
        />
      )}

      {/* Context Debug Modal */}
      {isDebugMode && (
        <ContextDebugModal
          isOpen={contextDebugOpen}
          onClose={() => setContextDebugOpen(false)}
          contextData={{
            selection: selectedText,
            content: contextData?.content || '',
            context: contextData?.context || '',
            ...contextData, // Include all custom variables
          }}
        />
      )}

      {/* Text Result Modal */}
      {textResultModalOpen && textResultData && (
        <TextActionResultModal
          isOpen={textResultModalOpen}
          onClose={() => {
            setTextResultModalOpen(false);
            setTextResultData(null);
            setSelectionRange(null);
            setSelectedText('');
          }}
          originalText={textResultData.original}
          aiResponse={streamingText || textResultData.result}
          promptName={textResultData.promptName}
          onReplace={(newText) => {
            onTextReplace?.(newText);
            setSelectionRange(null);
            setSelectedText('');
            setTextResultModalOpen(false);
          }}
          onInsertBefore={(text) => {
            onTextInsertBefore?.(text);
            setSelectionRange(null);
            setSelectedText('');
            setTextResultModalOpen(false);
          }}
          onInsertAfter={(text) => {
            onTextInsertAfter?.(text);
            setSelectionRange(null);
            setSelectedText('');
            setTextResultModalOpen(false);
          }}
        />
      )}

      {/* Find/Replace Modal */}
      <FindReplaceModal
        isOpen={findReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
        targetElement={selectionRange?.element as HTMLTextAreaElement | HTMLInputElement | null}
        onReplace={onTextReplace}
      />
    </>
  );
}
