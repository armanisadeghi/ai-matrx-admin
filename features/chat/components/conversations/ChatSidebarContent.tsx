"use client";

import React, { useMemo, useState } from 'react';
import { Search, Plus, MoreVertical, Edit, Trash2, ExternalLink, Share2, Archive } from 'lucide-react';
import clsx from 'clsx';
import { useConversationPanel } from '@/features/chat/hooks/useConversationPanel';
import { useSidebarState } from '@/hooks/useSidebarState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const INITIAL_DISPLAY_LIMIT = 20;
const LOAD_MORE_INCREMENT = 20;

/**
 * ChatSidebarContent - Simplified conversation list designed to inject into the main app sidebar
 * This version doesn't handle collapse state as that's managed by the main sidebar
 */
export const ChatSidebarContent: React.FC = () => {
  const { isCollapsed } = useSidebarState();
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_LIMIT);
  
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
  } = useConversationPanel();

  // Calculate total number of conversations
  const totalConversations = useMemo(() => {
    return Object.values(groupedConversations).reduce((sum, convos) => sum + convos.length, 0);
  }, [groupedConversations]);

  // Limit displayed chats based on displayLimit
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

  // Check if there are more to show
  const hasMoreToShow = totalConversations > displayLimit;

  // Handle showing more chats
  const handleShowMore = () => {
    setDisplayLimit(prev => prev + LOAD_MORE_INCREMENT);
  };

  return (
    <div className="h-full flex flex-col px-1">
      {/* New Chat Button - Adapts to collapsed/expanded state */}
      <div className="mb-2 flex-shrink-0 flex justify-center">
        {isCollapsed ? (
          <button
            onClick={handleCreateNewChat}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95"
            title="New Chat"
          >
            <Plus className="h-4 w-4 transition-all duration-300" />
          </button>
        ) : (
          <button
            onClick={handleCreateNewChat}
            className="flex items-center justify-center w-full px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white text-xs font-light transition-all duration-300 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5 transition-all duration-300" />
            <span className="transition-opacity duration-300">New Chat</span>
          </button>
        )}
      </div>

      {/* Search - Only show when expanded */}
      {!isCollapsed && (
        <div className="mb-2 flex-shrink-0 animate-in fade-in duration-300">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 h-3 w-3 text-gray-400 dark:text-gray-500 transition-all duration-300" />
            <input
              type="text"
              placeholder="Search..."
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1 text-xs font-light rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:outline-none ring-0 focus:ring-0 transition-all duration-300 border border-gray-200 dark:border-gray-700 focus:border-gray-300 dark:focus:border-gray-600"
              style={{ boxShadow: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Conversation List - Scrollable (only when expanded) */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none animate-in fade-in duration-300">
          {Object.entries(limitedGroupedConversations).map(([section, conversations]) => (
          <div key={section} className="mb-3">
            <div className="px-1 py-1 text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {section}
            </div>
            <div className="space-y-0.5">
              {conversations.map((convo) => (
                <div
                  key={convo.id}
                  className={clsx(
                    "relative group px-2 py-1.5 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]",
                    selectedConversation === convo.id
                      ? "bg-blue-100 dark:bg-blue-900/30 shadow-sm"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm"
                  )}
                >
                  <button
                    onClick={() => {
                      handlePreviewConversation(convo.id);
                      handleSelectConversation(convo.id);
                    }}
                    className="w-full text-left flex items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className={clsx(
                        "text-[11px] font-light truncate leading-relaxed",
                        selectedConversation === convo.id
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300"
                      )}>
                        {convo.label || 'Untitled Chat'}
                      </div>
                    </div>
                  </button>
                  
                  {/* Menu - appears on hover */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => handleSelectConversation(convo.id)} className="text-[11px] py-1">
                          <ExternalLink className="h-3 w-3 mr-1.5" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {/* TODO: Edit functionality */}} className="text-[11px] py-1">
                          <Edit className="h-3 w-3 mr-1.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {/* TODO: Share functionality */}} className="text-[11px] py-1">
                          <Share2 className="h-3 w-3 mr-1.5" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {/* TODO: Archive functionality */}} className="text-[11px] py-1">
                          <Archive className="h-3 w-3 mr-1.5" />
                          Archive
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {/* TODO: Delete functionality */}}
                          className="text-red-600 dark:text-red-400 text-[11px] py-1"
                        >
                          <Trash2 className="h-3 w-3 mr-1.5" />
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
          {hasMoreToShow && (
            <div className="px-1 py-2">
              <button
                onClick={handleShowMore}
                className="w-full px-2 py-1 text-[11px] font-light text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm rounded-lg transition-all duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Show More ({totalConversations - displayLimit} more)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

