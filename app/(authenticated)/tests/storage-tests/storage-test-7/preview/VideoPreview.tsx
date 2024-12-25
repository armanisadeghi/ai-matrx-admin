// components/previews/VideoPreview.tsx
'use client';

import { useState, useEffect } from 'react';

export default function VideoPreview({ data }: { data: Blob }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [data]);

  return (
    <div className="w-full max-w-4xl mx-auto aspect-video">
      <video className="w-full h-full rounded-lg" controls>
        <source src={url} type={data.type} />
        Your browser does not support the video element.
      </video>
    </div>
  );
}