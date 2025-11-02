"use client";
import React from "react";
import { Edit2, MessageSquare, Eye, Trash2, Copy } from "lucide-react";
import { PromptsData } from "../../../features/prompts/hooks/usePrompts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CompactPromptsListProps {
  prompts: PromptsData[];
  onEditPrompt: (prompt: PromptsData) => void;
  onCreateNew?: () => void;
  onViewPrompt?: (prompt: PromptsData) => void;
  onDeletePrompt?: (prompt: PromptsData) => void;
  onDuplicatePrompt?: (prompt: PromptsData) => void;
}

export default function CompactPromptsList({ 
  prompts, 
  onEditPrompt, 
  onCreateNew,
  onViewPrompt,
  onDeletePrompt,
  onDuplicatePrompt
}: CompactPromptsListProps) {
  if (prompts.length === 0) {
    return (
      <Card className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700">
        <CardContent className="p-6 text-center">
          <MessageSquare className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-3">No prompts created yet</p>
          {onCreateNew && (
            <Button onClick={onCreateNew} size="sm">
              Create Your First Prompt
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => {
        const messageCount = prompt.messages?.length || 0;
        const variableCount = prompt.variableDefaults ? Object.keys(prompt.variableDefaults).length : 0;
        const hasContent = prompt.messages?.some(msg => msg.content.trim());
        
        return (
          <Card 
            key={prompt.id}
            className="bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 group cursor-pointer"
            onClick={() => onEditPrompt(prompt)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                      {prompt.name || "Untitled Prompt"}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                      {messageCount > 0 && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
                          <MessageSquare className="w-3 h-3" />
                          {messageCount}
                        </span>
                      )}
                      {variableCount > 0 && (
                        <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full font-mono">
                          {variableCount} vars
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-3">
                    {!hasContent && (
                      <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full text-xs">
                        Empty
                      </span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onViewPrompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                        onClick={(e) => handleActionClick(e, () => onViewPrompt(prompt))}
                        title="View prompt"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                      onClick={(e) => handleActionClick(e, () => onEditPrompt(prompt))}
                      title="Edit prompt"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    {onDuplicatePrompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                        onClick={(e) => handleActionClick(e, () => onDuplicatePrompt(prompt))}
                        title="Duplicate prompt"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                    {onDeletePrompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                        onClick={(e) => handleActionClick(e, () => onDeletePrompt(prompt))}
                        title="Delete prompt"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}