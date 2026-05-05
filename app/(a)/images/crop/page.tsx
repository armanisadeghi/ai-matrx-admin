'use client';
import { Crop } from 'lucide-react';
import { ImageCropWorkspace } from '@/features/images/components/crop/ImageCropWorkspace';

export default function CropPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-card">
        <div className="rounded-md bg-muted p-1.5 border border-border">
          <Crop className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-none">Image Crop</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select an image, choose an aspect ratio, then crop and save
          </p>
        </div>
      </div>
      <ImageCropWorkspace />
    </div>
  );
}
