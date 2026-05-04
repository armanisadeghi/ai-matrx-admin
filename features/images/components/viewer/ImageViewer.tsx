'use client';
import React from 'react';
import Image from 'next/image';
import { Download, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageRecord, ImageSurface } from '../../types';

interface ImageViewerProps {
  image: ImageRecord | null;
  surface?: ImageSurface;
  onClose?: () => void;
  className?: string;
}

export function ImageViewer({
  image,
  surface = 'page',
  onClose,
  className,
}: ImageViewerProps) {
  if (!image) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground text-sm', className)}>
        Select an image to view
      </div>
    );
  }

  const compact = surface === 'panel';

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex-1 truncate text-sm font-medium">{image.name}</span>
        <a
          href={image.url}
          download={image.name}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Download"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
        <a
          href={image.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Open original"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <Image
          src={image.url}
          alt={image.name}
          width={800}
          height={600}
          className="max-w-full max-h-full object-contain rounded-md"
          unoptimized
        />
      </div>
      {!compact && (
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground flex gap-4">
          <span>{image.mimeType}</span>
          <span>{(image.size / 1024).toFixed(1)} KB</span>
          <span>{image.folderPath}</span>
        </div>
      )}
    </div>
  );
}
