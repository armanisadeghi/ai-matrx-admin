"use client";

import { Search, X } from "lucide-react";

interface ConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ConversationSearch({
  value,
  onChange,
}: ConversationSearchProps) {
  return (
    <div className="px-3 pb-2 pt-1">
      <div className="relative flex h-9 items-center rounded-lg bg-[#202c33]">
        <Search
          className="ml-3.5 h-4 w-4 text-[#8696a0]"
          strokeWidth={2}
          aria-hidden
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search"
          aria-label="Search conversations"
          className="flex-1 bg-transparent px-3 text-[15px] text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="mr-2 flex h-6 w-6 items-center justify-center rounded-full text-[#8696a0] hover:bg-[#2a3942]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
