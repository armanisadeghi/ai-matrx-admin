"use client";

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import { useState, useCallback } from "react";
import { Button } from "@ai-matrx/design-system/controls";
import { Copy, Check } from "lucide-react";
import { formatScraperDiagnosticsJson } from "@/utils/scraper-diagnostics-json";

/**
 * Shows structured JSON from useScraperApi().errorDiagnostics when a scrape fails.
 */
export function ScraperHookErrorDetails({
  diagnostics,
}: {
  diagnostics: unknown;
}) {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const [copied, setCopied] = useState(false);
  const text = formatScraperDiagnosticsJson(diagnostics);

  const handleCopy = useCallback(async () => {
    if (!(await copyText(text))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  if (diagnostics == null) return null;
  return (
    <div className="mt-2 rounded-md border border-border bg-muted overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2 py-1 border-b border-border">
        <span className="type-meta text-muted-foreground">
          Diagnostics JSON
        </span>
        <Button
          type="button"
          variant="quiet"
          icon={copied ? <Check className="text-success" /> : <Copy />}
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre /* rich-content-exempt: debug or inspector output: logs, JSON, code or source view */ className="max-h-56 overflow-auto p-2 type-meta font-mono whitespace-pre-wrap text-foreground">
        {text}
      </pre>
    </div>
  );
}
