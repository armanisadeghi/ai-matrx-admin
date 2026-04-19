"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Copy, ChevronDown, Loader2 } from "lucide-react";

interface CopyDropdownButtonLazyProps {
  content: string;
  onCopySuccess?: () => void;
  onShowHtmlPreview?: (html: string) => void;
  className?: string;
}

const CopyDropdownButtonImpl = dynamic(
  () => import("./CopyDropdownButton").then((m) => m.CopyDropdownButton),
  { ssr: false },
);

export function CopyDropdownButton({
  content,
  onCopySuccess,
  onShowHtmlPreview,
  className = "",
}: CopyDropdownButtonLazyProps) {
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (activated) {
    return (
      <CopyDropdownButtonImpl
        content={content}
        onCopySuccess={onCopySuccess}
        onShowHtmlPreview={onShowHtmlPreview}
        className={className}
      />
    );
  }

  const handleActivate = () => {
    if (!content) return;
    setLoading(true);
    import("./CopyDropdownButton").then(() => {
      setActivated(true);
      setLoading(false);
      // Re-dispatch the click so the real dropdown opens immediately
      requestAnimationFrame(() => {
        const btn = wrapperRef.current?.querySelector(
          "button",
        ) as HTMLButtonElement | null;
        btn?.click();
      });
    });
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleActivate}
        disabled={!content || loading}
        className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Copy"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>
    </div>
  );
}
