'use client';
import { useState } from 'react';
import { Crop } from 'lucide-react';
import { ImageCropperWithSelect } from '@/components/official/image-cropper/ImageCropperWithSelect';

export default function CropPage() {
  const [croppedUrl, setCroppedUrl] = useState('');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-border bg-card">
        <div className="rounded-md bg-muted p-1.5 border border-border">
          <Crop className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-foreground leading-none">Image Crop</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select an image, choose aspect ratio, and crop to your desired dimensions
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-start p-6">
          <div className="w-full max-w-2xl space-y-4">
            <ImageCropperWithSelect onComplete={setCroppedUrl} />
            {croppedUrl && (
              <div className="rounded-md border border-border overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={croppedUrl} alt="Cropped result" className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
