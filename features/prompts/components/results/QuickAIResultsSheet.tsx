"use client";

import React, { useState, useEffect } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { openPromptModal, openCompactModal, openSidebarResult } from '@/lib/redux/slices/promptRunnerSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Square, 
  RectangleVertical, 
  PanelRight, 
  Clock,
  Trash2,
  ExternalLink
} from 'lucide-react';
import type { ResultDisplay } from '@/features/prompt-builtins/types/execution-modes';

/**
 * QuickAIResultsSheet - Compact sheet showing recent prompt results
 * Designed for Quick Actions menu - simple, small entries
 */
export function QuickAIResultsSheet() {
  const dispatch = useAppDispatch();
  const [recentResults, setRecentResults] = useState<Array<{
    id: string;
    promptName: string;
    displayType: ResultDisplay;
    timestamp: number;
    config: any;
  }>>([]);
  
  // Load recent results from session storage
  useEffect(() => {
    const loadRecent = () => {
      const stored = sessionStorage.getItem('recentPromptResults');
      if (stored) {
        try {
          setRecentResults(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse recent results:', e);
        }
      }
    };
    
    loadRecent();
    
    // Refresh every 2 seconds to catch new results
    const interval = setInterval(loadRecent, 2000);
    return () => clearInterval(interval);
  }, []);
  
  const getDisplayIcon = (type: ResultDisplay) => {
    switch (type) {
      case 'modal-full': return Square;
      case 'modal-compact': return RectangleVertical;
      case 'sidebar': return PanelRight;
      default: return ExternalLink;
    }
  };
  
  const getDisplayColor = (type: ResultDisplay) => {
    switch (type) {
      case 'modal-full': return 'text-purple-600 dark:text-purple-400';
      case 'modal-compact': return 'text-blue-600 dark:text-blue-400';
      case 'sidebar': return 'text-teal-600 dark:text-teal-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };
  
  const handleRestoreResult = (result: any) => {
    // CRITICAL: Use saved responseText as preloadedResult to prevent re-execution
    const configWithPreloadedResult = {
      ...result.config,
      preloadedResult: result.responseText || '', // Load saved response from sessionStorage
      // Note: auto_run is already false in saved config to prevent re-execution
    };
    
    switch (result.displayType) {
      case 'modal-full':
        dispatch(openPromptModal(configWithPreloadedResult));
        break;
      case 'modal-compact':
        dispatch(openCompactModal(configWithPreloadedResult));
        break;
      case 'sidebar':
        dispatch(openSidebarResult(configWithPreloadedResult));
        break;
    }
  };
  
  const handleClearAll = () => {
    setRecentResults([]);
    sessionStorage.removeItem('recentPromptResults');
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">Recent AI Results</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {recentResults.length} result{recentResults.length !== 1 ? 's' : ''} this session
          </p>
        </div>
        {recentResults.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-8 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            Clear All
          </Button>
        )}
      </div>
      
      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        {recentResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <Clock className="w-12 h-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No recent results</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run an AI prompt to see it here
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {recentResults.slice(0, 15).map((result) => {
              const Icon = getDisplayIcon(result.displayType);
              const colorClass = getDisplayColor(result.displayType);
              
              return (
                <button
                  key={result.id}
                  onClick={() => handleRestoreResult(result)}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors text-left group"
                >
                  {/* Icon */}
                  <div className={`${colorClass} flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {result.promptName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(result.timestamp)}
                    </div>
                  </div>
                  
                  {/* Action */}
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {recentResults.length > 0 && (
        <div className="p-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Session storage • Clears on browser close
          </p>
        </div>
      )}
    </div>
  );
}

