'use client';
import React, { useEffect, useState } from 'react';
import { Upload, Clipboard, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImageCapture } from './useImageCapture';
import type { ImageSurface, UploadQueueItem } from '../../types';

interface ImageCaptureProps {
  surface?: ImageSurface;
  folderPath?: string;
  onUploaded?: (item: UploadQueueItem) => void;
  globalPaste?: boolean;
  className?: string;
}

export function ImageCapture({
  surface = 'page',
  folderPath,
  onUploaded,
  globalPaste = false,
  className,
}: ImageCaptureProps) {
  const { fileInputRef, handlePaste, handleDrop, handleFileInput, openPicker } =
    useImageCapture({ folderPath, onUploaded });

  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!globalPaste) return;
    const handler = (e: ClipboardEvent) => handlePaste(e);
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [globalPaste, handlePaste]);

  const compact = surface === 'panel';

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
        isDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        compact ? 'gap-2 p-4' : 'gap-4 p-10',
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        handleDrop(e);
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={handleFileInput}
      />
      <ImageIcon className={cn('text-muted-foreground', compact ? 'w-6 h-6' : 'w-10 h-10')} />
      {!compact && (
        <p className="text-sm text-muted-foreground text-center">
          Drop images here, paste from clipboard, or
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="w-3 h-3" />
          {compact ? 'Upload' : 'Choose Files'}
        </button>
        {!compact && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clipboard className="w-3 h-3" />
            or Ctrl+V
          </span>
        )}
      </div>
    </div>
  );
}
