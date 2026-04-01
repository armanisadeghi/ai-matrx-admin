"use client";

import { useState } from "react";
import { Wrench } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { AgentToolsManager } from "@/features/agents/components/builder/AgentToolsManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentTools } from "@/features/agents/redux/agent-definition/selectors";

interface AgentToolsModalProps {
  agentId: string;
  availableTools?: Array<{
    name: string;
    description?: string;
    [key: string]: unknown;
  }>;
}

export function AgentToolsModal({
  agentId,
  availableTools = [],
}: AgentToolsModalProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const selectedTools = useAppSelector((state) =>
    selectAgentTools(state, agentId),
  );
  const enabledCount = Array.isArray(selectedTools) ? selectedTools.length : 0;

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 relative"
      onClick={() => setOpen(true)}
      title="Tools"
    >
      <Wrench className="h-4 w-4" />
      {enabledCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
          {enabledCount > 9 ? "9+" : enabledCount}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[90dvh] flex flex-col">
            <DrawerHeader className="px-4 pt-4 pb-2 shrink-0">
              <DrawerTitle>Agent Tools</DrawerTitle>
              <DrawerDescription>
                {availableTools.length} tools available · tap to enable
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe">
              <AgentToolsManager
                agentId={agentId}
                availableTools={availableTools}
              />
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
        <DialogContent className="max-w-[90vw] w-full xl:max-w-6xl h-[88dvh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b border-border">
            <DialogTitle className="text-base font-semibold">
              Agent Tools
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {availableTools.length} tools available — select what this agent
              can use
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <AgentToolsManager
              agentId={agentId}
              availableTools={availableTools}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
