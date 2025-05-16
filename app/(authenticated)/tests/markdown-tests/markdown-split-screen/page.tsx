"use client";

import dynamic from "next/dynamic";

// Dynamically import the MarkdownEditor to handle any SSR issues
const MarkdownEditor = dynamic(
  () => import("@/components/mardown-display/markdown-classification/MarkdownEditor"),
  { ssr: false }
);

export default function MarkdownSplitScreenPage() {
  return (
    <div className="w-full h-full overflow-auto">
      <MarkdownEditor />
    </div>
  );
}
