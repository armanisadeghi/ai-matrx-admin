"use client";

import { useState, useRef, useCallback } from "react";
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
import { AgentToolsManager } from "@/features/agents/components/tools-management/AgentToolsManager";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentTools,
  selectAgentCustomTools,
  selectAgentDirtyFields,
} from "@/features/agents/redux/agent-definition/selectors";
import { resetAgentField } from "@/features/agents/redux/agent-definition/slice";
import type { DatabaseTool } from "@/utils/supabase/tools-service";

interface AgentToolsModalProps {
  agentId: string;
  availableTools?: DatabaseTool[];
}

export function AgentToolsModal({
  agentId,
  availableTools,
}: AgentToolsModalProps) {
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();

  const selectedTools = useAppSelector((state) =>
    selectAgentTools(state, agentId),
  );
  const dirtyFields = useAppSelector((state) =>
    selectAgentDirtyFields(state, agentId),
  );
  const enabledCount = Array.isArray(selectedTools) ? selectedTools.length : 0;

  const hadToolsDirtyOnOpen = useRef(false);
  const hadCustomToolsDirtyOnOpen = useRef(false);

  const handleOpen = useCallback(() => {
    hadToolsDirtyOnOpen.current = dirtyFields?.has("tools") ?? false;
    hadCustomToolsDirtyOnOpen.current = dirtyFields?.has("customTools") ?? false;
    setOpen(true);
  }, [dirtyFields]);

  const handleDone = useCallback(() => {
    setOpen(false);
  }, []);

  const handleCancel = useCallback(() => {
    if (!hadToolsDirtyOnOpen.current && dirtyFields.has("tools")) {
      dispatch(resetAgentField({ id: agentId, field: "tools" }));
    }
    if (!hadCustomToolsDirtyOnOpen.current && dirtyFields.has("customTools")) {
      dispatch(resetAgentField({ id: agentId, field: "customTools" }));
    }
    setOpen(false);
  }, [agentId, dirtyFields, dispatch]);

  const toolsChangedInSession =
    (!hadToolsDirtyOnOpen.current && dirtyFields.has("tools")) ||
    (!hadCustomToolsDirtyOnOpen.current && dirtyFields.has("customTools"));

  const footer = (
    <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border shrink-0 bg-background">
      {toolsChangedInSession && (
        <span className="text-[11px] text-muted-foreground mr-auto">
          Unsaved changes
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs"
        onClick={handleCancel}
      >
        Cancel
      </Button>
      <Button size="sm" className="h-8 text-xs" onClick={handleDone}>
        Done
      </Button>
    </div>
  );

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 relative"
      onClick={handleOpen}
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
        <Drawer
          open={open}
          onOpenChange={(v) => {
            if (!v) handleCancel();
            else setOpen(v);
          }}
        >
          <DrawerContent className="max-h-[90dvh] flex flex-col">
            <DrawerHeader className="px-4 pt-4 pb-2 shrink-0">
              <DrawerTitle>Agent Tools</DrawerTitle>
              <DrawerDescription>
                Tap to enable tools for this agent
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4">
              <AgentToolsManager
                agentId={agentId}
                availableTools={availableTools}
              />
            </div>
            {footer}
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleCancel();
          else setOpen(v);
        }}
      >
        <DialogContent className="max-w-[90vw] w-full xl:max-w-6xl h-[88dvh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 pt-5 pb-4 shrink-0 border-b border-border">
            <DialogTitle className="text-base font-semibold">
              Agent Tools
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select what this agent can use
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <AgentToolsManager
              agentId={agentId}
              availableTools={availableTools}
            />
          </div>
          {footer}
        </DialogContent>
      </Dialog>
    </>
  );
}
