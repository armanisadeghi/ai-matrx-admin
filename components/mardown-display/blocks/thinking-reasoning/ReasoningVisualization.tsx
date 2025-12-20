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
  isStreaming?: boolean;
}

const ReasoningVisualization: React.FC<ReasoningVisualizationProps> = ({ 
  reasoningText, 
  showReasoning = true,
  isStreaming = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract title and clean content
  const { title, cleanedContent } = useMemo(() => {
    return extractTitleAndContent(reasoningText);
  }, [reasoningText]);

  if (!showReasoning || !reasoningText?.trim()) return null;

  return (
    <>
      {/* Keyframe animation for shimmer */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes reasoning-shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `
      }} />
      
      <div
        ref={containerRef}
        className="relative w-full mb-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-1 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors duration-150 relative overflow-hidden"
        >
          {/* Shimmer effect while streaming */}
          {isStreaming && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.15) 50%, transparent 100%)',
                animation: 'reasoning-shimmer 2s infinite linear',
              }}
            />
          )}
        
        <div className="flex items-center space-x-3 overflow-hidden relative z-10">
          <Brain className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-0.5 min-w-0">
            <span className="text-slate-800 dark:text-slate-200 text-xs truncate">
              {title}
            </span>
            {isStreaming && (
              <span className="text-slate-800 dark:text-slate-200 text-xs animate-pulse">
                ...
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isExpanded ? 'Hide' : 'Show Reasoning'}
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
        <div className="px-3 pt-2 pb-0">
          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {cleanedContent}
          </p>
        </div>
      )}
      </div>
    </>
  );
};

export default ReasoningVisualization;
