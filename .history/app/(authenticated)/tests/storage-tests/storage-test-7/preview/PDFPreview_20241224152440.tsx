// components/previews/PDFPreview.tsx
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { pdfjs } from 'react-pdf';
import PDFViewer from './PDFViewer';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


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