"use client";

/**
 * DiffControls Component
 * 
 * Control panel for managing diffs (accept all, reject all, save, undo)
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, XCircle, Save, Undo2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DiffControlsProps {
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  isDirty: boolean;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onSave: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isProcessing?: boolean;
  className?: string;
}

export function DiffControls({
  pendingCount,
  acceptedCount,
  rejectedCount,
  isDirty,
  onAcceptAll,
  onRejectAll,
  onSave,
  onUndo,
  canUndo,
  isProcessing = false,
  className,
}: DiffControlsProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between gap-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-950/30">
                {pendingCount} Pending
              </Badge>
            </div>
          )}
          
          {acceptedCount > 0 && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30">
              {acceptedCount} Accepted
            </Badge>
          )}
          
          {rejectedCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30">
              {rejectedCount} Rejected
            </Badge>
          )}
          
          {isDirty && (
            <Badge variant="default" className="bg-blue-600">
              Unsaved
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Undo */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onUndo}
            disabled={!canUndo || isProcessing}
            className="h-8"
          >
            <Undo2 className="h-3.5 w-3.5 mr-1.5" />
            Undo
          </Button>

          {/* Reject All */}
          {pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRejectAll}
              disabled={isProcessing}
              className="h-8 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-950/30"
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Reject All
            </Button>
          )}

          {/* Accept All */}
          {pendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAcceptAll}
              disabled={isProcessing}
              className="h-8 bg-green-50 text-green-700 border-green-300 hover:bg-green-100 dark:bg-green-950/30"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Accept All
            </Button>
          )}

          {/* Save */}
          {isDirty && (
            <Button
              size="sm"
              onClick={onSave}
              disabled={isProcessing}
              className="h-8 bg-primary"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

