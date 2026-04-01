"use client";

/**
 * AgentVariablesModal
 *
 * Dialog/Drawer wrapper around AgentVariablesManager.
 * Triggered via a Variable icon button.
 */

import { useState } from "react";
import { Variable } from "lucide-react";
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
import { AgentVariablesManager } from "@/features/agents/components/variables/AgentVariablesManager";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentVariableDefinitions } from "@/features/agents/redux/agent-definition/selectors";

interface AgentVariablesModalProps {
  agentId: string;
}

export function AgentVariablesModal({ agentId }: AgentVariablesModalProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const variables = useAppSelector((state) =>
    selectAgentVariableDefinitions(state, agentId),
  );
  const count = variables?.length ?? 0;

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 relative"
      onClick={() => setOpen(true)}
      title="Variables"
    >
      <Variable className="h-4 w-4" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-safe max-h-[85dvh]">
            <DrawerHeader className="px-0">
              <DrawerTitle>Variables</DrawerTitle>
              <DrawerDescription>
                Define variables to use in agent messages with{" "}
                {"{{variableName}}"}.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto pb-6">
              <AgentVariablesManager agentId={agentId} />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Variables</DialogTitle>
            <DialogDescription>
              Define variables to use in agent messages with{" "}
              {"{{variableName}}"}.
            </DialogDescription>
          </DialogHeader>
          <AgentVariablesManager agentId={agentId} />
        </DialogContent>
      </Dialog>
    </>
  );
}
