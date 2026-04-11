"use client";
import React, { useState } from "react";
import { ClipboardList, ChevronDown, ChevronUp } from "lucide-react";

export interface DisplayQuestionnaireBlockProps {
  introduction: string;
  questions?: Record<string, unknown>[];
}

const DisplayQuestionnaireBlock: React.FC<DisplayQuestionnaireBlockProps> = ({
  introduction,
  questions = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-lg border bg-card my-2 overflow-hidden">
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Questionnaire
          </span>
          {questions.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {questions.length} question{questions.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-border/40 px-3 py-3 space-y-3">
          {introduction && (
            <p className="text-sm text-foreground leading-relaxed">
              {introduction}
            </p>
          )}
          {questions.length > 0 && (
            <div className="space-y-2">
              {questions.map((q, i) => {
                const text = (q.text ?? q.question ?? q.label ?? q.title) as
                  | string
                  | undefined;
                const type = (q.type ?? q.input_type) as string | undefined;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded bg-muted/40 px-2.5 py-2"
                  >
                    <span className="text-xs font-mono text-muted-foreground w-5 flex-shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">
                        {text ?? JSON.stringify(q)}
                      </span>
                      {type && (
                        <span className="ml-2 text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded font-mono">
                          {type}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DisplayQuestionnaireBlock;
