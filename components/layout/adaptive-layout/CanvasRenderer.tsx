"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/redux";
import { closeCanvas, CanvasContent } from "@/lib/redux/slices/canvasSlice";

// Import all interactive blocks
import MultipleChoiceQuiz from "@/components/mardown-display/blocks/quiz/MultipleChoiceQuiz";
import Slideshow from "@/components/mardown-display/blocks/presentations/Slideshow";
import RecipeViewer from "@/components/mardown-display/blocks/cooking-recipes/cookingRecipeDisplay";
import TimelineBlock from "@/components/mardown-display/blocks/timeline/TimelineBlock";
import ResearchBlock from "@/components/mardown-display/blocks/research/ResearchBlock";
import ResourceCollectionBlock from "@/components/mardown-display/blocks/resources/ResourceCollectionBlock";
import ProgressTrackerBlock from "@/components/mardown-display/blocks/progress/ProgressTrackerBlock";
import ComparisonTableBlock from "@/components/mardown-display/blocks/comparison/ComparisonTableBlock";
import TroubleshootingBlock from "@/components/mardown-display/blocks/troubleshooting/TroubleshootingBlock";
import DecisionTreeBlock from "@/components/mardown-display/blocks/decision-tree/DecisionTreeBlock";
import InteractiveDiagramBlock from "@/components/mardown-display/blocks/diagram/InteractiveDiagramBlock";
import FlashcardsBlock from "@/components/mardown-display/blocks/flashcards/FlashcardsBlock";
import CodeBlock from "@/components/mardown-display/code/CodeBlock";

interface CanvasRendererProps {
  content: CanvasContent | null;
}

/**
 * CanvasRenderer - Universal renderer for canvas content
 * 
 * Handles rendering of different interactive content types in the canvas panel.
 * Each block type is rendered with appropriate props and full interactivity.
 */
export function CanvasRenderer({ content }: CanvasRendererProps) {
  const dispatch = useAppDispatch();

  if (!content) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
        <p className="text-sm">No content to display</p>
      </div>
    );
  }

  const handleClose = () => {
    dispatch(closeCanvas());
  };

  return (
    <div className="h-full flex flex-col bg-textured">
      {/* Canvas Header - Rounded top with subtle background */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-t-2xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {content.metadata?.title || 'Canvas View'}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="flex-shrink-0 ml-2 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent(content)}
      </div>
    </div>
  );
}

/**
 * Renders the appropriate component based on content type
 */
function renderContent(content: CanvasContent): React.ReactNode {
  const { type, data } = content;

  switch (type) {
    // ✅ FULLY IMPLEMENTED BLOCKS
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
              primaryColor: "#2563eb",
              secondaryColor: "#1e40af",
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

    // 🚧 SIMPLE CONTENT TYPES
    case 'iframe':
      return (
        <iframe
          src={data.url || data}
          className="w-full h-full border-0"
          title={content.metadata?.title || 'Canvas Content'}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      );

    case 'html':
      return (
        <div 
          className="p-4 prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: data.html || data }}
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
      return (
        <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-600 p-4">
          <div className="text-center">
            <p className="text-sm mb-2">❌ Unsupported content type: {type}</p>
            <p className="text-xs">Add a renderer for this type in CanvasRenderer.tsx</p>
          </div>
        </div>
      );
  }
}

