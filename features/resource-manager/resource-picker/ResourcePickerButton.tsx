"use client";

import React, { useState } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ResourcePickerMenu } from "./ResourcePickerMenu";
import { ResourcePickerWindow } from "@/features/window-panels/windows/ResourcePickerWindow";
import type { WindowPosition } from "@/features/window-panels/hooks/useWindowPanel";

interface ResourcePickerButtonProps {
  onResourceSelected?: (resource: any) => void;
  attachmentCapabilities?: {
    supportsImageUrls?: boolean;
    supportsFileUrls?: boolean;
    supportsYoutubeVideos?: boolean;
    supportsAudio?: boolean;
  };
  /** When true, opens as a floating WindowPanel instead of a popover. Default: false. */
  useWindowMode?: boolean;
  windowPosition?: WindowPosition;
}

export function ResourcePickerButton({
  onResourceSelected,
  attachmentCapabilities,
  useWindowMode = false,
  windowPosition = "center",
}: ResourcePickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      tabIndex={-1}
      title="Add resource"
      onClick={useWindowMode ? () => setIsOpen(true) : undefined}
    >
      <Database className="w-3.5 h-3.5" />
    </Button>
  );

  if (useWindowMode) {
    return (
      <>
        {trigger}
        <ResourcePickerWindow
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onResourceSelected={(resource) => {
            onResourceSelected?.(resource);
            setIsOpen(false);
          }}
          attachmentCapabilities={attachmentCapabilities}
          position={windowPosition}
        />
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 border-gray-300 dark:border-gray-700 z-[200]"
        align="start"
        side="top"
        sideOffset={8}
      >
        <ResourcePickerMenu
          onResourceSelected={(resource) => {
            onResourceSelected?.(resource);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
          attachmentCapabilities={attachmentCapabilities}
        />
      </PopoverContent>
    </Popover>
  );
}
