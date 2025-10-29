// components/content-editor/CopyDropdownButton.tsx
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Copy, ChevronDown, FileText, Code, Brain } from 'lucide-react';
import { FcGoogle } from "react-icons/fc";
import { FaMicrosoft } from "react-icons/fa";
import { copyToClipboard } from '@/components/matrx/buttons/markdown-copy-utils';

interface CopyDropdownButtonProps {
  content: string;
  onCopySuccess?: () => void;
  onShowHtmlPreview?: (html: string) => void;
  className?: string;
}

export function CopyDropdownButton({ 
  content, 
  onCopySuccess,
  onShowHtmlPreview,
  className = '' 
}: CopyDropdownButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'above' | 'below'>('below');
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check viewport constraints
  useEffect(() => {
    if (showOptions && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropdownPosition(spaceBelow < 200 ? 'above' : 'below');
    }
  }, [showOptions]);

  const handleSuccess = () => {
    setCopied(true);
    setShowOptions(false);
    onCopySuccess?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPlainText = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForGoogleDocs: false,
      onSuccess: handleSuccess,
    });
  };

  const handleCopyGoogleDocs = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForGoogleDocs: true,
      onSuccess: handleSuccess,
    });
  };

  const handleCopyMicrosoftWord = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForGoogleDocs: true,
      onSuccess: handleSuccess,
    });
  };

  const handleHtmlPreview = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForWordPress: true,
      showHtmlPreview: true,
      onShowHtmlPreview: (html) => {
        onShowHtmlPreview?.(html);
        setShowOptions(false);
      },
      onSuccess: handleSuccess,
    });
  };

  const handleCopyWithThinking = async () => {
    await copyToClipboard(content, {
      isMarkdown: true,
      formatForGoogleDocs: false,
      includeThinking: true,
      onSuccess: handleSuccess,
    });
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setShowOptions(!showOptions)}
        disabled={!content}
        className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={copied ? "Copied!" : "Copy"}
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? (
          <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Dropdown */}
      {showOptions && content && (
        <>
          <div 
            className={`absolute ${
              dropdownPosition === 'above' ? 'bottom-full mb-1' : 'top-full mt-1'
            } right-0 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50`}
          >
            <button
              onClick={handleCopyPlainText}
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors first:rounded-t-lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              Plain Text
            </button>
            <button
              onClick={handleCopyGoogleDocs}
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-t border-zinc-100 dark:border-zinc-600"
            >
              <FcGoogle className="h-4 w-4 mr-2" />
              Google Docs
            </button>
            <button
              onClick={handleCopyMicrosoftWord}
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-t border-zinc-100 dark:border-zinc-600"
            >
              <FaMicrosoft className="h-4 w-4 mr-2 text-blue-500" />
              Microsoft Word
            </button>
            {onShowHtmlPreview && (
              <button
                onClick={handleHtmlPreview}
                className="flex items-center w-full px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-t border-zinc-100 dark:border-zinc-600"
              >
                <Code className="h-4 w-4 mr-2 text-green-600" />
                HTML
              </button>
            )}
            <button
              onClick={handleCopyWithThinking}
              className="flex items-center w-full px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border-t border-zinc-100 dark:border-zinc-600 last:rounded-b-lg"
            >
              <Brain className="h-4 w-4 mr-2 text-purple-600" />
              With Thinking
            </button>
          </div>
          
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowOptions(false)}
          />
        </>
      )}
    </div>
  );
}

