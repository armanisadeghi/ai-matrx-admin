"use client";

/**
 * File → Page setup: the ONE dialog frame every editor shares (Docs, Sheets, Slides). It owns the
 * title, the OK / Cancel row and the optional "Set as default"; each editor passes only its own
 * fields as children and decides how the values reach its file.
 */

import type { ReactNode } from "react";
import { Button } from "@ai-matrx/design-system/controls";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function PageSetupDialogShell({
  open,
  onOpenChange,
  title = "Page setup",
  onApply,
  onSetDefault,
  size = "md",
  dataAttr,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** OK pressed: the editor applies its current values; the shell closes the dialog. */
  onApply: () => void;
  /** Present → the footer offers "Set as default" (new files start with these values). */
  onSetDefault?: () => void;
  size?: "md" | "lg";
  /** Marks the content for tests (`data-page-setup`, `data-sheet-page-setup`, …). */
  dataAttr: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={size === "lg" ? "sm:max-w-xl" : "sm:max-w-md"} {...{ [dataAttr]: "" }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">{children}</div>
        <DialogFooter className="sm:justify-between">
          {onSetDefault ? (
            <Button variant="quiet" onClick={onSetDefault}>
              Set as default
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onApply();
                onOpenChange(false);
              }}
            >
              OK
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
