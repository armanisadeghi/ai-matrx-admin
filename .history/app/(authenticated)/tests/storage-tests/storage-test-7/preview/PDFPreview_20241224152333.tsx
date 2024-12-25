// components/previews/PDFPreview.tsx
// components/previews/PDFPreview.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(
  () => import('./PDFViewer'),
  { ssr: false }
);

export default function PDFPreview({ data }: { data: Blob }) {
  const [error, setError] = useState('');
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    // Create object URL when data changes
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);

    // Cleanup object URL when component unmounts or data changes
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [data]);

  if (error) {
    return <div className="text-destructive p-4">{error}</div>;
  }

  if (!url) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="w-full h-full">
      <PDFViewer 
        url={url} 
        onError={(e) => setError('Error loading PDF')} 
      />
    </div>
  );
}