"use client";

/**
 * SmartAgentResourceChips
 *
 * Renders chips for all attached resources on an execution instance.
 * Reads from instanceResources, dispatches removeResource directly.
 * No prop callbacks needed — conversationId is the only prop.
 */

import { useCallback, createElement } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  StickyNote,
  CheckSquare,
  Table2,
  Globe,
  File,
  FileText,
  Image,
  Mic,
  Video,
  Youtube,
  FolderKanban,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectInstanceResources } from "@/features/agents/redux/execution-system/instance-resources/instance-resources.selectors";
import { removeResource } from "@/features/agents/redux/execution-system/instance-resources/instance-resources.slice";
import type {
  ManagedResource,
  ResourceBlockType,
} from "@/features/agents/types";

function getBlockTypeDisplay(blockType: ResourceBlockType) {
  const map: Record<
    ResourceBlockType,
    {
      icon: React.ElementType;
      color: string;
      bg: string;
      label: string;
    }
  > = {
    text: {
      icon: FileText,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-800",
      label: "Text",
    },
    image: {
      icon: Image,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-950/30",
      label: "Image",
    },
    audio: {
      icon: Mic,
      color: "text-pink-600 dark:text-pink-400",
      bg: "bg-pink-100 dark:bg-pink-950/30",
      label: "Audio",
    },
    video: {
      icon: Video,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-100 dark:bg-indigo-950/30",
      label: "Video",
    },
    youtube_video: {
      icon: Youtube,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-950/30",
      label: "YouTube",
    },
    document: {
      icon: File,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-100 dark:bg-purple-950/30",
      label: "File",
    },
    input_webpage: {
      icon: Globe,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-100 dark:bg-teal-950/30",
      label: "Webpage",
    },
    input_notes: {
      icon: StickyNote,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-100 dark:bg-orange-950/30",
      label: "Note",
    },
    input_task: {
      icon: CheckSquare,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-950/30",
      label: "Task",
    },
    input_table: {
      icon: Table2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-950/30",
      label: "Table",
    },
    input_list: {
      icon: FolderKanban,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-100 dark:bg-violet-950/30",
      label: "List",
    },
    input_data: {
      icon: FileText,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-800",
      label: "Data",
    },
  };
  return map[blockType] ?? map.text;
}

function getResourceLabel(resource: ManagedResource): string {
  // preview is set by SmartAgentResourcePickerButton as the display label string
  if (typeof resource.preview === "string" && resource.preview) {
    return resource.preview;
  }
  // Fallback: derive from source
  const src = resource.source as Record<string, unknown> | null;
  if (src) {
    const candidate =
      (src.label as string) ??
      (src.title as string) ??
      (src.name as string) ??
      (src.filename as string) ??
      (src.url as string);
    if (candidate) return String(candidate).slice(0, 30);
  }
  return getBlockTypeDisplay(resource.blockType).label;
}

function truncate(s: string, max = 20) {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

interface ResourceChipProps {
  resource: ManagedResource;
  onRemove: () => void;
}

function ResourceChip({ resource, onRemove }: ResourceChipProps) {
  const display = getBlockTypeDisplay(resource.blockType);
  const Icon = display.icon;
  const label = truncate(getResourceLabel(resource));
  const isPending =
    resource.status === "pending" || resource.status === "resolving";
  const isError = resource.status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${display.bg} ${isError ? "ring-1 ring-destructive/50" : ""}`}
    >
      {isPending ? (
        <Loader2 className={`w-3 h-3 ${display.color} animate-spin`} />
      ) : isError ? (
        <AlertCircle className="w-3 h-3 text-destructive" />
      ) : (
        createElement(Icon, { className: `w-3 h-3 ${display.color}` })
      )}
      <span className="text-foreground select-none">{label}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X className="w-2.5 h-2.5 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

interface SmartAgentResourceChipsProps {
  conversationId: string;
}

export function SmartAgentResourceChips({
  conversationId,
}: SmartAgentResourceChipsProps) {
  const dispatch = useAppDispatch();
  const resources = useAppSelector(selectInstanceResources(conversationId));

  const handleRemove = useCallback(
    (resourceId: string) => {
      dispatch(removeResource({ conversationId, resourceId }));
    },
    [conversationId, dispatch],
  );

  if (resources.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-2 py-1 border-b border-border">
      <AnimatePresence mode="popLayout">
        {resources.map((resource) => (
          <ResourceChip
            key={resource.resourceId}
            resource={resource}
            onRemove={() => handleRemove(resource.resourceId)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
