// components/previews/PDFViewer.tsx
'use client';

import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

type PDFViewerProps = {
  url: string;
  onError: () => void;
};

export default function PDFViewer({ url, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={onError}
        error={<div className="text-destructive p-4">Error loading PDF</div>}
        loading={<div className="text-muted-foreground p-4">Loading PDF...</div>}
      >
        {numPages && <Page pageNumber={1} />}
      </Document>
    </div>
  );
}