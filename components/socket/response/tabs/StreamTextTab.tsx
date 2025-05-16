import React, { useState } from 'react';
import { TabsContent, ScrollArea } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";
import { MarkdownCopyButton } from "@/components/matrx/buttons/MarkdownCopyButton";
import { cleanMarkdown } from '@/utils/markdown-processors/clean-markdown-to-text';
import MarkdownRenderer from '@/components/mardown-display/MarkdownRenderer';

interface StreamOutputTabProps {
    streamingResponse: string;
}

type DisplayMode = 'clean' | 'raw' | 'markdown';

const StreamTextTab = ({ streamingResponse }: StreamOutputTabProps) => {
    const [displayMode, setDisplayMode] = useState<DisplayMode>('clean');
    
    // Get the appropriate content based on the display mode
    const getContent = () => {
        switch(displayMode) {
            case 'raw':
                return streamingResponse;
            case 'clean':
                return cleanMarkdown(streamingResponse);
            case 'markdown':
                return streamingResponse;
            default:
                return cleanMarkdown(streamingResponse);
        }
    };
    
    const displayContent = getContent();
    
    return (
        <TabsContent value="streamText">
            <div className="flex justify-between mb-1">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setDisplayMode('clean')}
                        className={`text-xs px-2 py-1 rounded-xl ${
                            displayMode === 'clean' 
                                ? 'bg-blue-100 dark:bg-blue-900' 
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                        }`}
                    >
                        Clean
                    </button>
                    <button 
                        onClick={() => setDisplayMode('raw')}
                        className={`text-xs px-2 py-1 rounded-xl ${
                            displayMode === 'raw' 
                                ? 'bg-blue-100 dark:bg-blue-900' 
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                        }`}
                    >
                        Raw
                    </button>
                    <button 
                        onClick={() => setDisplayMode('markdown')}
                        className={`text-xs px-2 py-1 rounded-xl ${
                            displayMode === 'markdown' 
                                ? 'bg-blue-100 dark:bg-blue-900' 
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
                        }`}
                    >
                        Rendered
                    </button>
                </div>
                {displayMode === 'markdown' ? (
                    <MarkdownCopyButton markdownContent={streamingResponse} />
                ) : (
                    <CopyButton content={displayContent} />
                )}
            </div>
            <ScrollArea className="w-full rounded-md border p-2 h-full">
                {displayMode === 'markdown' && streamingResponse.length > 1 ? (
                    <MarkdownRenderer content={streamingResponse} fontSize={14} type="message" className="bg-inherit"/>
                ) : (
                    <div className="whitespace-pre-wrap font-mono text-xs">
                        {displayContent || (
                            <span className="text-gray-500 italic">No streaming data available</span>
                        )}
                    </div>
                )}
            </ScrollArea>
        </TabsContent>
    );
};

export default StreamTextTab;