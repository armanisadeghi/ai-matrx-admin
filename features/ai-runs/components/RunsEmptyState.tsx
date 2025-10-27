"use client";

import React from "react";
import { MessageSquare, Sparkles } from "lucide-react";

interface RunsEmptyStateProps {
  message?: string;
  submessage?: string;
}

export function RunsEmptyState({ 
  message = "No conversation history yet",
  submessage = "Start a conversation to see your runs here"
}: RunsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6 py-12">
      <div className="relative mb-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
          <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="absolute -top-1 -right-1 p-1 bg-blue-500 dark:bg-blue-600 rounded-full">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {message}
      </h3>
      
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
        {submessage}
      </p>
    </div>
  );
}

