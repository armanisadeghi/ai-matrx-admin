"use client";

import { ChevronDown, ListFilter, Search } from "lucide-react";
import { cn } from "@/styles/themes/utils";

interface GalleryToolbarProps {
  className?: string;
}

export function GalleryToolbar({ className }: GalleryToolbarProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label="Filter"
        className="flex h-8 w-8 items-center justify-center rounded-md text-[#aebac1] hover:bg-[#2a3942] hover:text-white"
      >
        <ListFilter className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Sort"
        className="flex h-8 items-center gap-0.5 rounded-md px-1.5 text-[#aebac1] hover:bg-[#2a3942] hover:text-white"
      >
        <ListFilter className="h-4 w-4" />
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Search media"
        className="flex h-8 w-8 items-center justify-center rounded-md text-[#aebac1] hover:bg-[#2a3942] hover:text-white"
      >
        <Search className="h-4 w-4" />
      </button>
    </div>
  );
}
