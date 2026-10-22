// features/notes/actions/SaveToScratchButton.tsx
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Check } from "lucide-react";
import { NOTE_BUCKET_TAGS } from "../homes/bucketTags";
import { NotesAPI } from "../service/notesApi";
import { useToastManager } from "@/hooks/useToastManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";

interface SaveToScratchButtonProps {
  content: string;
  variant?: "primary" | "outline" | "quiet";
  /** Glyph only. Default true; pass a `label` and `iconOnly={false}` for a labelled button. */
  iconOnly?: boolean;
  label?: string;
  className?: string;
}

/**
 * One-click button to save content directly to Scratch (the Scratch tag)
 * Perfect for quick captures from anywhere in the app
 */
export function SaveToScratchButton({
  content,
  variant = "quiet",
  iconOnly = true,
  label,
  className,
}: SaveToScratchButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const toast = useToastManager("notes");
  const organizationId = useAppSelector(selectOrganizationId);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error("No content to save");
      return;
    }

    setIsSaving(true);
    try {
      const capturedOrganizationId = await ensureOrgId(organizationId);
      await NotesAPI.create({
        label: "New Note",
        content: content.trim(),
        tags: [NOTE_BUCKET_TAGS.quickSaves],
        organization_id: capturedOrganizationId,
      });

      setJustSaved(true);
      toast.success("Saved to Scratch!");

      // Reset success indicator after 2 seconds
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error("Error saving to scratch:", error);
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
              icon={justSaved ? <Check /> : <FileText />}
              glyphTone={justSaved ? "success" : undefined}
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className={className}
              aria-label={label || "Save to Scratch"}
            />
          ) : (
            <Button
              variant={variant}
              icon={justSaved ? <Check /> : <FileText />}
              glyphTone={justSaved ? "success" : undefined}
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className={className}
            >
              {label}
            </Button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {justSaved ? "Saved!" : "Save to Scratch"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
