'use client';

import React from 'react';
import type { CanvasContent } from '@/lib/redux/slices/canvasSlice';

// Import all interactive blocks
import MultipleChoiceQuiz from '@/components/mardown-display/blocks/quiz/MultipleChoiceQuiz';
import Slideshow from '@/components/mardown-display/blocks/presentations/Slideshow';
import RecipeViewer from '@/components/mardown-display/blocks/cooking-recipes/cookingRecipeDisplay';
import TimelineBlock from '@/components/mardown-display/blocks/timeline/TimelineBlock';
import ResearchBlock from '@/components/mardown-display/blocks/research/ResearchBlock';
import ResourceCollectionBlock from '@/components/mardown-display/blocks/resources/ResourceCollectionBlock';
import ProgressTrackerBlock from '@/components/mardown-display/blocks/progress/ProgressTrackerBlock';
import ComparisonTableBlock from '@/components/mardown-display/blocks/comparison/ComparisonTableBlock';
import TroubleshootingBlock from '@/components/mardown-display/blocks/troubleshooting/TroubleshootingBlock';
import DecisionTreeBlock from '@/components/mardown-display/blocks/decision-tree/DecisionTreeBlock';
import InteractiveDiagramBlock from '@/components/mardown-display/blocks/diagram/InteractiveDiagramBlock';
import FlashcardsBlock from '@/components/mardown-display/blocks/flashcards/FlashcardsBlock';
import CodeBlock from '@/components/mardown-display/code/CodeBlock';

interface PublicCanvasRendererProps {
    content: CanvasContent | any;
}

/**
 * Public Canvas Renderer
 * 
 * Simplified renderer for public shared canvases.
 * No Redux dependencies - works standalone.
 */
export function PublicCanvasRenderer({ content }: PublicCanvasRendererProps) {
    if (!content) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                <p className="text-sm">No content to display</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-auto">
            {renderContent(content)}
        </div>
    );
}

/**
 * Renders the appropriate component based on content type
 */
function renderContent(content: CanvasContent | any): React.ReactNode {
    const { type, data } = content;

    // Debug logging
    console.log('🎨 PublicCanvasRenderer - Rendering type:', type);
    console.log('📦 PublicCanvasRenderer - Data:', data);

    switch (type) {
        // Interactive blocks
        case 'quiz':
            return (
                <div className="h-full p-4">
                    <MultipleChoiceQuiz quizData={data} />
                </div>
            );

        case 'presentation':
            return (
                <div className="h-full">
                    <Slideshow 
                        slides={data.slides || data}
                        theme={data.theme || {
                            primaryColor: '#2563eb',
                            secondaryColor: '#1e40af',
                        }}
                    />
                </div>
            );

        case 'recipe':
            return (
                <div className="h-full p-4">
                    <RecipeViewer recipe={data} />
                </div>
            );

        case 'timeline':
            return (
                <div className="h-full p-4">
                    <TimelineBlock timeline={data} />
                </div>
            );

        case 'research':
            return (
                <div className="h-full p-4">
                    <ResearchBlock research={data} />
                </div>
            );

        case 'resources':
            return (
                <div className="h-full p-4">
                    <ResourceCollectionBlock collection={data} />
                </div>
            );

        case 'progress':
            return (
                <div className="h-full p-4">
                    <ProgressTrackerBlock tracker={data} />
                </div>
            );

        case 'comparison':
            return (
                <div className="h-full p-4">
                    <ComparisonTableBlock comparison={data} />
                </div>
            );

        case 'troubleshooting':
            return (
                <div className="h-full p-4">
                    <TroubleshootingBlock troubleshooting={data} />
                </div>
            );

        case 'decision-tree':
            return (
                <div className="h-full p-4">
                    <DecisionTreeBlock decisionTree={data} />
                </div>
            );

        case 'diagram':
            return (
                <div className="h-full p-4">
                    <InteractiveDiagramBlock diagram={data} />
                </div>
            );

        case 'flashcards':
            return (
                <div className="h-full p-4">
                    <FlashcardsBlock content={data} />
                </div>
            );

        case 'code':
            return (
                <div className="h-full p-4">
                    <CodeBlock
                        code={data.code || data}
                        language={data.language || 'javascript'}
                    />
                </div>
            );

        // Simple content types
        case 'iframe':
            const iframeUrl = data?.url || data;
            console.log('🌐 Rendering iframe with URL:', iframeUrl);
            return (
                <iframe
                    src={iframeUrl}
                    className="w-full h-full border-0"
                    title={content.metadata?.title || 'Canvas Content'}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
            );

        case 'html':
            const htmlContent = data?.html || data;
            console.log('📄 Rendering HTML content (length):', typeof htmlContent === 'string' ? htmlContent.length : 'not a string');
            return (
                <div 
                    className="p-4 prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            );

        case 'image':
            return (
                <div className="h-full flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
                    <img
                        src={data.url || data}
                        alt={content.metadata?.title || 'Canvas Image'}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            );

        default:
            console.warn('⚠️ Unsupported canvas type:', type);
            console.warn('📋 Available types:', [
                'quiz', 'flashcards', 'presentation', 'recipe', 'timeline',
                'research', 'resources', 'progress', 'comparison', 'troubleshooting',
                'decision-tree', 'diagram', 'code', 'iframe', 'html', 'image'
            ]);
            
            // Try to render as iframe if it looks like a URL
            if (typeof data === 'string' && (data.startsWith('http') || data.startsWith('//'))) {
                console.log('🔄 Attempting to render as iframe (fallback)');
                return (
                    <iframe
                        src={data}
                        className="w-full h-full border-0"
                        title={content.metadata?.title || 'Canvas Content'}
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                );
            }

            // Try to render as HTML if it contains HTML tags
            if (typeof data === 'string' && (data.includes('<') || data.includes('>'))) {
                console.log('🔄 Attempting to render as HTML (fallback)');
                return (
                    <div 
                        className="p-4 prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: data }}
                    />
                );
            }

            return (
                <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 p-4">
                    <div className="text-center max-w-lg">
                        <p className="text-lg mb-2">❌ Unsupported content type: <code className="text-red-500">{type}</code></p>
                        <p className="text-sm mb-4">This content type is not yet supported in public view</p>
                        <details className="text-left bg-gray-100 dark:bg-gray-800 p-4 rounded">
                            <summary className="cursor-pointer font-semibold mb-2">Debug Info</summary>
                            <pre className="text-xs overflow-auto">
                                {JSON.stringify({ type, dataType: typeof data, data }, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            );
    }
}

