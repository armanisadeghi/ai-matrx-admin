// components/previews/PDFPreview.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => <div className="text-muted-foreground p-4">Loading viewer...</div>
});

export default function PDFPreview({ data }: { data: Blob }) {
  const [error, setError] = useState('');
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [data]);

  if (error) {
    return <div className="text-destructive p-4">{error}</div>;
  }

  return url ? (
    <PDFViewer url={url} onError={() => setError('Error loading PDF')} />
  ) : null;
}