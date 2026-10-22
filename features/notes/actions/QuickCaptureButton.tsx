// features/notes/actions/QuickCaptureButton.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { openOverlay, mintInstanceId } from "@ai-matrx/summon/open";

interface QuickCaptureButtonProps {
  defaultContent?: string;
  bucketTag?: string;
  variant?: "primary" | "outline" | "quiet";
  /** Glyph only (the label becomes the accessible name). */
  iconOnly?: boolean;
  label?: string;
  className?: string;
}

/**
 * Opens the global Quick Save to Notes dialog (OverlayWorldHost).
 * Parent tree must include Redux + OverlayWorldHost (authenticated Providers or PublicProviders).
 */
export function QuickCaptureButton({
  defaultContent = "",
  bucketTag,
  variant = "primary",
  iconOnly = false,
  label = "Quick Note",
  className,
}: QuickCaptureButtonProps) {
  const dispatch = useAppDispatch();

  const handleClick = () => {
    dispatch(
      openOverlay({
        overlayId: "saveToNotes",
        instanceId: mintInstanceId("saveToNotes"),
        data: {
          initialContent: defaultContent,
          bucketTag,
          initialEditorMode: undefined,
        },
      }),
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {iconOnly || !label ? (
            <Button
              variant={variant}
              icon={<Plus />}
              aria-label={label || "Quick note"}
              onClick={handleClick}
              className={className}
            />
          ) : (
            <Button
              variant={variant}
              icon={<Plus />}
              onClick={handleClick}
              className={className}
            >
              {label}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>Create quick note</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
