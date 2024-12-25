'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface PDFViewerProps {
  url: string;
  onError?: (error: Error) => void;
}

export function PDFViewer({ url, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string>();

  const handleLoadError = (err: Error) => {
    setError('Failed to load PDF');
    onError?.(err);
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative">
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
            <div className="flex items-center justify-between mt-4 px-4">
              <button
                onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pageNumber <= 1}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                disabled={pageNumber >= numPages}
                className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
