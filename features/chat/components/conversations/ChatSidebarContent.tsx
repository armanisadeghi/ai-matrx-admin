"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, X, Check, MessageSquare, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useConversationPanel, ConversationModified } from '@/features/chat/hooks/useConversationPanel';
import { useSidebarState } from '@/hooks/useSidebarState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const INITIAL_DISPLAY_LIMIT = 30;
const LOAD_MORE_INCREMENT = 30;

/**
 * Inline rename input component for editing conversation titles
 */
const InlineRenameInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ value, onChange, onConfirm, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1 w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onConfirm}
        className="flex-1 min-w-0 px-1.5 py-0.5 text-[11px] rounded bg-white dark:bg-zinc-800 border border-primary/40 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        style={{ fontSize: '16px' }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); onConfirm(); }}
        className="p-0.5 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="p-0.5 rounded text-muted-foreground hover:bg-muted"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

/**
 * Delete confirmation inline component
 */
const DeleteConfirmation: React.FC<{
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ label, onConfirm, onCancel }) => {
  return (
    <div className="px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
      <p className="text-[10px] text-destructive mb-1.5 leading-tight">
        Delete &ldquo;{label?.slice(0, 30) || 'Untitled'}{(label?.length || 0) > 30 ? '...' : ''}&rdquo;?
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onConfirm(); }}
          className="flex-1 px-2 py-0.5 text-[10px] font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          Delete
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          className="flex-1 px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

/**
 * Individual conversation item in the sidebar
 */
const ConversationItem: React.FC<{
  convo: ConversationModified;
  isSelected: boolean;
  isRenaming: boolean;
  isDeleting: boolean;
  renameValue: string;
  onSelect: () => void;
  onPreview: () => void;
  onStartRename: () => void;
  onRequestDelete: () => void;
  onRenameChange: (value: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}> = ({
  convo,
  isSelected,
  isRenaming,
  isDeleting,
  renameValue,
  onSelect,
  onPreview,
  onStartRename,
  onRequestDelete,
  onRenameChange,
  onConfirmRename,
  onCancelRename,
  onConfirmDelete,
  onCancelDelete,
}) => {
  if (isDeleting) {
    return (
      <DeleteConfirmation
        label={convo.label || 'Untitled Chat'}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    );
  }

  return (
    <div
      className={clsx(
        "relative group rounded-lg transition-all duration-150",
        isSelected
          ? "bg-accent/80 dark:bg-accent/50"
          : "hover:bg-accent/40 dark:hover:bg-accent/20"
      )}
    >
      {isRenaming ? (
        <div className="px-2 py-1.5">
          <InlineRenameInput
            value={renameValue}
            onChange={onRenameChange}
            onConfirm={onConfirmRename}
            onCancel={onCancelRename}
          />
        </div>
      ) : (
        <div className="flex items-center">
          <button
            onClick={() => {
              onPreview();
              onSelect();
            }}
            className="flex-1 min-w-0 px-2 py-1.5 text-left"
          >
            <div className={clsx(
              "text-[11px] truncate leading-relaxed",
              isSelected
                ? "text-primary font-medium"
                : "text-foreground/80 font-light"
            )}>
              {convo.label || 'Untitled Chat'}
            </div>
          </button>

          {/* Actions menu - visible on hover */}
          <div className="flex-shrink-0 pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36" sideOffset={4}>
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onStartRename(); }}
                  className="text-[11px] py-1.5"
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
                  className="text-destructive focus:text-destructive text-[11px] py-1.5"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * ChatSidebarContent - Modern conversation list injected into the main app sidebar.
 * Features: search, grouped by date, inline rename, delete confirmation, route-synced selection.
 */
export const ChatSidebarContent: React.FC = () => {
  const { isCollapsed } = useSidebarState();
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT);

  const {
    labelSearch,
    setLabelSearch,
    selectedConversation,
    groupedConversations,
    // Rename
    renamingConversationId,
    renameValue,
    setRenameValue,
    handleStartRename,
    handleConfirmRename,
    handleCancelRename,
    // Delete
    deletingConversationId,
    handleRequestDelete,
    handleConfirmDelete,
    handleCancelDelete,
    // Navigation
    handleSelectConversation,
    handlePreviewConversation,
    handleCreateNewChat,
  } = useConversationPanel();

  // Calculate total and limited conversations
  const totalConversations = useMemo(() => {
    return Object.values(groupedConversations).reduce((sum, convos) => sum + convos.length, 0);
  }, [groupedConversations]);

  const limitedGroupedConversations = useMemo(() => {
    const limited: typeof groupedConversations = {};
    let totalCount = 0;

    for (const [section, conversations] of Object.entries(groupedConversations)) {
      if (totalCount >= displayLimit) break;
      const remaining = displayLimit - totalCount;
      limited[section] = conversations.slice(0, remaining);
      totalCount += limited[section].length;
    }

    return limited;
  }, [groupedConversations, displayLimit]);

  const hasMoreToShow = totalConversations > displayLimit;

  const handleShowMore = () => {
    setDisplayLimit(prev => prev + LOAD_MORE_INCREMENT);
  };

  return (
    <div className="h-full flex flex-col px-1">
      {/* New Chat Button */}
      <div className="mb-2 flex-shrink-0 flex justify-center">
        {isCollapsed ? (
          <button
            onClick={handleCreateNewChat}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:scale-95"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleCreateNewChat}
            className="flex items-center justify-center w-full px-2 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all duration-200 active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Chat
          </button>
        )}
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="mb-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-[11px] rounded-lg bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:outline-none focus:bg-muted/80 transition-colors border-0"
              style={{ boxShadow: 'none', fontSize: '16px' }}
            />
            {labelSearch && (
              <button
                onClick={() => setLabelSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapsed state - show message icon for recent chats */}
      {isCollapsed && (
        <div className="flex flex-col items-center gap-1 mt-1">
          <div className="w-8 h-[1px] bg-border mb-1" />
          <button
            onClick={() => {/* Could toggle expand */}}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Chat History"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Conversation List */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none">
          {totalConversations === 0 && !labelSearch && (
            <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-[11px] text-muted-foreground">No conversations yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Start a new chat to begin</p>
            </div>
          )}

          {totalConversations === 0 && labelSearch && (
            <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
              <Search className="h-6 w-6 text-muted-foreground/40 mb-2" />
              <p className="text-[11px] text-muted-foreground">No results for &ldquo;{labelSearch}&rdquo;</p>
            </div>
          )}

          {Object.entries(limitedGroupedConversations).map(([section, conversations]) => (
            <div key={section} className="mb-2">
              <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none">
                {section}
              </div>
              <div className="space-y-0.5">
                {conversations.map((convo) => (
                  <ConversationItem
                    key={convo.id}
                    convo={convo}
                    isSelected={selectedConversation === convo.id}
                    isRenaming={renamingConversationId === convo.id}
                    isDeleting={deletingConversationId === convo.id}
                    renameValue={renameValue}
                    onSelect={() => handleSelectConversation(convo.id!)}
                    onPreview={() => handlePreviewConversation(convo.id!)}
                    onStartRename={() => handleStartRename(convo.id!, convo.label || '')}
                    onRequestDelete={() => handleRequestDelete(convo.id!)}
                    onRenameChange={setRenameValue}
                    onConfirmRename={handleConfirmRename}
                    onCancelRename={handleCancelRename}
                    onConfirmDelete={handleConfirmDelete}
                    onCancelDelete={handleCancelDelete}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMoreToShow && (
            <div className="px-1 py-2">
              <button
                onClick={handleShowMore}
                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronDown className="h-3 w-3" />
                Show more ({totalConversations - displayLimit})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
