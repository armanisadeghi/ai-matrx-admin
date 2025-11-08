'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PromptEditorContextMenu } from '@/features/prompts/components/PromptEditorContextMenu';
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import { parseMarkdownToText } from '@/utils/markdown-processors/parse-markdown-for-speech';
import { AudioTestModal } from '@/components/admin/AudioTestModal';
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
  Hand,
  Volume2
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
  const [activeTab, setActiveTab] = useState('enhanced-markdown');
  const [audioModalOpen, setAudioModalOpen] = useState(false);
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
        <div className="flex-shrink-0 bg-textured border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          {/* Title and Main Controls */}
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Markdown Content Tester
            </h1>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-7 px-2"
              >
                {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span className="ml-1.5 text-xs">{showPreview ? 'Hide' : 'Show'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="h-7 px-2"
              >
                {isFullScreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                <span className="ml-1.5 text-xs">{isFullScreen ? 'Exit' : 'Fullscreen'}</span>
              </Button>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Update Mode Toggle */}
            <Button
              variant={isAutoMode ? "default" : "outline"}
              size="sm"
              onClick={toggleUpdateMode}
              className="h-7 px-2.5 text-xs"
            >
              {isAutoMode ? (
                <>
                  <Zap className="h-3.5 w-3.5 mr-1.5" />
                  Auto
                </>
              ) : (
                <>
                  <Hand className="h-3.5 w-3.5 mr-1.5" />
                  Manual
                </>
              )}
            </Button>

            {/* Manual Update Button - only show in manual mode */}
            {!isAutoMode && (
              <Button
                onClick={handleManualUpdate}
                disabled={isUpdating}
                size="sm"
                className="h-7 px-2.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isUpdating ? 'animate-spin' : ''}`} />
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={handleCopyInput} className="h-7 px-2.5 text-xs">
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleClear} className="h-7 px-2.5 text-xs">
              Clear
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAudioModalOpen(true)}
              className="h-7 px-2.5 text-xs"
            >
              <Volume2 className="h-3.5 w-3.5 mr-1.5" />
              Test Audio
            </Button>

            <div className="ml-auto flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs h-6">
                {inputContent.length} chars
              </Badge>
              <Badge variant="secondary" className="text-xs h-6">
                {inputContent.split('\n').length} lines
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Content Area with Independent Scrolling */}
        <div className={`flex-1 flex gap-3 p-3 min-h-0 ${showPreview ? '' : 'justify-center'}`}>
          {/* Input Column */}
          <div className={`flex flex-col min-h-0 ${showPreview ? 'w-1/2' : 'w-full max-w-4xl'}`}>
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              <h3 className="text-sm font-medium">Input Content</h3>
              <Badge variant="outline" className="text-xs">Markdown/JSON</Badge>
            </div>
            
            <div className="flex-1 min-h-0 border rounded-lg bg-textured border-gray-200 dark:border-gray-700 overflow-hidden">
              <PromptEditorContextMenu
                getTextarea={getTextarea}
                onContentInserted={handleContentInserted}
                className="h-full"
              >
                <textarea
                  ref={textareaRef}
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  className="w-full h-full p-3 font-mono text-sm resize-none focus:outline-none bg-transparent text-gray-900 dark:text-gray-100 border-0"
                  placeholder="Enter your markdown, JSON, or mixed content here...
                  
Right-click for content block templates!"
                  spellCheck={false}
                />
              </PromptEditorContextMenu>
            </div>
          </div>

          {/* Preview Column */}
          {showPreview && (
            <>
              <Separator orientation="vertical" className="self-stretch" />
              <div className="flex flex-col min-h-0 w-1/2">
                <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                  <h3 className="text-sm font-medium">Rendered Output</h3>
                  <Badge variant="outline" className="text-xs">
                    {isAutoMode ? 'Auto' : 'Manual'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    {isAutoMode ? 'Real-time' : 'On-demand'}
                  </Badge>
                </div>

                <div className="flex-1 border rounded-lg bg-textured border-gray-200 dark:border-gray-700 min-h-0 flex flex-col overflow-hidden">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mx-3 mt-2 mb-0 flex-shrink-0">
                      <TabsTrigger value="enhanced-markdown" className="text-xs">
                        EnhancedMarkdown
                      </TabsTrigger>
                      <TabsTrigger value="speech-text" className="text-xs">
                        Speech Text
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="enhanced-markdown" className="flex-1 overflow-auto m-0 p-3 mt-0">
                      <EnhancedChatMarkdown
                        content={renderedContent}
                        className="bg-textured"
                        type="message"
                        role="assistant"
                        isStreamActive={false}
                        hideCopyButton={true}
                        allowFullScreenEditor={true}
                      />
                    </TabsContent>

                    <TabsContent value="speech-text" className="flex-1 overflow-auto m-0 p-3 mt-0">
                      <div className="font-mono text-sm whitespace-pre-wrap break-words bg-textured text-gray-900 dark:text-gray-100">
                        {parseMarkdownToText(renderedContent)}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Audio Test Modal */}
      <AudioTestModal
        open={audioModalOpen}
        onOpenChange={setAudioModalOpen}
        markdownContent={renderedContent}
      />
    </>
  );
};

export default MarkdownTester;
