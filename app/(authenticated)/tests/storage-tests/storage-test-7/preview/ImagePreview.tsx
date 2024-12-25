// components/previews/ImagePreview.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function ImagePreview({ data }: { data: Blob }) {
  const [error, setError] = useState('');
  const imageUrl = URL.createObjectURL(data);
  
  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video">
      <Image
        src={imageUrl}
        alt="File preview"
        fill
        className="object-contain rounded-lg"
        onError={() => setError('Error loading image')}
        onLoad={() => URL.revokeObjectURL(imageUrl)}
      />
      {error && <div className="text-destructive mt-2">{error}</div>}
    </div>
  );
}