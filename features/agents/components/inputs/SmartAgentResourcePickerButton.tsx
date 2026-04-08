"use client";

/**
 * SmartAgentResourcePickerButton
 *
 * Fully self-contained resource picker for agent execution instances.
 * Reads attachment capabilities from instanceModelOverrides and dispatches
 * selected resources directly to instanceResources — no prop drilling.
 *
 * Prop: instanceId only.
 */

import { useState, useCallback } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDialogContainer } from "@/components/ui/dialog";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  addResource,
  setResourcePreview,
} from "@/features/agents/redux/execution-system/instance-resources/instance-resources.slice";
import { ResourcePickerMenu } from "@/features/resource-manager/resource-picker/ResourcePickerMenu";
import { ResourcePickerWindow } from "@/features/window-panels/windows/ResourcePickerWindow";
import type { Resource } from "@/features/prompts/types/resources";
import type { ResourceBlockType } from "@/features/agents/types";

// Map prompt-system resource types to agent ResourceBlockType
function resourceTypeToBlockType(type: Resource["type"]): ResourceBlockType {
  const map: Record<string, ResourceBlockType> = {
    note: "input_notes",
    task: "input_task",
    project: "input_notes",
    file: "document",
    table: "input_table",
    webpage: "input_webpage",
    youtube: "youtube_video",
    image_url: "image",
    file_url: "document",
    audio: "audio",
  };
  return map[type] ?? "text";
}

// Extract the display label from a Resource
function resourceLabel(resource: Resource): string {
  switch (resource.type) {
    case "note":
      return resource.data.label ?? "Note";
    case "task":
      return resource.data.title ?? "Task";
    case "project":
      return resource.data.name ?? "Project";
    case "file":
      return resource.data.details?.filename ?? "File";
    case "table":
      return resource.data.table_name ?? "Table";
    case "webpage":
      return resource.data.title ?? resource.data.url ?? "Webpage";
    case "youtube":
      return resource.data.title ?? "YouTube";
    case "image_url":
      return resource.data.url ?? "Image";
    case "file_url":
      return resource.data.filename ?? "File";
    case "audio":
      return resource.data.filename ?? "Audio";
    default:
      return "Resource";
  }
}

interface SmartAgentResourcePickerButtonProps {
  instanceId: string;
  uploadBucket?: string;
  uploadPath?: string;
  /** When true, opens as a floating WindowPanel instead of a popover. Default: false. */
  useWindowMode?: boolean;
}

export function SmartAgentResourcePickerButton({
  instanceId,
  uploadBucket = "userContent",
  uploadPath = "agent-attachments",
  useWindowMode = false,
}: SmartAgentResourcePickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const dialogContainer = useDialogContainer();

  const handleResourceSelected = useCallback(
    (resource: Resource) => {
      const blockType = resourceTypeToBlockType(resource.type);
      const label = resourceLabel(resource);
      const resourceId = `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      dispatch(
        addResource({
          instanceId,
          blockType,
          source: resource.data,
          resourceId,
        }),
      );

      // Immediately mark as ready with a preview string for the chip label
      dispatch(
        setResourcePreview({
          instanceId,
          resourceId,
          preview: label,
        }),
      );

      setIsOpen(false);
    },
    [instanceId, dispatch],
  );

  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
      tabIndex={-1}
      title="Attach resource"
      onClick={useWindowMode ? () => setIsOpen(true) : undefined}
    >
      <Paperclip className="w-3.5 h-3.5" />
    </Button>
  );

  if (useWindowMode) {
    return (
      <>
        {trigger}
        <ResourcePickerWindow
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onResourceSelected={handleResourceSelected}
          attachmentCapabilities={undefined}
          position="center"
        />
      </>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={false}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 border-border"
        align="start"
        side="top"
        sideOffset={8}
        container={dialogContainer ?? undefined}
      >
        <ResourcePickerMenu
          onResourceSelected={handleResourceSelected}
          onClose={() => setIsOpen(false)}
          attachmentCapabilities={undefined}
        />
      </PopoverContent>
    </Popover>
  );
}
