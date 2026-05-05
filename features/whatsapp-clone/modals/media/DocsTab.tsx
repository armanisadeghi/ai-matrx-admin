"use client";

import { Download, FileText, MoreHorizontal } from "lucide-react";
import { WAAvatar } from "../../shared/WAAvatar";
import { formatFileSize, formatLinkTime } from "../../shared/relative-time";
import type { WADocItem } from "../../types";

interface DocsTabProps {
  items: WADocItem[];
}

function extOf(name: string): string {
  const m = name.match(/\.([^.]+)$/);
  return (m?.[1] ?? "doc").toUpperCase();
}

export function DocsTab({ items }: DocsTabProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[14px] text-muted-foreground">
        No documents shared yet.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li
          key={item.id}
          className="grid grid-cols-[minmax(0,1fr)_240px_220px_56px] items-center gap-3 px-5 py-3 hover:bg-accent/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-9 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="absolute -right-1 bottom-0 rounded bg-card px-1 text-[9px] tracking-wide text-muted-foreground">
                {extOf(item.fileName)}
              </span>
            </div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-foreground">
                {item.fileName}
              </div>
              <div className="truncate text-[12.5px] text-muted-foreground">
                {formatFileSize(item.fileSize)}
              </div>
            </div>
          </div>
          <div className="line-clamp-2 text-[13px] text-muted-foreground">
            {item.message ?? "—"}
          </div>
          <div className="flex items-center gap-2">
            <WAAvatar
              name={item.senderName}
              src={item.senderAvatarUrl}
              size="sm"
            />
            <div className="min-w-0">
              <div className="truncate text-[13px] text-foreground">
                {item.senderName}
              </div>
              <div className="truncate text-[12px] text-muted-foreground">
                {formatLinkTime(item.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              aria-label="Download"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="More"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
