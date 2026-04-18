"use client";

import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/ButtonMine";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizeVariableName } from "@/features/agents/utils/variable-utils";
import type {
  VariableCustomComponent,
  VariableDefinition,
} from "@/features/agents/types/agent-definition.types";
import { AgentVariableEditor } from "./AgentVariableEditor";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgentVariableEditorModalProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;

  // Edit mode: pass variableName → editor auto-saves via Redux
  variableName?: string;

  // Add mode: no variableName → controlled state, onAdd called on confirm
  onAdd?: (variable: VariableDefinition) => void;
  existingNames: string[];
  mode: "add" | "edit";
  // Optional pre-filled name when opening in "add" mode (e.g. converting an
  // undeclared {{var}} reference into a real variable).
  prefillName?: string;
}

export function AgentVariableEditorModal({
  agentId,
  isOpen,
  onClose,
  variableName,
  onAdd,
  existingNames,
  mode,
  prefillName,
}: AgentVariableEditorModalProps) {
  const isMobile = useIsMobile();

  // Add-mode controlled state
  const [newName, setNewName] = useState("");
  const [newDefaultValue, setNewDefaultValue] = useState("");
  const [newCustomComponent, setNewCustomComponent] = useState<
    VariableCustomComponent | undefined
  >(undefined);
  const [newRequired, setNewRequired] = useState(false);
  const [newHelpText, setNewHelpText] = useState("");

  useEffect(() => {
    if (isOpen && mode === "add") {
      setNewName(prefillName ?? "");
      setNewDefaultValue("");
      setNewCustomComponent(undefined);
      setNewRequired(false);
      setNewHelpText("");
    }
  }, [isOpen, mode, prefillName]);

  const sanitizedName = newName.trim() ? sanitizeVariableName(newName) : "";
  const isDuplicate =
    mode === "add" && !!sanitizedName && existingNames.includes(sanitizedName);
  const canAdd = mode === "add" && !!sanitizedName && !isDuplicate;

  const handleAdd = () => {
    if (!canAdd || !onAdd) return;
    onAdd({
      name: sanitizedName,
      defaultValue: newDefaultValue,
      customComponent: newCustomComponent,
      required: newRequired || undefined,
      helpText: newHelpText || undefined,
    });
    onClose();
  };

  const title = mode === "add" ? "Add Variable" : "Edit Variable";

  const content = (
    <>
      {mode === "edit" && variableName ? (
        // Existing variable — AgentVariableEditor dispatches directly
        <AgentVariableEditor
          agentId={agentId}
          variableName={variableName}
          existingNames={existingNames}
        />
      ) : (
        // New variable — controlled
        <AgentVariableEditor
          name={newName}
          defaultValue={newDefaultValue}
          customComponent={newCustomComponent}
          required={newRequired}
          helpText={newHelpText}
          existingNames={existingNames}
          onNameChange={setNewName}
          onDefaultValueChange={setNewDefaultValue}
          onCustomComponentChange={setNewCustomComponent}
          onRequiredChange={setNewRequired}
          onHelpTextChange={setNewHelpText}
        />
      )}

      {mode === "add" && (
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!canAdd}>
            Add Variable
          </Button>
        </div>
      )}

      {mode === "edit" && (
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="px-4 pb-safe max-h-[90dvh]">
          <DrawerHeader className="px-0">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>
              <span className="sr-only">Variable editor</span>
            </DrawerDescription>
          </DrawerHeader>
          <ScrollArea className="flex-1 overflow-y-auto pb-4">
            {content}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-hidden flex flex-col p-3">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            <span className="sr-only">Variable editor</span>
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto pr-1">
          <div className="py-1">{content}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
