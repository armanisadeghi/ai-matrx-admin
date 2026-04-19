"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { MoreVertical, Loader2 } from "lucide-react";

interface ContentManagerMenuLazyProps {
  content: string;
  onShowHtmlPreview?: (html: string, title?: string) => void;
  className?: string;
}

const ContentManagerMenuImpl = dynamic(
  () => import("./ContentManagerMenu").then((m) => m.ContentManagerMenu),
  { ssr: false },
);

export function ContentManagerMenu({
  content,
  onShowHtmlPreview,
  className = "",
}: ContentManagerMenuLazyProps) {
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  if (activated) {
    return (
      <ContentManagerMenuImpl
        content={content}
        onShowHtmlPreview={onShowHtmlPreview}
        className={className}
      />
    );
  }

  const handleActivate = () => {
    setLoading(true);
    import("./ContentManagerMenu").then(() => {
      setActivated(true);
      setLoading(false);
      // Re-dispatch the click so the real menu opens immediately
      requestAnimationFrame(() => {
        const btn = wrapperRef.current?.querySelector(
          "button",
        ) as HTMLButtonElement | null;
        btn?.click();
      });
    });
  };

  return (
    <span ref={wrapperRef}>
      <button
        type="button"
        onClick={handleActivate}
        disabled={loading}
        className={`flex items-center justify-center p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors ${className}`}
        title="Content options"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
        ) : (
          <MoreVertical className="h-3.5 w-3.5" />
        )}
      </button>
    </span>
  );
}
