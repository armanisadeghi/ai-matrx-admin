'use client';

import { useState, useEffect } from 'react';
import PDFView from './PDFViewer';

interface PDFPreviewProps {
  data: Blob;
}

export default function PDFPreview({ data }: PDFPreviewProps) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [data]);

  if (error) {
    return (
      <div className="text-destructive p-4">
        Failed to load PDF
      </div>
    );
  }

  if (!url) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        Loading PDF...
      </div>
    );
  }

  return (
    <PDFView 
      url={url}
      onError={() => setError('Failed to load PDF')}
    />
  );
}