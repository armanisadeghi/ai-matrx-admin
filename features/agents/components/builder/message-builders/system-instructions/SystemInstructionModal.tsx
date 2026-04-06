"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SystemInstructionEditor } from "./SystemInstructionEditor";

interface SystemInstructionModalProps {
  instanceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemInstructionModal({
  instanceId,
  open,
  onOpenChange,
}: SystemInstructionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Structured System Instruction</DialogTitle>
        </DialogHeader>
        <SystemInstructionEditor instanceId={instanceId} />
      </DialogContent>
    </Dialog>
  );
}
