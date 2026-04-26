"use client";

/**
 * EditResubmitOutcomeDialog — fork-vs-overwrite choice after the user
 * edits a previous user message and saves.
 *
 * Two destinations after the choice:
 *   • "Create a fork" — runs the original branch-then-edit flow, then
 *     auto-fires `executeInstance` on the fork. Surface registry handles
 *     navigation. The original conversation is untouched.
 *   • "Overwrite this turn" — runs `overwriteAndResend` on the same
 *     conversation. The edit replaces the message in place; everything
 *     after it is soft-deleted; a fresh agent turn fires.
 *
 * Both paths auto-submit so the user "watches the new response come in"
 * with no extra click.
 *
 * Mobile: Drawer (bottom sheet). Desktop: AlertDialog.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface EditResubmitOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChooseFork: () => void;
  onChooseOverwrite: () => void;
}

const TITLE = "How should we apply this edit?";
const DESCRIPTION =
  "Forking keeps the original conversation intact. Overwriting replaces this turn and discards every reply that came after.";

export function EditResubmitOutcomeDialog({
  open,
  onOpenChange,
  onChooseFork,
  onChooseOverwrite,
}: EditResubmitOutcomeDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{TITLE}</DrawerTitle>
            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pb-safe">
            <Button
              onClick={() => {
                onOpenChange(false);
                onChooseFork();
              }}
            >
              Create a fork
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
                onChooseOverwrite();
              }}
            >
              Overwrite this turn
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{DESCRIPTION}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              onChooseOverwrite();
            }}
          >
            Overwrite this turn
          </Button>
          <AlertDialogAction
            onClick={() => {
              onChooseFork();
            }}
          >
            Create a fork
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
