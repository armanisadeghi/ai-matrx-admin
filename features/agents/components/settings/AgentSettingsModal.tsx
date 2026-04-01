"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
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
          <DrawerContent className="px-4 pb-safe max-h-[90dvh]">
            <DrawerHeader className="px-0 py-2">
              <DrawerTitle className="text-xs font-semibold uppercase tracking-wide">
                Model Settings
              </DrawerTitle>
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
        <DialogContent className="max-w-lg p-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-4 py-2.5 border-b border-border flex-shrink-0">
            <DialogTitle className="text-xs font-semibold uppercase tracking-wide">
              Model Settings
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-4 py-3 flex-1">
            <AgentSettingsCore agentId={agentId} />
          </div>
          <div className="flex items-center justify-end px-4 py-2.5 border-t border-border bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              size="sm"
              className="h-7 text-xs"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
