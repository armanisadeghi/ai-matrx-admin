"use client";

/**
 * DiffHistory Component
 * 
 * Timeline view of note version history with restore functionality
 */

import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import {
  fetchNoteVersions,
  restoreNoteVersion,
  selectNoteVersions,
  selectNoteVersionsLoading,
  selectNoteVersionsError,
} from '@/lib/redux/slices/noteVersionsSlice';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw, User, Sparkles, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastManager } from '@/hooks/useToastManager';

export interface DiffHistoryProps {
  noteId: string;
  onRestoreVersion?: (versionNumber: number) => void;
  className?: string;
}

export function DiffHistory({ noteId, onRestoreVersion, className }: DiffHistoryProps) {
  const dispatch = useAppDispatch();
  const toast = useToastManager('diff-history');
  
  const versions = useAppSelector(selectNoteVersions(noteId));
  const loading = useAppSelector(selectNoteVersionsLoading(noteId));
  const error = useAppSelector(selectNoteVersionsError(noteId));

  useEffect(() => {
    if (noteId) {
      dispatch(fetchNoteVersions(noteId));
    }
  }, [noteId, dispatch]);

  const handleRestore = async (versionNumber: number) => {
    try {
      await dispatch(restoreNoteVersion({ noteId, versionNumber })).unwrap();
      
      toast.success(`Version ${versionNumber} restored successfully`);
      
      onRestoreVersion?.(versionNumber);
      
      // Refresh versions
      dispatch(fetchNoteVersions(noteId));
    } catch (err) {
      toast.error(`Failed to restore version: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ai':
        return <Sparkles className="h-3.5 w-3.5 text-purple-500" />;
      case 'system':
        return <Settings className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return <User className="h-3.5 w-3.5 text-gray-500" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'ai':
        return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/30';
      case 'system':
        return 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-300 dark:bg-gray-950/30';
    }
  };

  if (loading && versions.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading version history...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center text-red-600 text-sm">
          Error loading versions: {error}
        </div>
      </Card>
    );
  }

  if (versions.length === 0) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="text-center text-muted-foreground">
          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No version history yet</p>
          <p className="text-xs mt-1">Versions are created automatically when you save changes</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <History className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Version History</h3>
        <Badge variant="outline" className="text-xs">
          {versions.length} version{versions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={cn(
                'relative pl-6 pb-3',
                index !== versions.length - 1 && 'border-l-2 border-gray-200 dark:border-gray-700'
              )}
            >
              {/* Timeline dot */}
              <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background" />

              {/* Version card */}
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        v{version.version_number}
                      </Badge>
                      <Badge variant="outline" className={cn('text-xs', getSourceColor(version.change_source))}>
                        <span className="mr-1">{getSourceIcon(version.change_source)}</span>
                        {version.change_source}
                      </Badge>
                      {version.change_type && (
                        <span className="text-xs text-muted-foreground">
                          {version.change_type}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {version.label}
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRestore(version.version_number)}
                    className="h-7 px-2 shrink-0"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                </div>

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground">
                  {new Date(version.created_at).toLocaleString()}
                </div>

                {/* Content preview */}
                {version.content && (
                  <div className="text-xs bg-background rounded p-2 max-h-20 overflow-hidden">
                    <div className="line-clamp-3 text-muted-foreground">
                      {version.content.substring(0, 200)}
                      {version.content.length > 200 && '...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

