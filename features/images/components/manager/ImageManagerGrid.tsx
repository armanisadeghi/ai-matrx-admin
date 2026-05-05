'use client';
import React from 'react';
import Image from 'next/image';
import { Loader2, Download, Copy, Wand2, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSignedUrl } from '@/features/files/hooks/useSignedUrl';
import type { ImageRecord, ImageViewMode } from '../../types';

interface ImageManagerGridProps {
  images: ImageRecord[];
  loading: boolean;
  viewMode: ImageViewMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDownload: (img: ImageRecord) => void;
  onCopyUrl: (img: ImageRecord) => void;
  onOpenInStudio: (img: ImageRecord) => void;
}

function ImageThumbnail({ img, className }: { img: ImageRecord; className?: string }) {
  const needsSigned = !img.url;
  const { url: signedUrl, loading } = useSignedUrl(
    needsSigned ? img.fileRecord.id : null,
    { expiresIn: 3600 },
  );
  const src = img.url || signedUrl;

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!src) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={img.name}
      width={200}
      height={200}
      unoptimized
      className={cn('object-cover', className)}
    />
  );
}

function ImageOverlay({
  img,
  onDownload,
  onCopyUrl,
  onOpenInStudio,
}: {
  img: ImageRecord;
  onDownload: (img: ImageRecord) => void;
  onCopyUrl: (img: ImageRecord) => void;
  onOpenInStudio: (img: ImageRecord) => void;
}) {
  return (
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
      {/* top-right: action icons */}
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpenInStudio(img); }}
          className="rounded-md bg-white/15 hover:bg-white/30 p-1.5 backdrop-blur-sm transition-colors"
          title="Edit in Studio"
        >
          <Wand2 className="w-3.5 h-3.5 text-white" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCopyUrl(img); }}
          className="rounded-md bg-white/15 hover:bg-white/30 p-1.5 backdrop-blur-sm transition-colors"
          title="Copy URL"
        >
          <Copy className="w-3.5 h-3.5 text-white" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDownload(img); }}
          className="rounded-md bg-white/15 hover:bg-white/30 p-1.5 backdrop-blur-sm transition-colors"
          title="Download"
        >
          <Download className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
      {/* bottom: filename */}
      <p className="text-white text-xs truncate leading-none opacity-90">{img.name}</p>
    </div>
  );
}

export function ImageManagerGrid({
  images,
  loading,
  viewMode,
  selectedId,
  onSelect,
  onDownload,
  onCopyUrl,
  onOpenInStudio,
}: ImageManagerGridProps) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
                'relative block w-full mb-2 rounded-lg overflow-hidden border group transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedId === img.id
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-transparent hover:border-border',
              )}
            >
              <ImageThumbnail img={img} className="w-full h-auto" />
              <ImageOverlay
                img={img}
                onDownload={onDownload}
                onCopyUrl={onCopyUrl}
                onOpenInStudio={onOpenInStudio}
              />
            </button>
          ))}
        </div>
      </div>
    );
  }

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
              'relative aspect-square rounded-lg overflow-hidden border group transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selectedId === img.id
                ? 'border-primary ring-1 ring-primary'
                : 'border-transparent hover:border-border',
            )}
          >
            <ImageThumbnail img={img} className="w-full h-full" />
            <ImageOverlay
              img={img}
              onDownload={onDownload}
              onCopyUrl={onCopyUrl}
              onOpenInStudio={onOpenInStudio}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
