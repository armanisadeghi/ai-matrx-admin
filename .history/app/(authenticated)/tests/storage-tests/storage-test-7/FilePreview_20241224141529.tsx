'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Page, pdfjs } from 'react-pdf';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

type FilePreviewProps = {
  data: Blob | null;
  mimeType: string;
};

export default function FilePreview({ data, mimeType }: FilePreviewProps) {
  const [error, setError] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [numPages, setNumPages] = useState(1);
  
  useEffect(() => {
    if (!data) return;
    
    if (mimeType.startsWith('text/') || 
        mimeType === 'application/json' || 
        mimeType === 'application/javascript' ||
        mimeType === 'application/typescript') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target?.result as string || '');
      };
      reader.onerror = () => {
        setError('Error reading file');
      };
      reader.readAsText(data);
    }
  }, [data, mimeType]);

  if (!data) {
    return (
      <div className="text-muted-foreground text-sm p-4">
        No file data available
      </div>
    );
  }

  // Handle text-based files (code, config, etc.)
  if (mimeType.startsWith('text/') || 
      mimeType === 'application/json' || 
      mimeType === 'application/javascript' ||
      mimeType === 'application/typescript') {
    if (error) {
      return <div className="text-destructive p-4">{error}</div>;
    }

    // Handle markdown specifically
    if (mimeType === 'text/markdown') {
      return (
        <div className="prose dark:prose-invert max-w-none p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {textContent}
          </ReactMarkdown>
        </div>
      );
    }

    // Handle code with Monaco editor
    return (
      <div className="h-[500px] border rounded-lg overflow-hidden">
        <Editor
          value={textContent}
          language={getLanguageFromMimeType(mimeType)}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14
          }}
        />
      </div>
    );
  }

  // Handle images
  if (mimeType.startsWith('image/')) {
    const imageUrl = URL.createObjectURL(data);
    
    return (
      <div className="relative w-full max-w-2xl mx-auto aspect-video">
        <Image
          src={imageUrl}
          alt="File preview"
          fill
          className="object-contain rounded-lg"
          onError={() => setError('Error loading image')}
          onLoad={() => URL.revokeObjectURL(imageUrl)}
        />
        {error && <div className="text-destructive mt-2">{error}</div>}
      </div>
    );
  }

  // Handle PDFs
  if (mimeType === 'application/pdf') {
    const url = URL.createObjectURL(data);
    
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError('Error loading PDF')}
          error={<div className="text-destructive p-4">Error loading PDF</div>}
          loading={<div className="text-muted-foreground p-4">Loading PDF...</div>}
        >
          <Page pageNumber={1} />
        </Document>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground text-sm p-4">
      Preview not available for this file type ({mimeType})
    </div>
  );
}

function getLanguageFromMimeType(mimeType: string): string {
  const mimeToLang: Record<string, string> = {
    'text/plain': 'plaintext',
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'javascript',
    'application/javascript': 'javascript',
    'application/typescript': 'typescript',
    'application/json': 'json',
    'text/x-python': 'python',
    'text/x-java': 'java',
    'text/x-c': 'c',
    'text/x-cpp': 'cpp'
  };

  return mimeToLang[mimeType] || 'plaintext';
}