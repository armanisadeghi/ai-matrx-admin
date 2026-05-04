'use client';
import React from 'react';
import { RefreshCw, Columns2, Grid3X3, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageViewMode } from '../../types';

interface ImageManagerToolbarProps {
  viewMode: ImageViewMode;
  onViewModeChange: (mode: ImageViewMode) => void;
  onRefresh: () => void;
  onUpload: () => void;
  imageCount: number;
}

export function ImageManagerToolbar({
  viewMode,
  onViewModeChange,
  onRefresh,
  onUpload,
  imageCount,
}: ImageManagerToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
      <span className="text-xs text-muted-foreground flex-1">
        {imageCount} {imageCount === 1 ? 'image' : 'images'}
      </span>

      <button
        type="button"
        onClick={onUpload}
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Upload className="w-3 h-3" />
        Upload
      </button>

      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh images"
        className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
      </button>

      <div className="flex items-center rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => onViewModeChange('masonry')}
          aria-label="Masonry view"
          className={cn(
            'flex items-center justify-center p-1.5 transition-colors',
            viewMode === 'masonry'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <Columns2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('grid')}
          aria-label="Grid view"
          className={cn(
            'flex items-center justify-center p-1.5 transition-colors',
            viewMode === 'grid'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
