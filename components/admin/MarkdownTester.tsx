'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PromptEditorContextMenu } from '@/features/prompts/components/PromptEditorContextMenu';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  FileText,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface MarkdownTesterProps {
  className?: string;
}

const SAMPLE_CONTENT = ``;

const MarkdownTester: React.FC<MarkdownTesterProps> = ({ className }) => {
  const [inputContent, setInputContent] = useState(SAMPLE_CONTENT);
  const [renderedContent, setRenderedContent] = useState(SAMPLE_CONTENT);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getTextarea = useCallback(() => textareaRef.current, []);

  const handleUpdate = useCallback(() => {
    setIsUpdating(true);
    setError(null);

    try {
      // Basic validation - check for unclosed code blocks
      const codeBlockMatches = inputContent.match(/```/g);
      if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
        throw new Error('Unclosed code block detected - make sure all ``` have matching closing ```');
      }

      // Check for basic JSON validity in code blocks
      const jsonBlocks = inputContent.match(/```json\s*([\s\S]*?)\s*```/g);
      if (jsonBlocks) {
        jsonBlocks.forEach((block, index) => {
          const jsonContent = block.replace(/```json\s*/, '').replace(/\s*```$/, '').trim();
          if (jsonContent) {
            try {
              JSON.parse(jsonContent);
            } catch (jsonError) {
              throw new Error(`Invalid JSON in code block ${index + 1}: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
            }
          }
        });
      }

      // If all validations pass, update the rendered content
      setRenderedContent(inputContent);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Markdown validation error:', err);
    } finally {
      setIsUpdating(false);
    }
  }, [inputContent]);

  const handleCopyInput = useCallback(() => {
    navigator.clipboard.writeText(inputContent);
  }, [inputContent]);


  const handleClear = useCallback(() => {
    setInputContent('');
  }, []);

  const handleContentInserted = useCallback(() => {
    // Focus back on textarea after content insertion
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  }, []);

  const containerClasses = isFullScreen 
    ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900'
    : `h-screen flex flex-col ${className || ''}`;

  // Calculate available height considering external header (assuming ~64px for typical header)
  const availableHeight = isFullScreen ? '100vh' : 'calc(100vh - 64px)';

  return (
    <>
      {isFullScreen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
      )}
      
      <div className={containerClasses} style={{ height: availableHeight }}>
        {/* Fixed Header Section */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          {/* Title and Main Controls */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Markdown Content Tester
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullScreen(!isFullScreen)}
              >
                {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <Button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
              {isUpdating ? 'Updating...' : 'Update Preview'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleCopyInput}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Input
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>

            <div className="ml-auto flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {inputContent.length} chars
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {inputContent.split('\n').length} lines
              </Badge>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Parsing Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Main Content Area with Independent Scrolling */}
        <div className={`flex-1 flex gap-4 p-4 min-h-0 ${showPreview ? '' : 'justify-center'}`}>
          {/* Input Column */}
          <div className={`flex flex-col ${showPreview ? 'w-1/2' : 'w-full max-w-4xl'}`}>
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <h3 className="text-sm font-medium">Input Content</h3>
              <Badge variant="outline" className="text-xs">Markdown/JSON</Badge>
            </div>
            
            <div className="flex-1 min-h-0 overflow-auto border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <PromptEditorContextMenu
                getTextarea={getTextarea}
                onContentInserted={handleContentInserted}
                className="block min-h-full"
              >
                <textarea
                  ref={textareaRef}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  className="w-full min-h-full p-4 font-mono text-sm resize-none focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 border-0"
                  placeholder="Enter your markdown, JSON, or mixed content here...
                  
Right-click for content block templates!"
                  spellCheck={false}
                  rows={Math.max(20, inputContent.split('\n').length + 5)}
                />
              </PromptEditorContextMenu>
            </div>
          </div>

          {/* Preview Column */}
          {showPreview && (
            <>
              <Separator orientation="vertical" className="self-stretch" />
              <div className="flex flex-col w-1/2">
                <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                  <h3 className="text-sm font-medium">Rendered Output</h3>
                  <Badge variant="outline" className="text-xs">
                    {error ? 'Error' : 'Live Preview'}
                  </Badge>
                  {!error && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Valid
                    </Badge>
                  )}
                </div>
                
                <div className="flex-1 border rounded-lg overflow-auto bg-slate-50 dark:bg-slate-900 border-gray-200 dark:border-gray-700 min-h-0">
                  {!error ? (
                    <div className="p-4">
                      <EnhancedChatMarkdown
                        content={renderedContent}
                        className="bg-slate-50 dark:bg-slate-900"
                        type="message"
                        role="assistant"
                        isStreamActive={false}
                        hideCopyButton={true}
                        allowFullScreenEditor={true}
                      />
                    </div>
                  ) : (
                    <div className="p-4 flex items-center justify-center h-full text-center text-muted-foreground">
                      <div>
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                        <p>Preview unavailable due to parsing errors</p>
                        <p className="text-xs mt-1">Fix the errors above and click "Update Preview"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default MarkdownTester;
