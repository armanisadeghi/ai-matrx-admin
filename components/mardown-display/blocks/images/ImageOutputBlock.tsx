"use client";
import React, { useState } from "react";
import { ImageIcon, Download, Link, Check, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ImageOutputBlockProps {
  url: string;
  mimeType?: string;
}

const ImageOutputBlock: React.FC<ImageOutputBlockProps> = ({ url, mimeType }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [hasError, setHasError] = useState(false);

  const ext = mimeType?.split("/")[1] ?? url.split(".").pop() ?? "png";

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `image-output.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silent
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2000);
    } catch {
      // silent
    }
  };

  return (
    <>
      <div className="rounded-lg border bg-card p-3 space-y-2 my-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-medium text-foreground">Image Output</span>
          {mimeType && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">{mimeType}</span>
          )}
        </div>

        {hasError ? (
          <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
            Failed to load image. <a href={url} target="_blank" rel="noopener noreferrer" className="underline">Open directly</a>
          </div>
        ) : (
          <div className="relative group rounded overflow-hidden bg-muted/30">
            <img
              src={url}
              alt="AI generated output"
              className="max-w-full h-auto max-h-96 object-contain rounded"
              onError={() => setHasError(true)}
            />
            <button
              onClick={() => setIsExpanded(true)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Expand"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleDownload} disabled={isDownloading}
            className="h-6 gap-1 px-2 text-xs text-primary hover:text-primary">
            <Download className="w-3 h-3" />
            {isDownloading ? "Downloading…" : "Download"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopyLink}
            className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground">
            {isLinkCopied ? <Check className="w-3 h-3" /> : <Link className="w-3 h-3" />}
            {isLinkCopied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={url} alt="AI generated output" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageOutputBlock;
