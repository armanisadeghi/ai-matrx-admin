// features/notes/actions/SaveSelectionButton.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Highlighter, Check } from "lucide-react";
import { NotesAPI } from "../service/notesApi";
import { useToastManager } from "@/hooks/useToastManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";

interface SaveSelectionButtonProps {
  /** The bucket tag the note is stamped with. */
  tag?: string;
  variant?: "primary" | "outline" | "quiet";
  /** Glyph only. Default true; pass a `label` and `iconOnly={false}` for a labelled button. */
  iconOnly?: boolean;
  label?: string;
  className?: string;
}

/**
 * Button to save currently selected text to notes
 * Automatically captures window.getSelection() when clicked
 */
export function SaveSelectionButton({
  tag = "Scratch",
  variant = "quiet",
  iconOnly = true,
  label,
  className,
}: SaveSelectionButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const toast = useToastManager("notes");
  const organizationId = useAppSelector(selectOrganizationId);

  const handleSave = async () => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selectedText) {
      toast.error("No text selected");
      return;
    }

    setIsSaving(true);
    try {
      const capturedOrganizationId = await ensureOrgId(organizationId);
      await NotesAPI.create({
        label: "New Note",
        content: selectedText,
        tags: [tag],
        organization_id: capturedOrganizationId,
      });

      setJustSaved(true);
      toast.success(`Saved selection to ${tag}!`);

      // Clear selection
      selection?.removeAllRanges();

      // Reset success indicator after 2 seconds
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error("Error saving selection:", error);
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {iconOnly || !label ? (
            <Button
              variant={variant}
              icon={justSaved ? <Check /> : <Highlighter />}
              glyphTone={justSaved ? "success" : undefined}
              onClick={handleSave}
              disabled={isSaving}
              className={className}
              aria-label={label || "Save selection"}
            />
          ) : (
            <Button
              variant={variant}
              icon={justSaved ? <Check /> : <Highlighter />}
              glyphTone={justSaved ? "success" : undefined}
              onClick={handleSave}
              disabled={isSaving}
              className={className}
            >
              {label}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {justSaved ? "Saved!" : `Save selection to ${tag}`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
