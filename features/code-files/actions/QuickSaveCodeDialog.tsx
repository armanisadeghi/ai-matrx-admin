"use client";
// features/code-files/actions/QuickSaveCodeDialog.tsx
//
// Dialog/Drawer wrapper around QuickSaveCodeCore. Used by both the
// OverlayController (for openSaveToCode) and by direct in-component
// invocations.

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CodeFile } from "../redux/code-files.types";
import {
  QuickSaveCodeCore,
  type CodePostSaveAction,
} from "./QuickSaveCodeCore";

export interface QuickSaveCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  initialLanguage?: string;
  suggestedName?: string;
  defaultFolderId?: string | null;
  onSaved?: (file?: CodeFile, action?: CodePostSaveAction) => void;
}

export function QuickSaveCodeDialog({
  open,
  onOpenChange,
  initialContent,
  initialLanguage,
  suggestedName,
  defaultFolderId = null,
  onSaved,
}: QuickSaveCodeDialogProps) {
  const isMobile = useIsMobile();

  const handleSaved = (file: CodeFile, action: CodePostSaveAction) => {
    onSaved?.(file, action);
    onOpenChange(false);
  };

  const handleCancel = () => onOpenChange(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[92dvh] flex flex-col">
          <DrawerHeader className="px-3 pt-3 pb-2 shrink-0">
            <DrawerTitle className="text-sm">Quick Save Code</DrawerTitle>
            <DrawerDescription className="sr-only">
              Save this snippet to your code files, or append/overwrite an
              existing file.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 min-h-0 px-3 pb-3">
            <QuickSaveCodeCore
              initialContent={initialContent}
              initialLanguage={initialLanguage}
              suggestedName={suggestedName}
              defaultFolderId={defaultFolderId}
              onSaved={handleSaved}
              onCancel={handleCancel}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[min(85vh,780px)] p-3 flex flex-col gap-2">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-sm">Quick Save Code</DialogTitle>
          <DialogDescription className="sr-only">
            Save this snippet to your code files, or append/overwrite an
            existing file.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          <QuickSaveCodeCore
            initialContent={initialContent}
            initialLanguage={initialLanguage}
            suggestedName={suggestedName}
            defaultFolderId={defaultFolderId}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
