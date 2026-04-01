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
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentSettings,
  selectAgentModelId,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  setAgentSettings,
  setAgentField,
} from "@/features/agents/redux/agent-definition/slice";
import type { LLMParams } from "@/features/agents/types/agent-api-types";
import { AgentSettingsCore } from "./AgentSettingsCore";

interface AgentSettingsModalProps {
  agentId: string;
}

interface SettingsSnapshot {
  settings: LLMParams;
  modelId: string | null;
}

export function AgentSettingsModal({ agentId }: AgentSettingsModalProps) {
  const dispatch = useAppDispatch();
  const isMobile = useIsMobile();

  const currentSettings = useAppSelector((state) =>
    selectAgentSettings(state, agentId),
  );
  const currentModelId = useAppSelector((state) =>
    selectAgentModelId(state, agentId),
  );

  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleOpen = () => {
    setSnapshot({
      settings: currentSettings ?? {},
      modelId: currentModelId ?? null,
    });
    setOpen(true);
  };

  const hasChanges = () => {
    if (!snapshot) return false;
    const settingsChanged =
      JSON.stringify(currentSettings ?? {}) !==
      JSON.stringify(snapshot.settings);
    const modelChanged = (currentModelId ?? null) !== snapshot.modelId;
    return settingsChanged || modelChanged;
  };

  const revertToSnapshot = () => {
    if (!snapshot) return;
    dispatch(setAgentSettings({ id: agentId, settings: snapshot.settings }));
    if (snapshot.modelId !== null) {
      dispatch(
        setAgentField({
          id: agentId,
          field: "modelId",
          value: snapshot.modelId,
        }),
      );
    }
  };

  const handleCancelClick = () => {
    if (hasChanges()) {
      setShowCancelConfirm(true);
    } else {
      setOpen(false);
    }
  };

  const handleConfirmCancel = () => {
    revertToSnapshot();
    setShowCancelConfirm(false);
    setOpen(false);
  };

  const handleDone = () => {
    setSnapshot(null);
    setOpen(false);
  };

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleOpen}
      title="Model settings"
    >
      <SlidersHorizontal className="h-4 w-4" />
    </Button>
  );

  const footer = (
    <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCancelClick}
        className="h-7 text-xs"
      >
        Cancel
      </Button>
      <Button size="sm" onClick={handleDone} className="h-7 text-xs">
        Done
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer
          open={open}
          onOpenChange={(o) => {
            if (!o) handleCancelClick();
            else handleOpen();
          }}
        >
          <DrawerContent className="px-4 pb-safe max-h-[90dvh] flex flex-col">
            <DrawerHeader className="px-0 py-2 flex-shrink-0">
              <DrawerTitle className="text-xs font-semibold uppercase tracking-wide">
                Model Settings
              </DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 pb-2">
              <AgentSettingsCore agentId={agentId} />
            </div>
            {footer}
          </DrawerContent>
        </Drawer>
        <AlertDialog
          open={showCancelConfirm}
          onOpenChange={setShowCancelConfirm}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Your settings changes will be reverted. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowCancelConfirm(false)}>
                Keep editing
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCancel}>
                Discard changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) handleCancelClick();
          else handleOpen();
        }}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader className="px-4 py-2.5 border-b border-border flex-shrink-0">
            <DialogTitle className="text-xs font-semibold uppercase tracking-wide">
              Model Settings
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-3 py-1 flex-1">
            <AgentSettingsCore agentId={agentId} />
          </div>
          {footer}
        </DialogContent>
      </Dialog>
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Your settings changes will be reverted to what they were when you
              opened this panel. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCancelConfirm(false)}>
              Keep editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
