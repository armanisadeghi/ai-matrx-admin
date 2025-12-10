"use client";
import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the worker to match the installed pdfjs-dist version
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFPreviewProps {
  file: {
    url: string;
    blob?: Blob | null;
    type: string;
    details?: any;
  };
  isLoading: boolean;
}

const PDFPreview: React.FC<PDFPreviewProps> = ({ file, isLoading }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container width to properly size the PDF
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Subtract padding to avoid overflow
        setContainerWidth(containerRef.current.clientWidth - 32);
      }
    };

    // Initial measurement
    updateWidth();

    // Update on resize
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error while loading PDF:", error);
    setPdfError(error.message);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full">Loading PDF...</div>;
  }

  if (pdfError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-2 text-center">
        <p className="text-red-500 mb-4">Failed to load PDF: {pdfError}</p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => window.open(file.url, "_blank")}
        >
          Open PDF in new tab
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="h-full w-full overflow-auto p-4"
    >
      <Document
        file={file.url}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={<div className="text-gray-500 p-4">Loading PDF...</div>}
        error={<div className="text-red-500 p-4">Failed to load PDF</div>}
        className="flex flex-col items-center w-full"
      >
        {numPages &&
          Array.from(new Array(numPages), (_, index) => (
            <div key={`page_${index + 1}`} className="mb-4 w-full flex justify-center">
              <Page
                pageNumber={index + 1}
                width={containerWidth || undefined}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            </div>
          ))}
      </Document>
    </div>
  );
};

export default PDFPreview;