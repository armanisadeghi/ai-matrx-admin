"use client";

import React, { useState } from "react";
import { cn } from "@/styles/themes/utils";
import { Copy, Check } from "lucide-react";

interface InlineCodeSnippetProps {
  code: string;
  language?: string;
  className?: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  json: "text-emerald-600 dark:text-emerald-400",
  yaml: "text-rose-600 dark:text-rose-400",
  yml: "text-rose-600 dark:text-rose-400",
  xml: "text-teal-600 dark:text-teal-400",
  html: "text-orange-600 dark:text-orange-400",
  css: "text-pink-600 dark:text-pink-400",
  python: "text-yellow-600 dark:text-yellow-400",
  javascript: "text-amber-600 dark:text-amber-400",
  typescript: "text-blue-600 dark:text-blue-400",
  bash: "text-green-600 dark:text-green-400",
  shell: "text-green-600 dark:text-green-400",
  sql: "text-purple-600 dark:text-purple-400",
  rust: "text-orange-600 dark:text-orange-400",
  go: "text-cyan-600 dark:text-cyan-400",
  toml: "text-violet-600 dark:text-violet-400",
  csv: "text-lime-600 dark:text-lime-400",
};

export const InlineCodeSnippet: React.FC<InlineCodeSnippetProps> = ({
  code,
  language,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  // DATA CONTRACT: render code verbatim. A code block's leading/trailing
  // whitespace is meaningful (blank lines, alignment, significant
  // spaces). Previously we trimmed here for copy + display; that altered
  // what the user saw and copied relative to what the model produced.
  if (code.length === 0) return null;

  const langColor = language ? LANGUAGE_COLORS[language] : undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div
      className={cn(
        "my-2 rounded-md border border-border bg-muted/50 overflow-x-auto",
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 py-1 border-b border-border/50">
        <span
          className={cn(
            "text-xs font-mono font-medium text-muted-foreground",
            langColor,
          )}
        >
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="p-0.5 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <pre className="px-3 py-2 text-sm font-mono leading-relaxed text-foreground whitespace-pre-wrap break-words">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default InlineCodeSnippet;
