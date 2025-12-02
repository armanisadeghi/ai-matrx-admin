"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectAllInstances } from '@/lib/redux/prompt-execution/slice';
import { startPromptInstance } from '@/lib/redux/prompt-execution/thunks/startInstanceThunk';
import { loadRun } from '@/lib/redux/prompt-execution/thunks/loadRunThunk';
import { aiRunsService } from '@/features/ai-runs/services/ai-runs-service';
import { getBuiltinId } from '@/lib/redux/prompt-execution/builtins';
import { PromptRunner } from './PromptRunner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  MessageSquarePlus,
  Star,
  MessageSquare,
  Loader2,
  Inbox,
  ChevronLeft,
  ArrowDownToLine,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { AiRun, SourceType } from '@/features/ai-runs/types';
import type { ExecutionInstance } from '@/lib/redux/prompt-execution/types';
import { cn } from '@/lib/utils';

// Source type filter options
const SOURCE_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'prompts', label: 'Prompts' },
  { value: 'prompt_builtins', label: 'Built-ins' },
  { value: 'chat', label: 'Chat' },
];

// Unified type for display
interface RunListItem {
  id: string;
  name: string | null;
  source_type: string;
  source_id: string | null;
  message_count: number;
  is_starred: boolean;
  last_activity: string;
  isInRedux: boolean;
}

/**
 * QuickAIResultsSheet - Chat-style interface for AI runs
 * 
 * Features:
 * - List view of recent runs
 * - Click to view conversation in-place
 * - Start new chat
 * - Load more from database
 */
export function QuickAIResultsSheet() {
  const dispatch = useAppDispatch();
  
  // Redux state
  const reduxInstances = useAppSelector(selectAllInstances);
  
  // Local state
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dbRuns, setDbRuns] = useState<AiRun[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  
  // Selected run state
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Check if selected run exists in Redux
  const selectedInstance = useAppSelector(state => 
    selectedRunId ? state.promptExecution.instances[selectedRunId] : null
  );

  // Convert Redux instances to list items
  const reduxItems: RunListItem[] = useMemo(() => {
    return Object.values(reduxInstances).map((instance: ExecutionInstance) => ({
      id: instance.runId,
      name: instance.runTracking.runName || 'New Chat',
      source_type: instance.runTracking.sourceType,
      source_id: instance.runTracking.sourceId,
      message_count: instance.messages.length,
      is_starred: false,
      last_activity: new Date(instance.updatedAt).toISOString(),
      isInRedux: true,
    }));
  }, [reduxInstances]);

  // Convert DB runs to list items
  const dbItems: RunListItem[] = useMemo(() => {
    return dbRuns.map((run) => ({
      id: run.id,
      name: run.name || 'Untitled',
      source_type: run.source_type,
      source_id: run.source_id || null,
      message_count: run.message_count,
      is_starred: run.is_starred,
      last_activity: run.last_message_at,
      isInRedux: false,
    }));
  }, [dbRuns]);

  // Combine and filter runs
  const allRuns: RunListItem[] = useMemo(() => {
    const reduxIds = new Set(reduxItems.map(r => r.id));
    const uniqueDbRuns = dbItems.filter(r => !reduxIds.has(r.id));
    
    let combined = [...reduxItems, ...uniqueDbRuns];
    
    if (sourceFilter !== 'all') {
      combined = combined.filter(r => r.source_type === sourceFilter);
    }
    
    // Sort by last activity
    combined.sort((a, b) => {
      return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
    });
    
    return combined;
  }, [reduxItems, dbItems, sourceFilter]);

  // Start a new chat
  const handleNewChat = useCallback(async () => {
    setIsInitializing(true);
    try {
      const newRunId = uuidv4();
      await dispatch(startPromptInstance({
        runId: newRunId,
        promptId: getBuiltinId('matrix-custom-chat'),
        promptSource: 'prompt_builtins',
        executionConfig: {
          auto_run: false,
          allow_chat: true,
          show_variables: false,
          apply_variables: true,
          track_in_runs: true,
        },
      })).unwrap();
      
      setSelectedRunId(newRunId);
    } catch (error) {
      console.error('Failed to start new chat:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [dispatch]);

  // Select a run
  const handleSelectRun = useCallback(async (run: RunListItem) => {
    // If it's already in Redux, just select it
    if (run.isInRedux) {
      setSelectedRunId(run.id);
      return;
    }
    
    // Load from DB into Redux
    setIsInitializing(true);
    try {
      await dispatch(loadRun({ runId: run.id })).unwrap();
      setSelectedRunId(run.id);
    } catch (error) {
      console.error('Failed to load run:', error);
    } finally {
      setIsInitializing(false);
    }
  }, [dispatch]);

  // Load more from database
  const loadMoreFromDb = useCallback(async () => {
    if (isLoadingDb) return;
    
    setIsLoadingDb(true);
    try {
      const filters = {
        ...(sourceFilter !== 'all' && { source_type: sourceFilter as SourceType }),
        limit: 20,
        offset,
        status: 'active' as const,
        order_by: 'last_message_at' as const,
        order_direction: 'desc' as const,
      };
      
      const response = await aiRunsService.list(filters);
      setDbRuns(prev => [...prev, ...response.runs]);
      setHasMore(response.hasMore);
      setOffset(prev => prev + 20);
    } catch (error) {
      console.error('Failed to load runs:', error);
    } finally {
      setIsLoadingDb(false);
    }
  }, [isLoadingDb, offset, sourceFilter]);

  // Reset DB pagination when filter changes
  const handleFilterChange = useCallback((value: string) => {
    setSourceFilter(value);
    setDbRuns([]);
    setOffset(0);
    setHasMore(true);
  }, []);

  // Go back to list view
  const handleBack = useCallback(() => {
    setSelectedRunId(null);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case 'prompts': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'prompt_builtins': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'chat': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
    }
  };

  // Determine prompt source for the selected run
  const selectedRunSource = useMemo(() => {
    if (!selectedRunId) return 'prompts';
    const run = allRuns.find(r => r.id === selectedRunId);
    return (run?.source_type === 'prompt_builtins' ? 'prompt_builtins' : 'prompts') as 'prompts' | 'prompt_builtins';
  }, [selectedRunId, allRuns]);

  const selectedRunPromptId = useMemo(() => {
    if (!selectedRunId) return undefined;
    const run = allRuns.find(r => r.id === selectedRunId);
    return run?.source_id || undefined;
  }, [selectedRunId, allRuns]);

  // ========== CONVERSATION VIEW ==========
  if (selectedRunId && selectedInstance) {
    return (
      <div className="flex flex-col h-full">
        {/* Header with back button */}
        <div className="flex-shrink-0 flex items-center gap-2 p-3 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium truncate">
              {selectedInstance.runTracking.runName || 'Chat'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {selectedInstance.messages.length} messages
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            disabled={isInitializing}
            className="h-8 w-8 p-0"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <PromptRunner
            key={selectedRunId}
            runId={selectedRunId}
            promptId={selectedRunPromptId}
            promptSource={selectedRunSource}
            executionConfig={{
              auto_run: false,
              allow_chat: true,
              show_variables: false,
              apply_variables: true,
              track_in_runs: true,
            }}
            isActive={true}
            showSystemMessage={false}
            className="h-full"
          />
        </div>
      </div>
    );
  }

  // ========== LIST VIEW ==========
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">AI Chats</h2>
          <Button
            variant="default"
            size="sm"
            onClick={handleNewChat}
            disabled={isInitializing}
            className="h-8 gap-1.5"
          >
            {isInitializing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="w-3.5 h-3.5" />
            )}
            New Chat
          </Button>
        </div>
        
        {/* Filter */}
        <Select value={sourceFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_FILTERS.map((filter) => (
              <SelectItem key={filter.value} value={filter.value} className="text-xs">
                {filter.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Runs List */}
      <div className="flex-1 overflow-y-auto">
        {isInitializing && !selectedRunId ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : allRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Inbox className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No chats yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a new chat or load previous ones
            </p>
            {hasMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={loadMoreFromDb}
                disabled={isLoadingDb}
                className="mt-4 gap-1.5"
              >
                {isLoadingDb ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    Load previous chats
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {allRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => handleSelectRun(run)}
                className="w-full flex items-start gap-3 p-3 hover:bg-accent transition-colors text-left"
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate flex-1">
                      {run.name || 'Untitled Chat'}
                    </span>
                    {run.is_starred && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {formatTimestamp(run.last_activity)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <Badge 
                      variant="secondary" 
                      className={cn("text-[10px] px-1.5 py-0 h-4", getSourceColor(run.source_type))}
                    >
                      {run.source_type === 'prompt_builtins' ? 'Built-in' : 
                       run.source_type === 'prompts' ? 'Prompt' : 
                       run.source_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {run.message_count} msg{run.message_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            
            {/* Load More */}
            {hasMore && (
              <div className="p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMoreFromDb}
                  disabled={isLoadingDb}
                  className="w-full h-8 text-xs gap-1.5"
                >
                  {isLoadingDb ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ArrowDownToLine className="w-3 h-3" />
                      Load older chats
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
