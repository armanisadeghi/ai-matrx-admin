'use client';
import React from 'react';
import { ResponsiveGallery } from '@/components/image/ResponsiveGallery';
import { useImageCapture } from '@/features/images/components/capture/useImageCapture';
import { CloudFolders } from '@/features/files/utils/folder-conventions';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

interface ImageGalleryProps {
  imageUrls: string[];
}

export default function GalleryPage({ imageUrls }: ImageGalleryProps) {
  const { processFile } = useImageCapture({ folderPath: CloudFolders.IMAGES_SCREENSHOTS });

  const saveToCloud = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const name = url.split('/').pop()?.split('?')[0] ?? 'scraped-image.jpg';
      const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
      await processFile(file);
    } catch {
      toast.error('Failed to save image');
    }
  };

  return (
    <div className="relative">
      <ResponsiveGallery imageUrls={imageUrls} type="direct" />
      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border-t border-border">
          {imageUrls.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => saveToCloud(url)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Save to cloud images"
            >
              <Save className="w-3 h-3" />
              Save #{i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}