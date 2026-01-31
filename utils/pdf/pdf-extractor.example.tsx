// @ts-nocheck
/**
 * USAGE EXAMPLES for pdf-extractor utility
 * 
 * This file shows different ways to use the PDF extraction utility.
 * Delete this file after reviewing the examples.
 */

import { useState } from 'react';
import { extractTextFromPdf, extractTextFromMultiplePdfs } from './pdf-extractor';

// ============================================================
// Example 1: Basic usage with file input
// ============================================================
export function Example1_BasicFileUpload() {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await extractTextFromPdf(file);
    
    if (result.success) {
      console.log('Extracted text:', result.text);
      console.log('File name:', result.filename);
      console.log('Pages:', result.pageCount);
    } else {
      console.error('Error:', result.error);
    }
  };

  return <input type="file" accept="application/pdf" onChange={handleFileChange} />;
}

// ============================================================
// Example 2: With auth token
// ============================================================
export function Example2_WithAuth() {
  const handleExtract = async (file: File) => {
    const result = await extractTextFromPdf(file, {
      authToken: 'your-auth-token-here',
    });
    
    return result;
  };
}

// ============================================================
// Example 3: Custom server URL (production)
// ============================================================
export function Example3_CustomServer() {
  const handleExtract = async (file: File) => {
    const result = await extractTextFromPdf(file, {
      serverUrl: 'https://server.app.matrxserver.com',
      authToken: 'your-token',
    });
    
    return result;
  };
}

// ============================================================
// Example 4: Multiple files at once
// ============================================================
export function Example4_MultipleFiles() {
  const handleMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const results = await extractTextFromMultiplePdfs(files);
    
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`File ${index + 1}: ${result.filename}`);
        console.log(`Text length: ${result.text.length} characters`);
      } else {
        console.error(`File ${index + 1} failed:`, result.error);
      }
    });
  };

  return <input type="file" accept="application/pdf" multiple onChange={handleMultipleFiles} />;
}

// ============================================================
// Example 5: In a React component with state
// ============================================================
export function Example5_WithState() {
  const [extractedText, setExtractedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = async (file: File) => {
    setLoading(true);
    setError('');
    
    const result = await extractTextFromPdf(file);
    
    if (result.success) {
      setExtractedText(result.text);
    } else {
      setError(result.error || 'Unknown error');
    }
    
    setLoading(false);
  };

  return (
    <div>
      <input 
        type="file" 
        accept="application/pdf" 
        onChange={(e) => e.target.files?.[0] && handleExtract(e.target.files[0])}
      />
      {loading && <p>Extracting text...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {extractedText && <pre>{extractedText}</pre>}
    </div>
  );
}

// ============================================================
// Example 6: Drag and drop
// ============================================================
export function Example6_DragAndDrop() {
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== 'application/pdf') return;

    const result = await extractTextFromPdf(file);
    
    if (result.success) {
      console.log('Dropped PDF text:', result.text);
    }
  };

  return (
    <div 
      onDrop={handleDrop} 
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed p-4"
    >
      Drop PDF here
    </div>
  );
}

// ============================================================
// Example 7: With error handling and user feedback
// ============================================================
export function Example7_Complete() {
  const [result, setResult] = useState<{text: string; filename: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setResult(null);

    try {
      const extractionResult = await extractTextFromPdf(file, {
        authToken: process.env.NEXT_PUBLIC_API_TOKEN,
      });

      if (extractionResult.success) {
        setResult({
          text: extractionResult.text,
          filename: extractionResult.filename,
        });
        // Success notification
        alert(`Successfully extracted ${extractionResult.text.length} characters`);
      } else {
        // Error notification
        alert(`Failed to extract: ${extractionResult.error}`);
      }
    } catch (err) {
      alert('Unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        disabled={isProcessing}
      />
      {isProcessing && <div>Processing PDF...</div>}
      {result && (
        <div>
          <h3>{result.filename}</h3>
          <p>{result.text}</p>
        </div>
      )}
    </div>
  );
}

