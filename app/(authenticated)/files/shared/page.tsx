"use client";

import React from "react";
import { Share2, Construction } from "lucide-react";

export default function SharedFilesPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
      <Construction className="h-10 w-10 opacity-30" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">Coming Soon</p>
        <p className="text-xs max-w-xs">
          Files shared with you or by you will appear here.
        </p>
      </div>
    </div>
  );
}
