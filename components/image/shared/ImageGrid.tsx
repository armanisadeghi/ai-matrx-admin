'use client';

import React, { useState } from 'react';
import { useSelectedImages, ImageSource } from '../context/SelectedImagesProvider';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import FilePreviewSheet from '@/components/ui/file-preview/FilePreviewSheet';
import { EnhancedFileDetails } from '@/utils/file-operations/constants';
import { SelectableImageCard } from './SelectableImageCard';

interface ImageGridProps {
  images: ImageSource[];
  onImageClick?: (image: ImageSource) => void;
  columns?: 1 | 2 | 3 | 4 | 5;
  gap?: 'sm' | 'md' | 'lg';
  aspectRatio?: '1:1' | '16:9' | '4:3' | '3:2';
  className?: string;
  selectable?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const gapSizes = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const roundedSizes = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

const gridColumns = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

const aspectRatios = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-video',
  '4:3': 'aspect-[4/3]',
  '3:2': 'aspect-[3/2]',
};

export function ImageGrid({
  images,
  onImageClick,
  columns = 3,
  gap = 'md',
  aspectRatio = '1:1',
  className,
  selectable = false,
  rounded = 'md',
}: ImageGridProps) {
  const [previewFile, setPreviewFile] = useState<{
    url: string;
    type: string;
    details?: EnhancedFileDetails;
  } | null>(null);
  
  const handleImageView = (image: ImageSource) => {
    if (onImageClick) {
      onImageClick(image);
      return;
    }

    setPreviewFile({
      url: image.url,
      type: 'image',
      details: {
        category: 'IMAGE',
        subCategory: image.metadata?.title ? 'Image' : 'Unknown',
        extension: image.url.split('.').pop() || '',
        filename: image.metadata?.title || image.id,
        iconName: 'image',
        mimetype: 'image/jpeg',
        canPreview: true
      } as EnhancedFileDetails
    });
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
        No images available
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        'grid',
        gridColumns[columns],
        gapSizes[gap],
        className
      )}>
        {images.map((image) => (
          <div key={image.id} className="relative">
            {selectable ? (
              <SelectableImageCard
                imageData={image}
                onClick={() => handleImageView(image)}
                className={cn('overflow-hidden', roundedSizes[rounded])}
              >
                <div className={cn('relative w-full h-full overflow-hidden', aspectRatios[aspectRatio])}>
                  <img
                    src={image.url}
                    alt={image.metadata?.description || 'Image'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </SelectableImageCard>
            ) : (
              <div 
                className={cn(
                  'cursor-pointer overflow-hidden transition-transform hover:scale-105',
                  roundedSizes[rounded],
                )}
                onClick={() => handleImageView(image)}
              >
                <div className={cn('relative', aspectRatios[aspectRatio])}>
                  <img
                    src={image.url}
                    alt={image.metadata?.description || 'Image'}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {previewFile && (
        <FilePreviewSheet
          isOpen={!!previewFile}
          onClose={closePreview}
          file={previewFile}
        />
      )}
    </>
  );
} 