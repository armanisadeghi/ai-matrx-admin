// components/previews/PDFViewer.tsx
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker for react-pdf (client-side only)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  url: string;
  onError?: () => void;
}

export default function PDFViewer({ url, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <div className="w-full h-[calc(100vh-12rem)] overflow-auto bg-background">
      <div className="flex flex-col items-center">
        <Document
          className="max-w-full"
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={onError}
          error={
            <div className="text-destructive p-4">
              Failed to load PDF
            </div>
          }
          loading={
            <div className="text-muted-foreground p-4">
              Loading PDF...
            </div>
          }
        >
          {numPages && Array.from(new Array(numPages)).map((_, index) => (
            <div key={`page_${index + 1}`} className="mb-4">
              <Page 
                pageNumber={index + 1} 
                className="max-w-full shadow-lg"
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}