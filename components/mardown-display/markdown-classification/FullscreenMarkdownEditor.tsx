"use client";

import { useState } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { Button } from "@/components/ui";
import { Maximize2, X } from "lucide-react";

interface FullscreenMarkdownEditorProps {
  triggerClassName?: string;
  triggerLabel?: string;
  initialMarkdown?: string;
  showSampleSelector?: boolean;
  showConfigSelector?: boolean;
}

const FullscreenMarkdownEditor = ({ 
  triggerClassName,
  triggerLabel = "Markdown Editor",
  initialMarkdown,
  showSampleSelector = true,
  showConfigSelector = true,
}: FullscreenMarkdownEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const openEditor = () => setIsOpen(true);
  const closeEditor = () => setIsOpen(false);

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={openEditor} 
        className={triggerClassName}
        aria-label={`Open ${triggerLabel}`}
      >
        <Maximize2 className="h-4 w-4 mr-2" />
        {triggerLabel}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[95vw] h-[95vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{triggerLabel}</h2>
              <Button
                variant="ghost" 
                size="sm" 
                onClick={closeEditor}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <MarkdownEditor 
                initialMarkdown={initialMarkdown}
                showSampleSelector={showSampleSelector}
                showConfigSelector={showConfigSelector}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FullscreenMarkdownEditor; 