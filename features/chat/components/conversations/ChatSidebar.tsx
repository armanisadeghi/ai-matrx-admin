"use client";

import React, { useState } from 'react';
import { Search, PenSquare, ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2, ExternalLink, Share2, Archive } from 'lucide-react';
import clsx from 'clsx';
import { useConversationPanel } from '@/features/chat/hooks/useConversationPanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ChatSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * ChatSidebar - Simplified conversation list for the chat layout
 * Designed to work with AdaptiveLayout as the left panel
 */
export const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  isCollapsed = false,
  onToggleCollapse 
}) => {
  const {
    // State
    labelSearch,
    setLabelSearch,
    selectedConversation,
    
    // Data
    groupedConversations,
    
    // Actions
    handleSelectConversation,
    handlePreviewConversation,
    handleCreateNewChat,
    formatRelativeTime,
    handleLoadMore,
    isLoadingMore,
    hasMoreConversations
  } = useConversationPanel();

  if (isCollapsed) {
    return (
      <div className="h-full w-full flex flex-col items-center bg-textured border-r border-border">
        {/* Collapsed View */}
        <div className="p-2 w-full border-b border-border">
          <button
            onClick={onToggleCollapse}
            className="w-full p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="h-5 w-5 mx-auto" />
          </button>
        </div>
        
        <div className="flex-1 w-full overflow-y-auto py-2">
          {/* Show collapsed conversation items */}
          {Object.entries(groupedConversations).flatMap(([_, conversations]) => 
            conversations.slice(0, 10).map((convo) => (
              <button
                key={convo.id}
                onClick={() => {
                  handlePreviewConversation(convo.id);
                  handleSelectConversation(convo.id);
                }}
                className={clsx(
                  "w-full p-2 text-left transition-colors border-l-2",
                  selectedConversation === convo.id
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-600 dark:border-blue-500"
                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                title={convo.label || 'Untitled'}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
                  <span className="text-white text-xs font-medium">
                    {(convo.label || 'U')[0].toUpperCase()}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-textured border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Chats</h2>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search and New Chat */}
      <div className="p-3 space-y-2">
        <button
          onClick={handleCreateNewChat}
          className="flex items-center justify-center w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-sm font-medium transition-colors"
        >
          <PenSquare className="h-4 w-4 mr-2" />
          New Chat
        </button>

        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={labelSearch}
            onChange={(e) => setLabelSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedConversations).map(([section, conversations]) => (
          <div key={section} className="mb-3">
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {section}
            </div>
            <div className="space-y-0.5 px-2">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={clsx(
                    "relative w-full px-2 py-2 rounded-md transition-colors group",
                    selectedConversation === convo.id
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                >
                  <button
                    onClick={() => {
                      handlePreviewConversation(convo.id);
                      handleSelectConversation(convo.id);
                    }}
                    className="w-full text-left flex items-center gap-2"
                  >
                    <div className={clsx(
                      "w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center text-xs font-medium",
                      selectedConversation === convo.id
                        ? "bg-blue-600 text-white"
                        : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                    )}>
                      {(convo.label || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={clsx(
                        "text-sm font-medium truncate",
                        selectedConversation === convo.id
                          ? "text-blue-900 dark:text-blue-100"
                          : "text-gray-900 dark:text-gray-100"
                      )}>
                        {convo.label || 'Untitled Chat'}
                      </div>
                    </div>
                  </button>
                  
                  {/* Menu - appears on hover */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleSelectConversation(convo.id)}>
                          <ExternalLink className="h-3.5 w-3.5 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {/* TODO: Edit functionality */}}>
                          <Edit className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {/* TODO: Share functionality */}}>
                          <Share2 className="h-3.5 w-3.5 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {/* TODO: Archive functionality */}}>
                          <Archive className="h-3.5 w-3.5 mr-2" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {/* TODO: Delete functionality */}}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {/* Load More Button */}
        {hasMoreConversations && (
          <div className="px-3 py-2">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

