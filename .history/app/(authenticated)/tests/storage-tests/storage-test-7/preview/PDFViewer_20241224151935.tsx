// components/previews/PDFViewer.tsx
'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

type PDFViewerProps = {
  url: string;
  onError: () => void;
};

export default function PDFViewer({ url, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState(1);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={onError}
        error={<div className="text-destructive p-4">Error loading PDF</div>}
        loading={<div className="text-muted-foreground p-4">Loading PDF...</div>}
      >
        <Page pageNumber={1} />
      </Document>
    </div>
  );
}