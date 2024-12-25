'use client';

import { useState } from 'react';
import Image from 'next/image';

type FilePreviewProps = {
  data: Blob | null;
  mimeType: string;
};

export default function FilePreview({ data, mimeType }: FilePreviewProps) {
  const [error, setError] = useState<string>('');

  if (!data) return null;

  // Handle text files
  if (mimeType.startsWith('text/')) {
    try {
      const reader = new FileReader();
      reader.readAsText(data);
      
      return (
        <pre className="bg-muted/50 p-4 rounded-lg overflow-auto max-h-[500px] text-sm">
          {reader.result as string}
        </pre>
      );
    } catch (err) {
      return <div className="text-destructive">Error reading text file</div>;
    }
  }

  // Handle images
  if (mimeType.startsWith('image/')) {
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

  return (
    <div className="text-muted-foreground text-sm">
      Preview not available for this file type ({mimeType})
    </div>
  );
}