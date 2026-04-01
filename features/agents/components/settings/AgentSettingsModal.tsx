"use client";

/**
 * AgentSettingsModal
 *
 * Dialog/Drawer wrapper around AgentSettingsCore.
 * Triggered via a SlidersHorizontal icon button.
 * Uses Drawer on mobile (bottom sheet) and Dialog on desktop.
 */

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
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
import { AgentSettingsCore } from "./AgentSettingsCore";

interface AgentSettingsModalProps {
  agentId: string;
}

export function AgentSettingsModal({ agentId }: AgentSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={() => setOpen(true)}
      title="Model settings"
    >
      <SlidersHorizontal className="h-4 w-4" />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-safe max-h-[85dvh]">
            <DrawerHeader className="px-0">
              <DrawerTitle>Model Settings</DrawerTitle>
              <DrawerDescription>
                Configure the AI model and parameters for this agent.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto pb-6">
              <AgentSettingsCore agentId={agentId} />
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Model Settings</DialogTitle>
            <DialogDescription>
              Configure the AI model and parameters for this agent.
            </DialogDescription>
          </DialogHeader>
          <AgentSettingsCore agentId={agentId} scrollHeight="420px" />
        </DialogContent>
      </Dialog>
    </>
  );
}
