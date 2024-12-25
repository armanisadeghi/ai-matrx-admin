// components/previews/PDFPreview.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const PDFViewer = dynamic(
  () => import('./PDFViewer'),
  { ssr: false }
);

export default function PDFPreview({ data }: { data: Blob }) {
  const [error, setError] = useState('');
  const url = URL.createObjectURL(data);

  return <PDFViewer url={url} onError={() => setError('Error loading PDF')} />;
}