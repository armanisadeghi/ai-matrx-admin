'use client';

import { useState, useEffect } from 'react';
import { PDFViewer, Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

interface PDFViewerProps {
  url: string;
  onError?: () => void;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  section: {
    margin: 10,
    padding: 10,
    border: '1px solid #ccc',
  },
});

const PDFView = ({ url, onError }: PDFViewerProps) => {
  const [pdfContent, setPdfContent] = useState<Blob | null>(null);

  useEffect(() => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch PDF');
        }
        return response.blob();
      })
      .then((blob) => setPdfContent(blob))
      .catch(() => {
        if (onError) onError();
      });
  }, [url, onError]);

  if (!pdfContent) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        Loading PDF...
      </div>
    );
  }

  return (
    <PDFViewer className="w-full h-[calc(100vh-12rem)]">
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text>Sample content for the PDF from fetched file: {url}</Text>
          </View>
        </Page>
      </Document>
    </PDFViewer>
  );
};

export default PDFView;
