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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sanitizeVariableName } from "@/features/agents/utils/variable-utils";
import type { VariableCustomComponent } from "@/features/agents/types/agent-definition.types";
import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import { AgentVariableEditor } from "./AgentVariableEditor";
import { useIsMobile } from "@/hooks/use-mobile";

interface AgentVariableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (variable: VariableDefinition) => void;
  existingVariable?: VariableDefinition;
  existingNames: string[];
  mode: "add" | "edit";
}

export function AgentVariableEditorModal({
  isOpen,
  onClose,
  onSave,
  existingVariable,
  existingNames,
  mode,
}: AgentVariableEditorModalProps) {
  const isMobile = useIsMobile();
  const [name, setName] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [customComponent, setCustomComponent] = useState<
    VariableCustomComponent | undefined
  >();
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState("");

  useEffect(() => {
    if (mode === "edit" && existingVariable) {
      setName(existingVariable.name);
      setDefaultValue(String(existingVariable.defaultValue ?? ""));
      // customComponent stored as object in JSONB
      setCustomComponent(
        existingVariable.customComponent
          ? (existingVariable.customComponent as unknown as VariableCustomComponent)
          : undefined,
      );
      setRequired(existingVariable.required ?? false);
      setHelpText(existingVariable.helpText ?? "");
    } else {
      setName("");
      setDefaultValue("");
      setCustomComponent(undefined);
      setRequired(false);
      setHelpText("");
    }
  }, [isOpen, mode, existingVariable]);

  const sanitizedName = name.trim() ? sanitizeVariableName(name) : "";
  const isDuplicate =
    mode === "add" && sanitizedName && existingNames.includes(sanitizedName);

  const handleSave = () => {
    if (!sanitizedName || isDuplicate) return;
    onSave({
      name: sanitizedName,
      defaultValue,
      customComponent: customComponent ?? undefined,
      required: required || undefined,
      helpText: helpText || undefined,
    });
    onClose();
  };

  const title = mode === "add" ? "Add Variable" : "Edit Variable";
  const description =
    mode === "add"
      ? "Define a new variable to use in agent messages with {{variableName}}."
      : "Update this variable's name, default value, or configuration.";

  const content = (
    <>
      <AgentVariableEditor
        name={name}
        defaultValue={defaultValue}
        customComponent={customComponent}
        required={required}
        helpText={helpText}
        existingNames={existingNames}
        originalName={mode === "edit" ? existingVariable?.name : undefined}
        onNameChange={setName}
        onDefaultValueChange={setDefaultValue}
        onCustomComponentChange={setCustomComponent}
        onRequiredChange={setRequired}
        onHelpTextChange={setHelpText}
      />
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!sanitizedName || !!isDuplicate}>
          {mode === "add" ? "Add Variable" : "Save Changes"}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="px-4 pb-safe max-h-[90dvh]">
          <DrawerHeader className="px-0">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
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
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-y-auto pr-1">
          <div className="py-1">{content}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
