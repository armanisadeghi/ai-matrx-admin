'use client';
import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { selectImage, setViewMode } from '../../redux/imageSlice';
import { useImages } from './useImages';
import { ImageManagerGrid } from './ImageManagerGrid';
import { ImageManagerToolbar } from './ImageManagerToolbar';
import { ImageCapture } from '../capture/ImageCapture';
import { CloudFolders } from '@/features/files/utils/folder-conventions';
import { cn } from '@/lib/utils';
import type { ImageSurface } from '../../types';

interface ImageManagerProps {
  surface?: ImageSurface;
  className?: string;
}

export function ImageManager({ surface = 'page', className }: ImageManagerProps) {
  const dispatch = useAppDispatch();
  const selectedImageId = useAppSelector((s) => s.images.selectedImageId);
  const viewMode = useAppSelector((s) => s.images.viewMode);
  const folderPath = useAppSelector((s) => s.images.activeFolderPath);
  const [showUpload, setShowUpload] = useState(false);

  const { images, loading, refresh } = useImages(folderPath ?? CloudFolders.IMAGES);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <ImageManagerToolbar
        viewMode={viewMode}
        onViewModeChange={(m) => dispatch(setViewMode(m))}
        onRefresh={refresh}
        onUpload={() => setShowUpload((v) => !v)}
        imageCount={images.length}
      />
      {showUpload && (
        <div className="p-3 border-b border-border">
          <ImageCapture
            surface={surface}
            folderPath={folderPath ?? CloudFolders.IMAGES}
            onUploaded={() => { setShowUpload(false); refresh(); }}
            className="min-h-[120px]"
          />
        </div>
      )}
      <ImageManagerGrid
        images={images}
        loading={loading}
        viewMode={viewMode}
        selectedId={selectedImageId}
        onSelect={(id) => dispatch(selectImage(id))}
      />
    </div>
  );
}
