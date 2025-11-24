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
} from 'lucide-react';
import { useUnifiedContextMenu } from '@/features/prompt-builtins/hooks';
import { useShortcutExecution } from '@/features/prompt-builtins/hooks';
import { PLACEMENT_TYPES, PLACEMENT_TYPE_META } from '@/features/prompt-builtins/constants';
import type { MenuItem, ContentBlockItem, ShortcutItem } from '@/features/prompt-builtins/types/menu';
import { TextActionResultModal } from '@/components/modals/TextActionResultModal';
import { useQuickActions } from '@/features/quick-actions/hooks/useQuickActions';
import { useAppSelector } from '@/lib/redux';
import { selectIsDebugMode } from '@/lib/redux/slices/adminDebugSlice';
import { SystemPromptDebugModal } from '@/components/debug/SystemPromptDebugModal';
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

  // Selection tracking
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; element: HTMLElement | null } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlightBox, setHighlightBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Text result modal
  const [textResultModalOpen, setTextResultModalOpen] = useState(false);
  const [textResultData, setTextResultData] = useState<{ original: string; result: string; promptName: string } | null>(null);

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
    let text = '';
    let start = 0;
    let end = 0;
    let element: HTMLElement | null = null;
    let highlightRect = null;

    // For textareas and inputs, get selection directly from the element
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      start = target.selectionStart || 0;
      end = target.selectionEnd || 0;
      element = target;
      // Get the actual selected text from the textarea value
      text = target.value.substring(start, end).trim();
      
      // For textareas, we'll use a CSS-based approach with the selection still active
      // Keep the selection active by not calling anything that clears it
    } else {
      // For contenteditable elements, use window selection
      const selection = window.getSelection();
      text = selection?.toString().trim() || '';
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        start = range.startOffset;
        end = range.endOffset;
        element = target;
        
        // Get the visual bounds of the selection for highlighting
        try {
          const rects = range.getBoundingClientRect();
          const parentRect = target.getBoundingClientRect();
          highlightRect = {
            top: rects.top - parentRect.top,
            left: rects.left - parentRect.left,
            width: rects.width,
            height: rects.height,
          };
        } catch (err) {
          // Ignore if we can't get bounds
        }
      }
    }

    // Store the selection immediately, before the menu opens and selection is cleared
    setSelectedText(text);
    setSelectionRange({ start, end, element });
    setHighlightBox(highlightRect);
    setMenuOpen(true);

    if (DEBUG) {
      console.log('[UnifiedContextMenu] Selection captured:', { text, start, end, highlightRect });
    }
  };

  // Restore selection when menu closes
  const handleMenuClose = () => {
    setMenuOpen(false);
    setHighlightBox(null);
    
    // Restore selection if we have it stored
    if (selectionRange && selectionRange.element) {
      setTimeout(() => {
        const { element, start, end } = selectionRange;
        if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
          element.focus();
          element.setSelectionRange(start, end);
        }
      }, 0);
    }
  };

  // Browser action handlers
  const handleCut = () => {
    if (selectionRange?.element) {
      document.execCommand('cut');
    }
  };

  const handleCopy = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
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
    if (selectionRange?.element) {
      const element = selectionRange.element;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        element.select();
      } else {
        document.execCommand('selectAll');
      }
    }
  };

  const handleFind = () => {
    // Trigger browser's native find (Ctrl+F / Cmd+F)
    document.execCommand('find');
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
          <ContextMenuSubTrigger>
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
          <div className={menuOpen ? 'relative' : ''}>
            {children}
            {/* Visual selection highlight overlay when menu is open */}
            {menuOpen && highlightBox && (
              <div
                className="absolute pointer-events-none bg-primary/20 rounded"
                style={{
                  top: `${highlightBox.top}px`,
                  left: `${highlightBox.left}px`,
                  width: `${highlightBox.width}px`,
                  height: `${highlightBox.height}px`,
                }}
              />
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className={`w-64 ${className}`}>
          {loading && (
            <ContextMenuLabel className="text-xs text-muted-foreground">Loading...</ContextMenuLabel>
          )}

          {/* Browser Actions - Show when applicable */}
          {(selectedText || isEditable) && (
            <>
              {selectedText && (
                <>
                  <ContextMenuItem onSelect={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </ContextMenuItem>
                  {isEditable && (
                    <ContextMenuItem onSelect={handleCut}>
                      <Scissors className="h-4 w-4 mr-2" />
                      Cut
                    </ContextMenuItem>
                  )}
                </>
              )}
              {isEditable && (
                <ContextMenuItem onSelect={handlePaste}>
                  <Clipboard className="h-4 w-4 mr-2" />
                  Paste
                </ContextMenuItem>
              )}
              <ContextMenuItem onSelect={handleSelectAll}>
                <Type className="h-4 w-4 mr-2" />
                Select All
              </ContextMenuItem>
              <ContextMenuItem onSelect={handleFind}>
                <Search className="h-4 w-4 mr-2" />
                Find...
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          {/* Dynamically render placement type sections */}
          {Object.entries(groupedByPlacement).map(([placementType, groups], index) => {
            if (!shouldShowPlacement(placementType)) return null;

            const PlacementIcon = getPlacementIcon(placementType);
            const placementMeta = PLACEMENT_TYPE_META[placementType as keyof typeof PLACEMENT_TYPE_META];
            const label = placementMeta?.label || placementType;

            return (
              <React.Fragment key={placementType}>

                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <PlacementIcon className="h-4 w-4 mr-2" />
                    {label}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-64">
                    {groups.length === 0 ? (
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

          {/* Quick Actions Section (Hard-coded for now) */}
          {shouldShowPlacement('quick-action') && (
            <>
              {Object.keys(groupedByPlacement).length > 0 && <ContextMenuSeparator />}

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
    </>
  );
}
