"use client";
import React, { useState } from "react";
import { HelpCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

export interface UnknownDataEventBlockProps {
  dataType: string;
  data: Record<string, unknown>;
}

/**
 * Catchall block rendered when a `data` event arrives whose `type` is not
 * registered in process-stream.ts. Every field is visible so the team can
 * immediately see what arrived and decide how to handle it properly.
 */
const UnknownDataEventBlock: React.FC<UnknownDataEventBlockProps> = ({
  dataType,
  data,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const pretty = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // silent
    }
  };

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/5 my-2 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <HelpCircle className="w-4 h-4 text-warning flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Unknown Data Event
            </span>
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-warning/15 text-warning font-medium">
              {dataType}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            This data type is not yet registered. Expand to inspect and add to
            the handler.
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            title="Copy JSON"
          >
            {isCopied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-border/40 px-3 py-2">
          <pre className="text-xs text-muted-foreground overflow-auto max-h-60 leading-relaxed font-mono">
            {pretty}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UnknownDataEventBlock;
