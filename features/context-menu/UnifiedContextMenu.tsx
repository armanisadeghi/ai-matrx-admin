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
  Eye,
  EyeOff,
  Settings,
  Shield,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useUnifiedContextMenu } from '@/features/prompt-builtins/hooks';
import { PLACEMENT_TYPES, PLACEMENT_TYPE_META } from '@/features/prompt-builtins/constants';
import { mapScopeToVariables } from '@/features/prompt-builtins/utils/execution';
import { usePromptRunner } from '@/features/prompts/hooks/usePromptRunner';
import type { MenuItem, ContentBlockItem, ShortcutItem } from '@/features/prompt-builtins/types/menu';
import { TextActionResultModal } from '@/components/modals/TextActionResultModal';
import { FindReplaceModal } from '@/components/modals/FindReplaceModal';
import { useQuickActions } from '@/features/quick-actions/hooks/useQuickActions';
import { useAppSelector, useAppDispatch } from '@/lib/redux';
import { selectIsDebugMode, toggleDebugMode, showPromptDebugIndicator } from '@/lib/redux/slices/adminDebugSlice';
import { selectIsAdmin } from '@/lib/redux/slices/userSlice';
import { selectIsOverlayOpen, toggleOverlay } from '@/lib/redux/slices/overlaySlice';
import { ContextDebugModal } from '@/components/debug/ContextDebugModal';
import { getIconComponent } from '@/components/official/IconResolver';
import { toast } from '@/components/ui/use-toast';

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

  // Execution via unified Redux system
  const { openPrompt } = usePromptRunner();

  // Quick Actions via Redux (hard-coded)
  const {
    openQuickNotes,
    openQuickTasks,
    openQuickChat,
    openQuickData,
    openQuickFiles,
  } = useQuickActions();

  // Admin features
  const dispatch = useAppDispatch();
  const isAdmin = useAppSelector(selectIsAdmin);
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const isAdminIndicatorOpen = useAppSelector((state) => selectIsOverlayOpen(state, "adminIndicator"));
  
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
  const [skipSelectionRestore, setSkipSelectionRestore] = useState(false);
  const findReplaceOpenRef = React.useRef(false);

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

  // Keep ref in sync with state for reliable closure access
  React.useEffect(() => {
    findReplaceOpenRef.current = findReplaceOpen;
  }, [findReplaceOpen]);

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
    
    // Skip restoration if a modal is opening (like Find/Replace)
    if (skipSelectionRestore) {
      setSkipSelectionRestore(false);
      return;
    }
    
    // Also skip if Find/Replace modal is open
    if (findReplaceOpen) {
      return;
    }
    
    if (!selectionRange) return;
    
    if (selectionRange.type === 'editable') {
      // EDITABLE PATH: Restore textarea/input selection
      const { element, start, end } = selectionRange;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        // Longer delay to wait for menu animation to complete
        setTimeout(() => {
          // Double-check that Find modal isn't open (use ref for reliable closure access)
          if (findReplaceOpenRef.current) return;
          
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
  const handleCut = async () => {
    if (!selectionRange) return;
    
    if (selectionRange.type === 'editable') {
      const element = selectionRange.element;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        const { start, end } = selectionRange;
        const cutText = element.value.substring(start, end);
        
        try {
          // Modern Clipboard API
          await navigator.clipboard.writeText(cutText);
          
          // Remove the selected text
          const newValue = 
            element.value.substring(0, start) +
            element.value.substring(end);
          
          // Update via callback if available, otherwise direct
          if (onTextReplace) {
            onTextReplace(newValue);
          } else {
            element.value = newValue;
            element.setSelectionRange(start, start);
          }
          
          // Clear stored selection after cut
          setSelectionRange(null);
        } catch (err) {
          console.error('Failed to cut:', err);
        }
      }
    }
    // Note: Cut doesn't make sense for non-editable content
  };

  const handleCopy = async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        // Don't clear selection for copy - we want to keep it
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handlePaste = async () => {
    if (!selectionRange || !isEditable) return;
    
    if (selectionRange.type === 'editable') {
      const element = selectionRange.element;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        try {
          // Modern Clipboard API
          const text = await navigator.clipboard.readText();
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
        } catch (err) {
          console.error('Failed to paste:', err);
        }
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
    // Prevent selection restoration when opening Find modal
    setSkipSelectionRestore(true);
    setFindReplaceOpen(true);
    findReplaceOpenRef.current = true; // Set ref immediately for reliable access
  };

  // Handle shortcut execution via unified Redux system
  const handleShortcutTrigger = async (shortcut: any, placementType: string) => {
    try {
      // Check if builtin is connected
      if (!shortcut.prompt_builtin) {
        toast({
          title: "Prompt Not Connected",
          description: (
            <div className="flex flex-col gap-2">
              <p className="font-medium">{shortcut.label}</p>
              <p className="text-sm text-muted-foreground">
                This shortcut has no connected prompt builtin. Please configure it in the admin panel.
              </p>
            </div>
          ),
          variant: "destructive",
        });
        return;
      }

      const builtin = shortcut.prompt_builtin;

      // Build application scopes (standard + custom)
      const applicationScope = {
        selection: selectedText || '',
        content: contextData?.content || '',
        context: contextData?.context || '',
      };

      console.log('[UnifiedContextMenu] Application scope:', JSON.stringify(applicationScope, null, 2));

      // Map application scopes to prompt variables using scope_mappings
      const variables = mapScopeToVariables(
        applicationScope,
        shortcut.scope_mappings || {},
        builtin.variableDefaults || []
      );

      console.log('[UnifiedContextMenu] Mapped variables:', JSON.stringify(variables, null, 2));

      if (isDebugMode) {
        dispatch(showPromptDebugIndicator({
          promptName: shortcut.label,
          placementType,
          selectedText: selectedText,
          availableContext: applicationScope,
          resolvedVariables: variables,
          canResolve: {
            canResolve: true,
            missingVariables: [],
            resolvedVariables: Object.keys(variables),
          },
          metadata: {
            scopeMappings: shortcut.scope_mappings,
            availableScopes: shortcut.available_scopes,
          },
        }));
      }

      // Get result display type
      const resultDisplay = shortcut.result_display || 'modal-full';

      // Build execution config
      const executionConfig = {
        auto_run: shortcut.auto_run ?? true,
        allow_chat: shortcut.allow_chat ?? true,
        show_variables: shortcut.show_variables ?? false,
        apply_variables: shortcut.apply_variables ?? true,
        track_in_runs: true,
        use_pre_execution_input: shortcut.use_pre_execution_input ?? false,
      };

      // ⭐ Call unified system with ONLY the prompt ID
      // Redux will handle fetching from cache (already populated by useUnifiedContextMenu)
      await openPrompt({
        promptId: builtin.id, // Just the ID - Redux handles the rest!
        promptSource: 'prompt_builtins', // Tell Redux this is a builtin, not a custom prompt
        variables: shortcut.apply_variables ? variables : {},
        executionConfig,
        result_display: resultDisplay,
        title: shortcut.label,
        initialMessage: '',
        // For inline display: pass text manipulation callbacks
        ...(resultDisplay === 'inline' && isEditable && {
          onTextReplace,
          onTextInsertBefore,
          onTextInsertAfter,
          originalText: selectedText || '',
        }),
      });
    } catch (error) {
      console.error('[UnifiedContextMenu] Error executing shortcut:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      toast({
        title: "Execution Failed",
        description: (
          <div className="flex flex-col gap-2">
            <p className="font-medium">{shortcut.label}</p>
            <p className="text-sm text-muted-foreground">
              {errorMessage}
            </p>
            {isDebugMode && (
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                {error instanceof Error ? error.stack : String(error)}
              </pre>
            )}
          </div>
        ),
        variant: "destructive",
      });
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

          {/* Selection Indicator - Show whenever text is selected */}
          {selectedText && (
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

          {/* Admin Section */}
          {isAdmin && (
            <>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Tools
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56">
                  {/* Toggle Debug Mode */}
                  <ContextMenuItem onSelect={() => dispatch(toggleDebugMode())}>
                    {isDebugMode ? (
                      <EyeOff className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    <div className="flex flex-col">
                      <span>{isDebugMode ? "Disable" : "Enable"} Debug Mode</span>
                      <span className="text-xs text-muted-foreground">
                        {isDebugMode ? "Hide debug info" : "Show debug info"}
                      </span>
                    </div>
                  </ContextMenuItem>

                  {/* Inspect Context (only when debug mode is on) */}
                  {isDebugMode && (
                    <ContextMenuItem 
                      onSelect={() => setContextDebugOpen(true)}
                      className="text-amber-600 dark:text-amber-400"
                    >
                      <Bug className="h-4 w-4 mr-2" />
                      <div className="flex flex-col">
                        <span>Inspect Context</span>
                        <span className="text-xs text-muted-foreground">View available data</span>
                      </div>
                    </ContextMenuItem>
                  )}

                  <ContextMenuSeparator />

                  {/* Toggle Admin Indicator */}
                  <ContextMenuItem 
                    onSelect={() => dispatch(toggleOverlay({ overlayId: "adminIndicator" }))}
                  >
                    {isAdminIndicatorOpen ? (
                      <Eye className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                    ) : (
                      <EyeOff className="h-4 w-4 mr-2" />
                    )}
                    <div className="flex flex-col">
                      <span>{isAdminIndicatorOpen ? "Hide" : "Show"} Admin Indicator</span>
                      <span className="text-xs text-muted-foreground">
                        {isAdminIndicatorOpen ? "Hide overlay" : "Show overlay"}
                      </span>
                    </div>
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

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
          aiResponse={textResultData.result}
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
        onClose={() => {
          setFindReplaceOpen(false);
          findReplaceOpenRef.current = false;
        }}
        targetElement={selectionRange?.element as HTMLTextAreaElement | HTMLInputElement | null}
        onReplace={onTextReplace}
      />
    </>
  );
}
