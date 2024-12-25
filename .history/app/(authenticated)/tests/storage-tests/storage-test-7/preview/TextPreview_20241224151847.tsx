// components/previews/TextPreview.tsx
'use client';

import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function TextPreview({ data, mimeType }: { data: Blob; mimeType: string }) {
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
    <div className="h-[500px] border rounded-lg overflow-hidden">
      <Editor
        value={content}
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