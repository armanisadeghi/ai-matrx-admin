import React, { useState, useRef, useMemo } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";

// Helper function to extract title and clean content
const extractTitleAndContent = (content: string): { title: string; cleanedContent: string } => {
  const trimmed = content.trim();
  
  // Extract title from bold text (first **text** in the block)
  const titleMatch = trimmed.match(/^\*\*([^*]+)\*\*/);
  const title = titleMatch ? titleMatch[1] : 'Reasoning Step';
  
  // Remove the title and any leading empty lines from content
  let cleanedContent = trimmed;
  if (titleMatch) {
    // Remove the title (including the ** markers)
    cleanedContent = cleanedContent.replace(/^\*\*[^*]+\*\*/, '').trim();
  }
  
  // Remove any leading empty lines
  cleanedContent = cleanedContent.replace(/^\n+/, '');
  
  return { title, cleanedContent };
};

interface ReasoningVisualizationProps {
  reasoningText: string;
  showReasoning?: boolean;
}

const ReasoningVisualization: React.FC<ReasoningVisualizationProps> = ({ 
  reasoningText, 
  showReasoning = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract title and clean content
  const { title, cleanedContent } = useMemo(() => {
    return extractTitleAndContent(reasoningText);
  }, [reasoningText]);

  if (!showReasoning || !reasoningText?.trim()) return null;

  return (
    <div
      ref={containerRef}
      className="relative w-full mb-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors duration-150"
      >
        <div className="flex items-center space-x-3">
          <Brain className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <div className="flex flex-col items-start">
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {title}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Reasoning
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isExpanded ? 'Hide' : 'Show'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3">
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {cleanedContent}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReasoningVisualization;
