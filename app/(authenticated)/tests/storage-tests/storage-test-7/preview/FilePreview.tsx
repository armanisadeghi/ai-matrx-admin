'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getZipContents, type ZipEntry } from '@/utils/zipUtils';

// Dynamic imports for preview components
const ImagePreview = dynamic(() => import('./ImagePreview'));
const TextPreview = dynamic(() => import('./TextPreview'));
const MarkdownPreview = dynamic(() => import('./MarkdownPreview'));
const PDFPreview = dynamic(() => import('./PDFPreview'));
const AudioPreview = dynamic(() => import('./AudioPreview'));
const VideoPreview = dynamic(() => import('./VideoPreview'));
const ArchivePreview = dynamic(() => import('./ArchivePreview'));

type FilePreviewProps = {
  data: Blob | null;
  mimeType: string;
};

export default function FilePreview({ data, mimeType }: FilePreviewProps) {
  const [archiveEntries, setArchiveEntries] = useState<ZipEntry[]>([]);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function processArchive() {
      if (!data || !mimeType.includes('zip')) return;
      
      setIsProcessing(true);
      try {
        const entries = await getZipContents(data);
        setArchiveEntries(entries);
      } catch (err) {
        setError('Failed to process archive file');
        console.error('Archive processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    }

    processArchive();
  }, [data, mimeType]);
  
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
    if (isProcessing) {
      return (
        <div className="text-muted-foreground text-sm p-4">
          Processing archive...
        </div>
      );
    }
    return <ArchivePreview data={data} />;
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