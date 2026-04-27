/**
 * features/files/components/surfaces/dropbox/TopBar.tsx
 *
 * Top app bar for the Dropbox shell. Holds the "+ New" button and a wide
 * search input. Intentionally minimal — the app's global header still
 * renders outside this surface, so we don't duplicate brand or user menu
 * here.
 */

"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewMenu } from "./NewMenu";

export interface TopBarProps {
  parentFolderId: string | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}

export function TopBar({
  parentFolderId,
  searchQuery,
  onSearchChange,
  className,
}: TopBarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-background px-4 py-2 pr-16 shrink-0",
        className,
      )}
    >
      <NewMenu parentFolderId={parentFolderId} />
      <label className="flex flex-1 items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search files and folders"
          aria-label="Search files and folders"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          style={{ fontSize: "16px" }}
        />
      </label>
    </div>
  );
}
