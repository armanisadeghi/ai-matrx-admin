'use client';
import React, { useState } from 'react';
import { Images } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { selectImage, setViewMode } from '../../redux/imageSlice';
import { useImages } from './useImages';
import { ImageManagerGrid } from './ImageManagerGrid';
import { ImageManagerToolbar } from './ImageManagerToolbar';
import { ImageCapture } from '../capture/ImageCapture';
import { CloudFolders } from '@/features/files/utils/folder-conventions';
import { cn } from '@/lib/utils';
import type { ImageRecord, ImageSurface } from '../../types';

interface ImageManagerProps {
  surface?: ImageSurface;
  className?: string;
}

export function ImageManager({ surface = 'page', className }: ImageManagerProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const selectedImageId = useAppSelector((s) => s.images.selectedImageId);
  const viewMode = useAppSelector((s) => s.images.viewMode);
  const folderPath = useAppSelector((s) => s.images.activeFolderPath);
  const [showUpload, setShowUpload] = useState(false);

  const { images, loading, refresh } = useImages(folderPath ?? CloudFolders.IMAGES);

  const isEmpty = !loading && images.length === 0;

  const handleDownload = (img: ImageRecord) => {
    window.open(img.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyUrl = (img: ImageRecord) => {
    navigator.clipboard.writeText(img.url).then(() => {
      toast.success('URL copied to clipboard');
    });
  };

  const handleOpenInStudio = (img: ImageRecord) => {
    dispatch(selectImage(img.id));
    router.push('/images/studio');
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Page header — page surface only */}
      {surface === 'page' && (
        <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-card">
          <div className="rounded-md bg-muted p-1.5 border border-border">
            <Images className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-foreground leading-none">Image Manager</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Browse and manage your cloud images</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <ImageManagerToolbar
        viewMode={viewMode}
        onViewModeChange={(m) => dispatch(setViewMode(m))}
        onRefresh={refresh}
        onUpload={() => setShowUpload((v) => !v)}
        imageCount={images.length}
      />

      {/* Inline upload strip (only when images already exist and upload is toggled) */}
      {showUpload && !isEmpty && (
        <div className="p-3 border-b border-border">
          <ImageCapture
            surface={surface}
            folderPath={folderPath ?? CloudFolders.IMAGES}
            visibility="public"
            onUploaded={() => { setShowUpload(false); refresh(); }}
            className="min-h-[120px]"
          />
        </div>
      )}

      {/* Hero upload zone — shown when no images */}
      {isEmpty && (
        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <ImageCapture
            surface={surface}
            folderPath={folderPath ?? CloudFolders.IMAGES}
            visibility="public"
            onUploaded={refresh}
            className="w-full max-w-xl flex-1 min-h-[300px] max-h-[420px]"
          />
        </div>
      )}

      {/* Image grid — shown when images exist */}
      {!isEmpty && (
        <ImageManagerGrid
          images={images}
          loading={loading}
          viewMode={viewMode}
          selectedId={selectedImageId}
          onSelect={(id) => dispatch(selectImage(id))}
          onDownload={handleDownload}
          onCopyUrl={handleCopyUrl}
          onOpenInStudio={handleOpenInStudio}
        />
      )}
    </div>
  );
}
