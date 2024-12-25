'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import remarkGfm from 'remark-gfm';

const ReactMarkdown = dynamic(
  () => import('react-markdown').then((mod) => mod.default),
  { ssr: false }
);

export default function MarkdownPreview({ data }: { data: Blob }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setContent(e.target?.result as string || '');
    reader.onerror = () => setError('Error reading file');
    reader.readAsText(data);
  }, [data]);

  if (error) return <div className="text-destructive p-4">{error}</div>;

  return (
    <div className="prose dark:prose-invert max-w-none p-4">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}