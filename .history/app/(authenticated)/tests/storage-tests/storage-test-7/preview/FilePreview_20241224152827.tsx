'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic imports for preview components
const ImagePreview = dynamic(() => import('./ImagePreview'));
const TextPreview = dynamic(() => import('./TextPreview'));
const MarkdownPreview = dynamic(() => import('./MarkdownPreview'));
const PDFPreview = dynamic(() => import('./PDFPreview'));
const AudioPreview = dynamic(() => import('./AudioPreview'));
const VideoPreview = dynamic(() => import('./VideoPreview'));
const ArchivePreview = dynamic(() => import('./previews/ArchivePreview'));

type FilePreviewProps = {
  data: Blob | null;
  mimeType: string;
};

export default function FilePreview({ data, mimeType }: FilePreviewProps) {
  const [archiveEntries, setArchiveEntries] = useState<{ name: string; size: number; }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (data && mimeType.includes('zip')) {
      processArchive(data);
    }
  }, [data, mimeType]);

  async function processArchive(blob: Blob) {
    try {
      // Load JSZip dynamically to avoid SSR issues
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const contents = await zip.loadAsync(blob);
      
      const entries = Object.keys(contents.files).map(filename => ({
        name: filename,
        size: contents.files[filename]._data.uncompressedSize || 0
      }));
      
      setArchiveEntries(entries);
    } catch (err) {
      setError('Failed to process archive file');
    }
  }

  if (!data) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        No file data available
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive p-4">
        {error}
      </div>
    );
  }

  // Handle image files
  if (mimeType.startsWith('image/')) {
    return <ImagePreview data={data} />;
  }

  // Handle text and code files
  if (mimeType.startsWith('text/') || 
      mimeType === 'application/json' || 
      mimeType === 'application/javascript' ||
      mimeType === 'application/typescript') {
    
    if (mimeType === 'text/markdown') {
      return <MarkdownPreview data={data} />;
    }
    
    return <TextPreview data={data} mimeType={mimeType} />;
  }

  // Handle PDFs
  if (mimeType === 'application/pdf') {
    return <PDFPreview data={data} />;
  }

  // Handle audio files
  if (mimeType.startsWith('audio/')) {
    return <AudioPreview data={data} />;
  }

  // Handle video files
  if (mimeType.startsWith('video/')) {
    return <VideoPreview data={data} />;
  }

  // Handle archive files
  if (mimeType.includes('zip') || 
      mimeType.includes('tar') || 
      mimeType.includes('x-compressed')) {
    return <ArchivePreview entries={archiveEntries} />;
  }

  // Handle office documents
  if (mimeType.includes('officedocument') || 
      mimeType.includes('msword') || 
      mimeType.includes('ms-excel')) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        Office document preview not available. Please download the file to view it.
      </div>
    );
  }

  return (
    <div className="text-muted-foreground text-sm p-4">
      Preview not available for this file type ({mimeType})
    </div>
  );
}