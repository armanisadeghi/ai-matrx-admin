"use client";

/**
 * RetryConfirmDialog — confirms an atomic retry on a failed agent turn.
 *
 * Atomic retry semantics: discard the failed assistant message and any
 * partial tool calls underneath it, then resubmit the user message that
 * triggered the failure. The user watches the new response come in.
 *
 * The body lists what gets cleared (so the user knows their tool work is
 * being thrown away). For long-running multi-tool turns this can feel
 * heavy — that's why the Python team is building a "resume from last
 * good step" path; see PYTHON_RESUME_SPEC.md. Until that ships, atomic
 * retry is the only supported retry.
 *
 * Mobile: Drawer. Desktop: AlertDialog.
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
import { useAppSelector } from "@/lib/redux/hooks";
import { selectToolCallsForMessage } from "@/features/agents/redux/execution-system/observability/observability.selectors";

interface RetryConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The failed assistant message id — used to count what gets cleared. */
  failedMessageId: string;
  onConfirm: () => void;
}

export function RetryConfirmDialog({
  open,
  onOpenChange,
  failedMessageId,
  onConfirm,
}: RetryConfirmDialogProps) {
  const isMobile = useIsMobile();
  const cascadedToolCalls = useAppSelector(
    selectToolCallsForMessage(failedMessageId),
  );

  const title = "Retry this turn?";
  const description = (() => {
    if (cascadedToolCalls.length === 0) {
      return "The failed response will be removed and the same input will be resubmitted from scratch.";
    }
    const noun = cascadedToolCalls.length === 1 ? "tool call" : "tool calls";
    return `The failed response and ${cascadedToolCalls.length} partial ${noun} will be removed. The same input will be resubmitted from scratch.`;
  })();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="pb-safe">
            <Button
              onClick={() => {
                onOpenChange(false);
                onConfirm();
              }}
            >
              Retry from scratch
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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm()}>
            Retry from scratch
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
