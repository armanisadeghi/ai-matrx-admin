"use client";

import LocalFileAccess from "@/features/administration/file-explorer/LocalFileAccess";

export default function FileExplorerPage() {
  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col overflow-hidden">
      <LocalFileAccess />
    </div>
  );
}
