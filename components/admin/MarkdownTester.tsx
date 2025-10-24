'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PromptEditorContextMenu } from '@/features/prompts/components/PromptEditorContextMenu';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { 
  CheckCircle2, 
  Copy, 
  FileText,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  RefreshCw,
  Zap,
  Hand
} from 'lucide-react';

interface MarkdownTesterProps {
  className?: string;
}

const SAMPLE_CONTENT = ``;

const MarkdownTester: React.FC<MarkdownTesterProps> = ({ className }) => {
  const [inputContent, setInputContent] = useState(SAMPLE_CONTENT);
  const [renderedContent, setRenderedContent] = useState(SAMPLE_CONTENT);
  const [showPreview, setShowPreview] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isAutoMode, setIsAutoMode] = useState(false); // Default to Manual mode
  const [isUpdating, setIsUpdating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const getTextarea = useCallback(() => textareaRef.current, []);

  // Auto-update effect when in auto mode
  React.useEffect(() => {
    if (isAutoMode) {
      setRenderedContent(inputContent);
    }
  }, [inputContent, isAutoMode]);

  const handleManualUpdate = useCallback(() => {
    setIsUpdating(true);
    // Small delay to show the updating state
    setTimeout(() => {
      setRenderedContent(inputContent);
      setIsUpdating(false);
    }, 100);
  }, [inputContent]);

  const toggleUpdateMode = useCallback(() => {
    const newAutoMode = !isAutoMode;
    setIsAutoMode(newAutoMode);
    
    // If switching to auto mode, immediately sync the content
    if (newAutoMode) {
      setRenderedContent(inputContent);
    }
  }, [isAutoMode, inputContent]);

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
    ? 'fixed inset-0 z-50 bg-textured'
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
        <div className="flex-shrink-0 bg-textured border-b border-gray-200 dark:border-gray-700 p-4">
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
            {/* Update Mode Toggle */}
            <Button
              variant={isAutoMode ? "default" : "outline"}
              size="sm"
              onClick={toggleUpdateMode}
              className="flex items-center gap-2"
            >
              {isAutoMode ? (
                <>
                  <Zap className="h-4 w-4" />
                  Auto
                </>
              ) : (
                <>
                  <Hand className="h-4 w-4" />
                  Manual
                </>
              )}
            </Button>

            {/* Manual Update Button - only show in manual mode */}
            {!isAutoMode && (
              <Button
                onClick={handleManualUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Updating...' : 'Update Preview'}
              </Button>
            )}
            
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
        </div>

        {/* Main Content Area with Independent Scrolling */}
        <div className={`flex-1 flex gap-4 p-4 min-h-0 ${showPreview ? '' : 'justify-center'}`}>
          {/* Input Column */}
          <div className={`flex flex-col ${showPreview ? 'w-1/2' : 'w-full max-w-4xl'}`}>
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <h3 className="text-sm font-medium">Input Content</h3>
              <Badge variant="outline" className="text-xs">Markdown/JSON</Badge>
            </div>
            
            <div className="flex-1 min-h-0 overflow-auto border rounded-lg bg-textured border-gray-200 dark:border-gray-700">
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
                    {isAutoMode ? 'Auto Preview' : 'Manual Preview'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {isAutoMode ? 'Real-time' : 'On-demand'}
                  </Badge>
                </div>
                
                <div className="flex-1 border rounded-lg overflow-auto bg-textured border-gray-200 dark:border-gray-700 min-h-0">
                  <div className="p-4">
                    <EnhancedChatMarkdown
                      content={renderedContent}
                      className="bg-textured"
                      type="message"
                      role="assistant"
                      isStreamActive={false}
                      hideCopyButton={true}
                      allowFullScreenEditor={true}
                    />
                  </div>
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
