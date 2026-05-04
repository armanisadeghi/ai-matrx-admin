'use client';
import { useState } from 'react';
import { ImageCropperWithSelect } from '@/components/official/image-cropper/ImageCropperWithSelect';

export default function CropPage() {
  const [croppedUrl, setCroppedUrl] = useState('');

  return (
    <div className="h-full flex flex-col items-center justify-start p-6 overflow-y-auto">
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
  );
}
