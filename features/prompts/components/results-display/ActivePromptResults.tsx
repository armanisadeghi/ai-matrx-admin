"use client";

import React from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  openPromptModal, 
  openCompactModal, 
  openSidebarResult,
  openFlexiblePanel,
  selectIsPromptModalOpen,
  selectIsCompactModalOpen,
  selectIsSidebarResultOpen,
  selectToastQueue,
} from '@/lib/redux/slices/promptRunnerSlice';
import { 
  Square, 
  RectangleVertical, 
  PanelRight, 
  BellRing, 
  Clock,
  ExternalLink,
  Trash2,
  Maximize2
} from 'lucide-react';
import type { ResultDisplay } from '@/features/prompt-builtins/types/execution-modes';

/**
 * ActivePromptResults - Shows active and recent prompt executions
 * Allows users to restore closed results or view active ones
 */
export function ActivePromptResults() {
  const dispatch = useAppDispatch();
  
  // Get active states
  const isModalFullOpen = useAppSelector(selectIsPromptModalOpen);
  const isModalCompactOpen = useAppSelector(selectIsCompactModalOpen);
  const isSidebarOpen = useAppSelector(selectIsSidebarResultOpen);
  const toastQueue = useAppSelector(selectToastQueue);
  
  // Get recent results from session storage (Phase 6.2 enhancement)
  const [recentResults, setRecentResults] = React.useState<Array<{
    id: string;
    promptName: string;
    displayType: ResultDisplay;
    timestamp: number;
    config: any;
  }>>([]);
  
  React.useEffect(() => {
    const stored = sessionStorage.getItem('recentPromptResults');
    if (stored) {
      try {
        setRecentResults(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent results:', e);
      }
    }
  }, []);
  
  const getDisplayIcon = (type: ResultDisplay) => {
    switch (type) {
      case 'modal-full': return <Square className="w-4 h-4" />;
      case 'modal-compact': return <RectangleVertical className="w-4 h-4" />;
      case 'sidebar': return <PanelRight className="w-4 h-4" />;
      case 'flexible-panel': return <Maximize2 className="w-4 h-4" />;
      case 'toast': return <BellRing className="w-4 h-4" />;
      default: return <ExternalLink className="w-4 h-4" />;
    }
  };
  
  const getDisplayColor = (type: ResultDisplay) => {
    switch (type) {
      case 'modal-full': return 'text-purple-600 dark:text-purple-400';
      case 'modal-compact': return 'text-blue-600 dark:text-blue-400';
      case 'sidebar': return 'text-teal-600 dark:text-teal-400';
      case 'flexible-panel': return 'text-emerald-600 dark:text-emerald-400';
      case 'toast': return 'text-orange-600 dark:text-orange-400';
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
    
    // Restore based on display type
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
      case 'flexible-panel':
        dispatch(openFlexiblePanel({ config: configWithPreloadedResult }));
        break;
    }
  };
  
  const handleClearRecent = () => {
    setRecentResults([]);
    sessionStorage.removeItem('recentPromptResults');
  };
  
  const activeCount = [isModalFullOpen, isModalCompactOpen, isSidebarOpen].filter(Boolean).length + toastQueue.length;
  
  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Prompt Results</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Active and recent prompt executions
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {activeCount} Active
        </Badge>
      </div>
      
      {/* Active Results Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Active Now
        </h3>
        
        {activeCount === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No active prompt results</p>
            <p className="text-xs mt-1">Run a prompt to see it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {isModalFullOpen && (
              <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <Square className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="text-sm font-medium">Full Modal</div>
                    <div className="text-xs text-muted-foreground">Active conversation</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            )}
            
            {isModalCompactOpen && (
              <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <RectangleVertical className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-sm font-medium">Compact Modal</div>
                    <div className="text-xs text-muted-foreground">Quick response</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            )}
            
            {isSidebarOpen && (
              <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <PanelRight className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <div>
                    <div className="text-sm font-medium">Sidebar</div>
                    <div className="text-xs text-muted-foreground">Side panel view</div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            )}
            
            {toastQueue.map((toast) => (
              <div key={toast.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <BellRing className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <div>
                    <div className="text-sm font-medium">{toast.promptName || 'Toast'}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {toast.result.substring(0, 50)}...
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Results Section (Phase 6.2) */}
      <div className="space-y-3 flex-1 overflow-hidden">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent (Session)
          </h3>
          {recentResults.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearRecent}
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        
        {recentResults.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-xs">No recent results this session</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto max-h-[400px]">
            {recentResults.map((result) => (
              <div
                key={result.id}
                className="flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                onClick={() => handleRestoreResult(result)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={getDisplayColor(result.displayType)}>
                    {getDisplayIcon(result.displayType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{result.promptName}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(result.timestamp)}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-auto p-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground text-center pt-4 border-t">
        <p>Recent results are stored for this session only</p>
      </div>
    </div>
  );
}

