// components/previews/PDFViewer.tsx
'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PDFViewerProps {
  url: string;
  onError?: (error: Error) => void;
}

export function PDFViewer({ url, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string>();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLoadError = (err: Error) => {
    setError('Failed to load PDF');
    onError?.(err);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl relative">
      {error ? (
        <div className="text-destructive p-4 text-center bg-destructive/10 rounded-md">
          {error}
        </div>
      ) : (
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={handleLoadError}
          loading={
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <span className="animate-pulse">Loading PDF...</span>
            </div>
          }
        >
          <div className="overflow-hidden rounded-md shadow-sm">
            <Page 
              pageNumber={pageNumber} 
              className="bg-background"
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </div>
          {numPages && numPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
                className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
                className="px-3 py-1.5 text-sm font-medium text-primary-foreground bg-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </Document>
      )}
    </div>
  );
}

interface PDFPreviewProps {
  data: Blob;
}

export default function PDFPreview({ data }: PDFPreviewProps) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!data) return;
    
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [data]);

  if (!url) {
    return null;
  }

  return (
    <PDFViewer 
      url={url}
      onError={(error) => {
        console.error('PDF loading error:', error);
      }}
    />
  );
}