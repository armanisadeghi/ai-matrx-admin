'use client';
import React from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImageRecord, ImageViewMode } from '../../types';

interface ImageManagerGridProps {
  images: ImageRecord[];
  loading: boolean;
  viewMode: ImageViewMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ImageManagerGrid({
  images,
  loading,
  viewMode,
  selectedId,
  onSelect,
}: ImageManagerGridProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">No images found.</p>
      </div>
    );
  }

  if (viewMode === 'masonry') {
    return (
      <div className="flex-1 overflow-y-auto p-3">
        <div className="columns-2 sm:columns-3 md:columns-4 gap-2">
          {images.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onSelect(img.id)}
              className={cn(
                'block w-full mb-2 rounded-md overflow-hidden border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedId === img.id
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-transparent hover:border-border',
              )}
            >
              <Image
                src={img.url}
                alt={img.name}
                width={200}
                height={200}
                unoptimized
                className="w-full h-auto object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // grid mode
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
      >
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onSelect(img.id)}
            className={cn(
              'relative aspect-square rounded-md overflow-hidden border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedId === img.id
                ? 'border-primary ring-1 ring-primary'
                : 'border-transparent hover:border-border',
            )}
          >
            <Image
              src={img.url}
              alt={img.name}
              width={200}
              height={200}
              unoptimized
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
