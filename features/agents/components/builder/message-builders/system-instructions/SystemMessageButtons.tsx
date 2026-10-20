import { Maximize2, Copy, Check, Eraser, FileText, Webhook, EllipsisVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { copyContent } from "@ai-matrx/rich-content/copy/copy-commands";

// View-mode toggle has moved out of this button row and into the
// MessageViewModeMenu rendered next to the "System" role label. This file
// only owns the action icons that genuinely belong in the toolbar.

import {
  ResponsiveIconButtonGroup,
  IconButtonConfig,
} from "@/components/official/ResponsiveIconButtonGroup";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TemplateSelector } from "@/features/message-templates/components/TemplateSelector";
import { MicrophoneIconButton } from "@/features/audio/components/MicrophoneIconButton";

interface SystemMessageButtonsProps {
  hasFullScreenEditor?: boolean;
  /** Current system text — browse/save templates. */
  templateCurrentContent?: string;
  onTemplateContentSelected?: (content: string) => void;
  onSaveTemplate?: (label: string, content: string, tags: string[]) => void;
  onOptimize?: () => void;
  onOpenFullScreenEditor?: () => void;
  onClear?: () => void;
  onVoiceTranscription?: (text: string) => void;
}

export function SystemMessageButtons({
  hasFullScreenEditor = false,
  templateCurrentContent = "",
  onTemplateContentSelected,
  onSaveTemplate,
  onOptimize,
  onOpenFullScreenEditor,
  onClear,
  onVoiceTranscription,
}: SystemMessageButtonsProps) {
  // Copy confirms on the button itself (check for 1.5 s) — never a toast.
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);
  const flashCopied = () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    setCopied(true);
    copiedTimer.current = setTimeout(() => setCopied(false), 1500);
  };
  const buttons: IconButtonConfig[] = [
    {
      id: "copy",
      icon: copied ? Check : Copy,
      tooltip: copied ? "Copied" : "Copy message",
      mobileLabel: "Copy Message",
      onClick: async (e) => {
        e?.stopPropagation();
        if (!templateCurrentContent) {
          toast.error("Nothing to copy");
          return;
        }
        await copyContent(templateCurrentContent, {
          formatJson: false,
          onSuccess: flashCopied,
          onError: () => toast.error("Failed to copy"),
        });
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "template",
      icon: FileText,
      tooltip: "Templates",
      mobileLabel: "Templates",
      render: () => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <TemplateSelector
                role="system"
                currentContent={templateCurrentContent}
                onTemplateSelected={(content) =>
                  onTemplateContentSelected?.(content)
                }
                onSaveTemplate={onSaveTemplate ?? (() => {})}
                messageIndex={-1}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="z-[9999]">
            Templates
          </TooltipContent>
        </Tooltip>
      ),
    },
    {
      id: "optimize",
      icon: Webhook,
      tooltip: "Optimize with AI",
      mobileLabel: "Optimize with AI",
      onClick: (e) => {
        e?.stopPropagation();
        onOptimize?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
      iconClassName: "text-purple-400",
      className: "hover:text-purple-300",
    },
    {
      id: "fullscreen",
      icon: Maximize2,
      tooltip: "Open in full screen editor",
      mobileLabel: "Full Screen Editor",
      hidden: !hasFullScreenEditor,
      onClick: (e) => {
        e?.stopPropagation();
        onOpenFullScreenEditor?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "clear",
      icon: Eraser,
      tooltip: "Clear message",
      mobileLabel: "Clear Message",
      onClick: (e) => {
        e?.stopPropagation();
        onClear?.();
      },
      onMouseDown: (e) => {
        e.preventDefault();
        e.stopPropagation();
      },
    },
    {
      id: "voice",
      icon: undefined,
      tooltip: "Add text from voice",
      mobileLabel: "Add text from voice",
      hidden: !onVoiceTranscription,
      render: onVoiceTranscription
        ? () => (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <MicrophoneIconButton
                    variant="control"
                    onTranscriptionComplete={onVoiceTranscription}
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="z-[9999]">
                Record voice
              </TooltipContent>
            </Tooltip>
          )
        : undefined,
    },
  ];

  return (
    <ResponsiveIconButtonGroup
      buttons={buttons}
      sheetTitle="System Message Actions"
      mobileMoreIcon={EllipsisVertical}
      size="sm"
    />
  );
}
