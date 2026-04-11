"use client";
import React, { useState } from "react";
import { Volume2, Download, Link, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AudioOutputBlockProps {
  /** URL to the audio file */
  url: string;
  /** MIME type, e.g. "audio/wav" */
  mimeType?: string;
}

const AudioOutputBlock: React.FC<AudioOutputBlockProps> = ({
  url,
  mimeType,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const ext = mimeType?.split("/")[1] ?? "wav";
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `audio-response.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silent — browser will handle gracefully
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
    <div className="rounded-lg border bg-card p-3 space-y-2 my-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Volume2 className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="font-medium text-foreground">Audio Response</span>
        {mimeType && (
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">
            {mimeType}
          </span>
        )}
      </div>
      <audio controls autoPlay src={url} className="w-full" />
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
          className="h-6 gap-1 px-2 text-xs text-primary hover:text-primary"
        >
          {isDownloading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          {isDownloading ? "Downloading…" : "Download audio"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyLink}
          className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="Copy audio link"
        >
          {isLinkCopied ? (
            <Check className="w-3 h-3" />
          ) : (
            <Link className="w-3 h-3" />
          )}
          {isLinkCopied ? "Copied!" : "Copy link"}
        </Button>
      </div>
    </div>
  );
};

export default AudioOutputBlock;
