// components/previews/AudioPreview.tsx
'use client';

import { useState, useEffect } from 'react';

export default function AudioPreview({ data }: { data: Blob }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [data]);

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <audio className="w-full" controls>
        <source src={url} type={data.type} />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}