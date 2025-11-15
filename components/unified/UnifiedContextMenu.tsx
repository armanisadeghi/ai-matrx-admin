/**
 * UnifiedContextMenu
 * 
 * App-wide context menu that combines:
 * - Content Blocks (insert templates)
 * - AI Tools (system prompts for text manipulation)
 * - Quick Actions (notes, tasks, chat, data, files)
 * 
 * Use this anywhere text is displayed or editable.
 */

'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
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
} from 'lucide-react';
import { useContentBlocks } from '@/hooks/useContentBlocks';
import { useContextMenuPrompts } from '@/hooks/useSystemPrompts';
import { useFunctionalityConfigsByCategory } from '@/hooks/useFunctionalityConfigs';
import { DynamicContextMenuSection } from '@/features/rich-text-editor/components/DynamicContextMenuSection';
import { PromptContextResolver, type UIContext } from '@/lib/services/prompt-context-resolver';
import { PromptRunnerModal } from '@/features/prompts/components/modal/PromptRunnerModal';
import { TextActionResultModal } from '@/components/modals/TextActionResultModal';
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { useAppSelector } from '@/lib/redux';
import { selectIsDebugMode } from '@/lib/redux/slices/adminDebugSlice';
import { SystemPromptDebugModal } from '@/components/debug/SystemPromptDebugModal';
import contentBlocksConfig from '@/config/content-blocks';
import { ContentBlock } from '@/features/rich-text-editor/config/contentBlocks';
import * as LucideIcons from 'lucide-react';
import { useQuickActions } from '@/features/quick-actions/hooks/useQuickActions';

interface UnifiedContextMenuProps {
  children: React.ReactNode;
  /** For rich text editors: provide editor ID */
  editorId?: string;
  /** For textareas: provide getter function */
  getTextarea?: () => HTMLTextAreaElement | null;
  /** For both: UI context for AI tools */
  uiContext?: UIContext;
  /** Callback after content block inserted */
  onContentInserted?: () => void;
  /** For text editors: text replacement callbacks */
  onTextReplace?: (newText: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  /** Is this wrapping an editable element? */
  isEditable?: boolean;
  /** Enable/disable specific sections */
  enableContentBlocks?: boolean;
  enableAITools?: boolean;
  enableQuickActions?: boolean;
  className?: string;
}

export function UnifiedContextMenu({
  children,
  editorId,
  getTextarea,
  uiContext = {},
  onContentInserted,
  onTextReplace,
  onTextInsertBefore,
  onTextInsertAfter,
  isEditable = false,
  enableContentBlocks = true,
  enableAITools = true,
  enableQuickActions = true,
  className,
}: UnifiedContextMenuProps) {
  // Content Blocks state
  const { contentBlocks, categoryConfigs, loading: loadingBlocks } = useContentBlocks({
    useDatabase: contentBlocksConfig.useDatabase,
    autoRefresh: contentBlocksConfig.useDatabase,
  });

  // AI Tools state (database-driven)
  const { systemPrompts, loading: loadingAITools } = useContextMenuPrompts();
  const { configsByCategory, isLoading: loadingConfigs } = useFunctionalityConfigsByCategory({ activeOnly: true });
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number; element: HTMLElement | null } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<any>(null);
  const [textResultModalOpen, setTextResultModalOpen] = useState(false);
  const [textResultData, setTextResultData] = useState<{ original: string; result: string; promptName: string } | null>(null);
  const isDebugMode = useAppSelector(selectIsDebugMode);
  const { execute, streamingText } = usePromptExecution();
  const [debugModalOpen, setDebugModalOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  // Quick Actions via Redux
  const {
    openQuickNotes,
    openQuickTasks,
    openQuickChat,
    openQuickData,
    openQuickFiles,
  } = useQuickActions();

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

  // Content Blocks handlers
  const handleInsertBlock = (block: ContentBlock) => {
    if (editorId) {
      // Use editor insertion
      const { insertTextAtCursor } = require('@/features/rich-text-editor/utils/insertTextUtils');
      const success = insertTextAtCursor(editorId, block.template);
      if (success) onContentInserted?.();
    } else if (getTextarea) {
      // Use textarea insertion
      const { insertTextAtTextareaCursor } = require('@/features/prompts/utils/textareaInsertUtils');
      const textarea = getTextarea();
      if (textarea) {
        const success = insertTextAtTextareaCursor(textarea, block.template);
        if (success) onContentInserted?.();
      }
    }
  };

  // AI Tools handlers
  const handleAIToolTrigger = async (systemPrompt: any) => {
    if (systemPrompt.prompt_snapshot?.placeholder) return;

    try {
      const contextWithSelection = {
        ...uiContext,
        selection: selectedText,
        text: selectedText,
        content: selectedText,
        selected_text: selectedText,
        content_to_explain: selectedText,
        current_code: selectedText,
      };

      const variables = PromptContextResolver.resolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'context-menu',
        contextWithSelection
      );

      const canResolve = PromptContextResolver.canResolve(
        systemPrompt.prompt_snapshot,
        systemPrompt.functionality_id,
        'context-menu',
        contextWithSelection
      );

      if (isDebugMode) {
        setDebugData({
          systemPromptName: systemPrompt.name,
          functionalityId: systemPrompt.functionality_id,
          placementType: 'context-menu',
          uiContext: contextWithSelection,
          resolvedVariables: variables,
          canResolve,
          promptSnapshot: systemPrompt.prompt_snapshot,
          selectedText,
        });
        setDebugModalOpen(true);
      }

      if (!canResolve.canResolve) {
        alert(`Cannot execute: Missing variables - ${canResolve.missingVariables.join(', ')}`);
        return;
      }

      const settings = systemPrompt.placement_settings || {};
      const allowChat = settings.allowChat ?? true;
      const allowInitialMessage = settings.allowInitialMessage ?? false;

      // If editable with replace/insert callbacks, use text result modal
      if (isEditable && (onTextReplace || onTextInsertBefore || onTextInsertAfter) && selectedText) {
        const result = await execute({
          promptId: systemPrompt.source_prompt_id,
          promptData: !systemPrompt.source_prompt_id ? systemPrompt.prompt_snapshot : undefined,
          variables,
        });

        setTextResultData({
          original: selectedText,
          result: 'Processing...',
          promptName: systemPrompt.name,
        });
        setTextResultModalOpen(true);
      } else {
        // Regular modal with chat
        const config = systemPrompt.source_prompt_id ? {
          promptId: systemPrompt.source_prompt_id,
          variables,
          mode: allowChat ? 'auto-run' : 'auto-run-one-shot',
          title: systemPrompt.name,
          initialMessage: allowInitialMessage ? undefined : '',
        } : {
          promptData: systemPrompt.prompt_snapshot,
          variables,
          mode: allowChat ? 'auto-run' : 'auto-run-one-shot',
          title: systemPrompt.name,
          initialMessage: allowInitialMessage ? undefined : '',
        };

        setModalConfig(config);
        setModalOpen(true);
      }
    } catch (error) {
      console.error('[UnifiedContextMenu] Error executing AI tool:', error);
      alert(`Error: ${(error as Error).message}`);
    }
  };

  // Map system prompts to their functionality configs for proper display
  const aiToolsWithConfigs = React.useMemo(() => {
    return Object.entries(configsByCategory).map(([categoryName, { category, configs }]) => {
      // Find system prompts that match functionalities in this category
      const categoryPrompts = configs.map(config => {
        const matchingPrompt = systemPrompts.find(
          p => p.functionality_id === config.functionality_id
        );
        return {
          config,
          systemPrompt: matchingPrompt,
        };
      }).filter(item => item.systemPrompt); // Only show if a prompt is connected

      return {
        category,
        configs: categoryPrompts,
      };
    }).filter(cat => cat.configs.length > 0); // Only show categories with connected prompts
  }, [configsByCategory, systemPrompts]);

  // Helper to get Lucide icon component
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.FileText;
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
          {children}
        </ContextMenuTrigger>

        <ContextMenuContent className={`w-64 ${className}`}>
          {/* Content Blocks Section */}
          {enableContentBlocks && (
            <>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <FileText className="h-4 w-4 mr-2" />
                  Content Blocks
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-64">
                  {loadingBlocks ? (
                    <ContextMenuLabel className="text-xs text-muted-foreground">Loading...</ContextMenuLabel>
                  ) : (
                    <>
                      {categoryConfigs.map((category) => (
                        <DynamicContextMenuSection
                          key={category.id}
                          category={category}
                          onBlockSelect={handleInsertBlock}
                        />
                      ))}
                    </>
                  )}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
            </>
          )}

          {/* AI Tools Section - Database Driven */}
          {enableAITools && (
            <>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Tools
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-64">
                  {(loadingAITools || loadingConfigs) ? (
                    <ContextMenuLabel className="text-xs text-muted-foreground">Loading...</ContextMenuLabel>
                  ) : aiToolsWithConfigs.length === 0 ? (
                    <ContextMenuLabel className="text-xs text-muted-foreground">No AI tools available</ContextMenuLabel>
                  ) : (
                    <>
                      {aiToolsWithConfigs.map(({ category, configs }) => {
                        const CategoryIcon = getIcon(category?.icon_name || 'FileText');
                        return (
                          <React.Fragment key={category?.id}>
                            <ContextMenuSub>
                              <ContextMenuSubTrigger>
                                <CategoryIcon className="h-4 w-4 mr-2" style={{ color: category?.color || 'currentColor' }} />
                                {category?.label}
                              </ContextMenuSubTrigger>
                              <ContextMenuSubContent className="w-64">
                                {configs.map(({ config, systemPrompt }) => {
                                  if (!systemPrompt) return null;
                                  const ItemIcon = getIcon(config.icon_name || 'Sparkles');
                                  return (
                                    <ContextMenuItem
                                      key={systemPrompt.id}
                                      onSelect={() => handleAIToolTrigger(systemPrompt)}
                                      disabled={systemPrompt.prompt_snapshot?.placeholder || !systemPrompt.is_active}
                                    >
                                      <ItemIcon className="h-4 w-4 mr-2" />
                                      {config.label || systemPrompt.name}
                                      {systemPrompt.prompt_snapshot?.placeholder && (
                                        <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
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
              <ContextMenuSeparator />
            </>
          )}

          {/* Quick Actions Section */}
          {enableQuickActions && (
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
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Modals for AI Tools */}
      {modalOpen && modalConfig && (
        <PromptRunnerModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalConfig(null);
            setSelectionRange(null);
            setSelectedText('');
          }}
          promptId={modalConfig.promptId}
          promptData={modalConfig.promptData}
          variables={modalConfig.variables}
          mode={modalConfig.mode}
          title={modalConfig.title}
          initialMessage={modalConfig.initialMessage}
        />
      )}

      {isDebugMode && (
        <SystemPromptDebugModal
          isOpen={debugModalOpen}
          onClose={() => setDebugModalOpen(false)}
          debugData={debugData}
        />
      )}

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

