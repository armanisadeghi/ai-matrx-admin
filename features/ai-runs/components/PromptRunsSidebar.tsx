"use client";

import React, { useState } from "react";
import { History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RunsList } from "./RunsList";
import { aiRunsService } from "../services/ai-runs-service";
import { cn } from "@/lib/utils";

interface PromptRunsSidebarProps {
  promptId: string;
  promptName: string;
  currentRunId?: string;
  onRunSelect?: (runId: string) => void;
}

type ViewMode = 'current-prompt' | 'all-prompts';

export function PromptRunsSidebar({
  promptId,
  promptName,
  currentRunId,
  onRunSelect,
}: PromptRunsSidebarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('current-prompt');

  const filters = viewMode === 'current-prompt'
    ? { source_type: 'prompt' as const, source_id: promptId, limit: 20 }
    : { source_type: 'prompt' as const, limit: 50 };

  const handleRunStar = async (runId: string) => {
    try {
      await aiRunsService.toggleStar(runId);
      // The list will auto-refresh via the hook
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-gray-800">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 px-2.5 py-2">
        <div className="flex items-center gap-1.5 mb-2">
          <History className="w-4 h-4 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            Runs
          </h2>
        </div>

        {/* View mode selector - compact */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs h-7 px-2"
            >
              <span className="truncate">
                {viewMode === 'current-prompt' ? 'This Prompt' : 'All Prompts'}
              </span>
              <ChevronDown className="w-3 h-3 ml-1 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuItem onClick={() => setViewMode('current-prompt')}>
              <div className="flex flex-col">
                <span className="font-medium text-xs">This Prompt</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {promptName}
                </span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setViewMode('all-prompts')}>
              <div className="flex flex-col">
                <span className="font-medium text-xs">All Prompts</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  View all your runs
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Runs list */}
      <div className="flex-1 overflow-hidden">
        <RunsList
          filters={filters}
          activeRunId={currentRunId}
          onRunClick={onRunSelect}
          onRunStar={handleRunStar}
          compact
          emptyMessage={
            viewMode === 'current-prompt' 
              ? "No runs yet" 
              : "No runs"
          }
          emptySubmessage={
            viewMode === 'current-prompt'
              ? "Start a conversation"
              : "Run a prompt to see history"
          }
        />
      </div>
    </div>
  );
}

