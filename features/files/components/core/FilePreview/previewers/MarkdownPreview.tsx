/**
 * features/files/components/core/FilePreview/previewers/MarkdownPreview.tsx
 *
 * Renders Markdown / MDX files as formatted prose with GFM tables, math via
 * KaTeX, and Prism syntax-highlighted code blocks. Restored from the legacy
 * `components/FileManager/FilePreview/MarkdownPreview.tsx`, ported to the new
 * preview pipeline (signed-URL fetch, semantic Tailwind tokens).
 *
 * Errors surface inline with the same Card layout used by the other
 * previewers so the UX is consistent: alert icon + honest message + an
 * "Open in new tab" fallback that uses the still-valid signed URL.
 */

"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrism from "rehype-prism-plus";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/utils/errors";
import { toPreviewProxyUrl } from "@/features/files/utils/preview-url";

export interface MarkdownPreviewProps {
  url: string | null;
  /** Cap fetched bytes — 1MB is plenty for any reasonable readme. */
  maxBytes?: number;
  className?: string;
}

export function MarkdownPreview({
  url,
  maxBytes = 1024 * 1024,
  className,
}: MarkdownPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setError(null);
    setContent(null);
    setTruncated(false);

    fetch(toPreviewProxyUrl(url) ?? url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const blob = await res.blob();
        if (cancelled) return;
        if (blob.size > maxBytes) {
          setTruncated(true);
          setContent(await blob.slice(0, maxBytes).text());
        } else {
          setContent(await blob.text());
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(extractErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [url, maxBytes]);

  if (error) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center",
          className,
        )}
        role="alert"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Couldn't load this Markdown</h3>
          <p className="max-w-md text-xs text-muted-foreground break-words">
            {error}
          </p>
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
        ) : null}
      </div>
    );
  }

  if (content == null) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center gap-2",
          className,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full w-full flex-col bg-card", className)}>
      {truncated ? (
        <div className="border-b border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground shrink-0">
          Preview limited to first {(maxBytes / 1024 / 1024).toFixed(0)}MB.
        </div>
      ) : null}
      <div className="flex-1 overflow-auto px-6 py-5">
        <article className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypePrism]}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}

export default MarkdownPreview;
