"use client";

import React, { useState, useCallback } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResourcePickerMenu } from "../resource-picker/ResourcePickerMenu";
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { selectAttachmentCapabilities } from '@/lib/redux/prompt-execution/selectors';
import { addValidatedResource } from '@/lib/redux/prompt-execution/thunks/resourceThunks';
import type { Resource } from '../../types/resources';

interface SmartResourcePickerButtonProps {
  /**
   * The runId of the execution instance
   * Required to dispatch resources to Redux
   */
  runId: string;

  /**
   * Upload configuration
   */
  uploadBucket?: string;
  uploadPath?: string;
}

/**
 * SmartResourcePickerButton - Redux-driven resource picker
 * 
 * Automatically:
 * - Gets attachment capabilities from Redux
 * - Dispatches selected resources to Redux
 * - No callbacks needed - fully self-contained
 */
export function SmartResourcePickerButton({
  runId,
  uploadBucket = "userContent",
  uploadPath = "prompt-attachments",
}: SmartResourcePickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();

  // Get attachment capabilities from Redux
  const attachmentCapabilities = useAppSelector(state => 
    selectAttachmentCapabilities(state, runId)
  );

  // Handle resource selection - dispatch directly to Redux
  const handleResourceSelected = useCallback(async (resource: Resource) => {
    try {
      await dispatch(addValidatedResource({
        runId,
        resource,
      })).unwrap();
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add resource:', error);
      // Could show a toast here if desired
    }
  }, [runId, dispatch]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" 
          tabIndex={-1}
          title="Add resource"
        >
          <Database className="w-3.5 h-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 border-gray-300 dark:border-gray-700" 
        align="start" 
        side="top"
        sideOffset={8}
      >
        <ResourcePickerMenu 
          onResourceSelected={handleResourceSelected}
          onClose={() => setIsOpen(false)}
          attachmentCapabilities={attachmentCapabilities}
        />
      </PopoverContent>
    </Popover>
  );
}

