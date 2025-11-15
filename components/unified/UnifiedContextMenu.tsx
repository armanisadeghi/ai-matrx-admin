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
} from 'lucide-react';
import { useContextMenuShortcuts } from '@/features/prompt-builtins/hooks';
import { useShortcutExecution } from '@/features/prompt-builtins/hooks';
import { PLACEMENT_TYPES, PLACEMENT_TYPE_META } from '@/features/prompt-builtins/constants';
import { TextActionResultModal } from '@/components/modals/TextActionResultModal';
import { useQuickActions } from '@/features/quick-actions/hooks/useQuickActions';
import { useAppSelector } from '@/lib/redux';
import { selectIsDebugMode } from '@/lib/redux/slices/adminDebugSlice';
import { SystemPromptDebugModal } from '@/components/debug/SystemPromptDebugModal';
import * as LucideIcons from 'lucide-react';

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
  /** Additional context data for scope mapping */
  contextData?: Record<string, any>;
  className?: string;
}

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
  // Determine which placement types to load from DB
  const dbPlacementTypes = enabledPlacements.filter(p => p !== 'quick-action');
  
  // Load shortcuts from database
  const { categoryGroups, loading } = useContextMenuShortcuts(
    dbPlacementTypes,
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
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';

    const target = e.target as HTMLElement;
    let start = 0;
    let end = 0;
    let element: HTMLElement | null = null;

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      start = target.selectionStart || 0;
      end = target.selectionEnd || 0;
      element = target;
    } else {
      const range = selection?.getRangeAt(0);
      if (range) {
        start = range.startOffset;
        end = range.endOffset;
        element = target;
      }
    }

    setSelectedText(text);
    setSelectionRange({ start, end, element });
  };

  // Handle shortcut execution
  const handleShortcutTrigger = async (shortcut: any, placementType: string) => {
    try {
      // Build scope context
      const scopes: Record<string, string> = {
        selection: selectedText,
        content: selectedText, // Can be overridden by contextData
        context: '', // Can be overridden by contextData
        ...contextData, // Allow external context to override
      };

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
      
      if (resultDisplay === 'inline' && isEditable && (onTextReplace || onTextInsertBefore || onTextInsertAfter) && selectedText) {
        // Execute inline and show result modal
        const result = await executeShortcut(shortcut, {
          scopes,
          onTextReplace,
        });

        setTextResultData({
          original: selectedText,
          result: 'Processing...',
          promptName: shortcut.label,
        });
        setTextResultModalOpen(true);
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
  const handleContentBlockTrigger = (shortcut: any) => {
    if (!shortcut.prompt_builtin) return;

    // For content blocks, the "template" should be in the prompt builtin
    // This is a simplified implementation - you may need to adjust based on your data structure
    const template = shortcut.prompt_builtin.messages?.[0]?.content || '';

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

  // Helper to get Lucide icon component
  const getIcon = (iconName?: string | null) => {
    if (!iconName) return FileText;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || FileText;
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

    return groups;
  }, [categoryGroups]);

  // Check if a placement type should be shown
  const shouldShowPlacement = (placementType: string) => {
    return enabledPlacements.includes(placementType);
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
          {children}
        </ContextMenuTrigger>

        <ContextMenuContent className={`w-64 ${className}`}>
          {loading && (
            <ContextMenuLabel className="text-xs text-muted-foreground">Loading...</ContextMenuLabel>
          )}

          {/* Dynamically render placement type sections */}
          {Object.entries(groupedByPlacement).map(([placementType, groups], index) => {
            if (!shouldShowPlacement(placementType)) return null;

            const PlacementIcon = getPlacementIcon(placementType);
            const placementMeta = PLACEMENT_TYPE_META[placementType as keyof typeof PLACEMENT_TYPE_META];
            const label = placementMeta?.label || placementType;

            return (
              <React.Fragment key={placementType}>
                {index > 0 && <ContextMenuSeparator />}
                
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <PlacementIcon className="h-4 w-4 mr-2" />
                    {label}
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-64">
                    {groups.length === 0 ? (
                      <ContextMenuLabel className="text-xs text-muted-foreground">
                        No {label.toLowerCase()} available
                      </ContextMenuLabel>
                    ) : (
                      <>
                        {groups.map(({ category, shortcuts }) => {
                          const CategoryIcon = getIcon(category.icon_name);
                          
                          // If category has no shortcuts, skip it
                          if (shortcuts.length === 0) return null;

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
                                  {shortcuts.map(shortcut => {
                                    const ShortcutIcon = getIcon(shortcut.icon_name);
                                    const isDisabled = !shortcut.prompt_builtin || !shortcut.is_active;

                                    return (
                                      <ContextMenuItem
                                        key={shortcut.id}
                                        onSelect={() => {
                                          if (placementType === PLACEMENT_TYPES.CONTENT_BLOCK) {
                                            handleContentBlockTrigger(shortcut);
                                          } else {
                                            handleShortcutTrigger(shortcut, placementType);
                                          }
                                        }}
                                        disabled={isDisabled}
                                      >
                                        <ShortcutIcon className="h-4 w-4 mr-2" />
                                        {shortcut.label}
                                        {isDisabled && (
                                          <span className="ml-auto text-xs text-muted-foreground">Not configured</span>
                                        )}
                                      </ContextMenuItem>
                                    );
                                  })}
                                </ContextMenuSubContent>
                              </ContextMenuSub>
                            </React.Fragment>
                          );
                        })}
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
