'use client';

import { useState } from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import ReactPDF from '@react-pdf/renderer';
import { PDFViewer } from '@react-pdf/renderer';

interface PDFViewerProps {
  url: string;
  onError?: () => void;
}

const styles = StyleSheet.create({
    page: {
      flexDirection: 'row',
      backgroundColor: '#E4E4E4'
    },
    section: {
      margin: 10,
      padding: 10,
      flexGrow: 1
    }
  });
  
export default function PDFView({ url, onError }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);

  return (
    <div className="w-full h-[calc(100vh-12rem)]">
      <PDFViewer className="w-full h-full">
        <Document
          file={url}
          onLoadSuccess={({ numPages: nextNumPages }) => {
            setNumPages(nextNumPages);
          }}
          onLoadError={onError}
        >
          {Array.from(new Array(numPages), (el, index) => (
            <Page key={`page_${index + 1}`} pageNumber={index + 1} />
          ))}
        </Document>
      </PDFViewer>
    </div>
  );
}

