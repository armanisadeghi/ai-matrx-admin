"use client";

/**
 * TerminalPlaceholder — the bottom half of the code column.
 *
 * A stub for the terminal surface. Will eventually be a real shell / tool-call
 * trace / stdout panel; for now it's just a visual placeholder so we can test
 * the nested vertical resize layout.
 */

import React from "react";
import { Terminal } from "lucide-react";

export function TerminalPlaceholder() {
  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-green-400 border-t border-border">
      <div className="shrink-0 px-3 py-1 border-b border-slate-800 flex items-center gap-1.5">
        <Terminal className="w-3 h-3" />
        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">
          Terminal
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-3 py-2 font-mono text-[11px] leading-tight">
        <p className="text-slate-500">$ {/* terminal placeholder */}</p>
      </div>
    </div>
  );
}
