import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Brain, CircleDot } from "lucide-react";

// Helper function to extract title and clean content from a single reasoning block
const extractTitleAndContent = (content: string): { title: string; cleanedContent: string } => {
  const trimmed = content.trim();
  
  // Extract title from bold text (first **text** in the block)
  const titleMatch = trimmed.match(/^\*\*([^*]+)\*\*/);
  const title = titleMatch ? titleMatch[1] : 'Reasoning Step';
  
  // Remove the title and any leading empty lines from content
  let cleanedContent = trimmed;
  if (titleMatch) {
    cleanedContent = cleanedContent.replace(/^\*\*[^*]+\*\*/, '').trim();
  }
  
  cleanedContent = cleanedContent.replace(/^\n+/, '');
  
  return { title, cleanedContent };
};

interface ReasoningStep {
  title: string;
  content: string;
}

interface ConsolidatedReasoningVisualizationProps {
  /** Array of raw reasoning text blocks (the content from each <reasoning> block) */
  reasoningTexts: string[];
  showReasoning?: boolean;
}

const ConsolidatedReasoningVisualization: React.FC<ConsolidatedReasoningVisualizationProps> = ({ 
  reasoningTexts, 
  showReasoning = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse all reasoning steps
  const steps: ReasoningStep[] = useMemo(() => {
    return reasoningTexts
      .filter(text => text?.trim())
      .map(text => {
        const { title, cleanedContent } = extractTitleAndContent(text);
        return { title, content: cleanedContent };
      });
  }, [reasoningTexts]);

  if (!showReasoning || steps.length === 0) return null;

  // Build a summary label for the collapsed header
  const headerLabel = steps.length === 1 
    ? steps[0].title 
    : `${steps.length} Reasoning Steps`;

  // Collect step titles for the subtitle preview
  const stepTitlePreview = steps.length > 1
    ? steps.map(s => s.title).join(' \u2192 ')
    : null;

  return (
    <div
      className="relative w-full mb-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors duration-150"
      >
        <div className="flex items-center space-x-3 overflow-hidden min-w-0">
          <Brain className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 flex-shrink-0" />
          <div className="flex flex-col items-start min-w-0">
            <span className="text-slate-800 dark:text-slate-200 text-xs font-medium truncate">
              {headerLabel}
            </span>
            {!isExpanded && stepTitlePreview && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[300px]">
                {stepTitlePreview}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 flex-shrink-0">
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

      {/* Expanded content - all reasoning steps */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-0">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Timeline connector */}
              <div className="flex items-start gap-2.5">
                {/* Timeline dot and line */}
                <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                  <CircleDot className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  {index < steps.length - 1 && (
                    <div className="w-px flex-1 min-h-[12px] bg-slate-200 dark:bg-slate-700 mt-0.5" />
                  )}
                </div>
                
                {/* Step content */}
                <div className="flex-1 min-w-0 pb-3">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-0.5">
                    {step.title}
                  </p>
                  {step.content && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {step.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsolidatedReasoningVisualization;
