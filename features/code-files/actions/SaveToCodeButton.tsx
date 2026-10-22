"use client";
// features/code-files/actions/SaveToCodeButton.tsx
//
// A small icon/text button that opens the Save-to-Code dialog via the global
// overlay system. Drop this anywhere a snippet of code exists and you want
// a one-click save entry point (CodeBlock header, chat message actions, etc.).

import React from "react";
import { FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay } from "@ai-matrx/summon/open";

export interface SaveToCodeButtonProps {
  content: string;
  language?: string;
  suggestedName?: string;
  defaultFolderId?: string | null;
  className?: string;
  variant?: "primary" | "outline" | "quiet";
  label?: string;
  iconOnly?: boolean;
  tooltip?: string;
}

export function SaveToCodeButton({
  content,
  language,
  suggestedName,
  defaultFolderId = null,
  className,
  variant = "quiet",
  label = "Save to Code",
  iconOnly = false,
  tooltip = "Save to your code files",
}: SaveToCodeButtonProps) {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    if (!content?.trim()) return;
    dispatch(
      openOverlay({
        overlayId: "saveToCode",
        data: {
          initialContent: content,
          initialLanguage: language ?? "plaintext",
          suggestedName,
          defaultFolderId: defaultFolderId ?? null,
        },
      }),
    );
  };

  const button = iconOnly ? (
    <Button
      type="button"
      variant={variant}
      icon={<FileCode />}
      onClick={handleClick}
      disabled={!content?.trim()}
      className={className}
      aria-label={tooltip || label}
    />
  ) : (
    <Button
      type="button"
      variant={variant}
      icon={<FileCode />}
      onClick={handleClick}
      disabled={!content?.trim()}
      className={className}
    >
      {label}
    </Button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
