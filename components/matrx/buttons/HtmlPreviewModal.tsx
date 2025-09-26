"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, CheckCircle2, Eye } from 'lucide-react';

interface HtmlPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  title?: string;
}

export default function HtmlPreviewModal({ 
  isOpen, 
  onClose, 
  htmlContent, 
  title = "HTML Preview" 
}: HtmlPreviewModalProps) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true); // Default to preview mode
  const [wordPressCSS, setWordPressCSS] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load WordPress CSS for accurate preview
  useEffect(() => {
    const loadWordPressCSS = async () => {
      try {
        const response = await fetch('/components/matrx/buttons/matrx-wordpress-styles-example.css');
        if (response.ok) {
          const cssContent = await response.text();
          setWordPressCSS(cssContent);
        } else {
          // Fallback: Inline the essential styles
          setWordPressCSS(getInlineWordPressCSS());
        }
      } catch (error) {
        console.warn('Could not load WordPress CSS file, using inline styles');
        setWordPressCSS(getInlineWordPressCSS());
      }
    };

    if (isOpen) {
      loadWordPressCSS();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Fallback CSS function with essential WordPress styles
  const getInlineWordPressCSS = () => `
    /* Force WordPress styling and override any inherited dark mode colors */
    .wordpress-preview-container {
      background-color: #ffffff !important;
      color: #333333 !important;
    }
    .wordpress-preview-container * {
      color: inherit !important;
    }
    .matrx-content-container {
      width: 100%;
      padding: 2rem;
      line-height: 1.6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background-color: #ffffff !important;
      color: #333333 !important;
    }
    .matrx-h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin: 0 0 1.5rem 0;
      color: #1a1a1a;
      line-height: 1.2;
    }
    .matrx-h2 {
      font-size: 1.8rem;
      font-weight: 600;
      margin: 3rem 0 1rem 0 !important;
      color: #2a2a2a;
      line-height: 1.3 !important;
      border-bottom: 2px solid #e5e5e5;
      padding-bottom: 0.75rem !important;
      padding-top: 0 !important;
    }
    .matrx-h3 {
      font-size: 1.3rem;
      font-weight: 600;
      margin: 2rem 0 1rem 0;
      color: #3a3a3a;
      line-height: 1.4;
    }
    .matrx-intro {
      font-size: 1.1rem;
      color: #4a4a4a;
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-left: 4px solid #d1d5db;
      border-radius: 0 8px 8px 0;
    }
    .matrx-paragraph {
      font-size: 1rem;
      color: #4a4a4a;
      margin-bottom: 1.5rem;
      text-align: justify;
    }
    .matrx-strong {
      font-weight: 600;
      color: #2a2a2a;
    }
    .matrx-em {
      font-style: italic;
      color: #2a2a2a;
    }
    .matrx-link {
      color: #374151;
      text-decoration: underline;
      text-decoration-color: #d1d5db;
      text-underline-offset: 3px;
      transition: all 0.2s ease;
    }
    .matrx-link:hover {
      color: #1f2937;
      text-decoration-color: #9ca3af;
    }
    .matrx-list {
      margin: 1.5rem 0;
      padding-left: 0;
    }
    .matrx-bullet-list {
      list-style: none;
    }
    .matrx-list-item {
      margin-bottom: 1rem;
      padding-left: 1.5rem;
      position: relative;
      color: #4a4a4a;
    }
    .matrx-list-item::before {
      content: "•";
      color: #6b7280;
      font-weight: bold;
      position: absolute;
      left: 0;
      top: 0;
      font-size: 1.2rem;
    }
    .matrx-faq-item {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #d1d5db;
    }
    .matrx-faq-question {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0 0 0.75rem 0;
      color: #2a2a2a;
    }
    .matrx-faq-answer {
      margin: 0;
      color: #4a4a4a;
      line-height: 1.6;
    }
    .matrx-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      border: 1px solid #e1e1e1;
      color: #333 !important;
    }
    .matrx-table-header {
      background-color: #f8f9fa !important;
      font-weight: 600;
      padding: 0.75rem;
      border: 1px solid #e1e1e1;
      text-align: left;
      color: #333 !important;
    }
    .matrx-table-cell {
      padding: 0.75rem;
      border: 1px solid #e1e1e1;
      color: #333 !important;
    }
    .matrx-table-row:nth-child(even) {
      background-color: #f8f9fa !important;
    }
    .matrx-table-row {
      color: #333 !important;
    }
    .matrx-table * {
      color: inherit !important;
    }
  `;

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy HTML:', err);
    }
  };

  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.select();
      textareaRef.current.setSelectionRange(0, 99999); // For mobile devices
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                !showPreview
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              HTML Code
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                showPreview
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Eye size={16} className="inline mr-1" />
              Preview
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-4 min-h-0">
            {!showPreview ? (
              // HTML Code Tab
              <div className="h-full flex flex-col">
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleCopyHtml}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                      copied
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy HTML
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={htmlContent}
                  readOnly
                  className="flex-1 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent overflow-y-auto"
                />
              </div>
            ) : (
              // Preview Tab
              <div className="h-full flex flex-col">
                <div className="mb-3 flex justify-end">
                  <button
                    onClick={handleCopyHtml}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                      copied
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy HTML
                      </>
                    )}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-auto border border-gray-300 dark:border-gray-600 rounded-md bg-white p-4">
                  {/* Inject WordPress CSS for accurate preview */}
                  <style dangerouslySetInnerHTML={{ __html: wordPressCSS }} />
                  <div
                    className="wordpress-preview-container"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
