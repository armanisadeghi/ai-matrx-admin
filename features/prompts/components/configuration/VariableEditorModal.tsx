import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VariableCustomComponent } from "@/features/prompts/types/core";
import { sanitizeVariableName } from "@/features/prompts/utils/variable-utils";
import { VariableEditor } from "./VariableEditor";

interface VariableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, defaultValue: string, customComponent?: VariableCustomComponent, required?: boolean, helpText?: string) => void;
  existingVariable?: {
    name: string;
    defaultValue: string;
    customComponent?: VariableCustomComponent;
    required?: boolean;
    helpText?: string;
  };
  existingNames: string[];
  mode: 'add' | 'edit';
}

/**
 * Modal for adding or editing prompt variables with custom component configuration
 */
export function VariableEditorModal({
  isOpen,
  onClose,
  onSave,
  existingVariable,
  existingNames,
  mode
}: VariableEditorModalProps) {
  const [name, setName] = useState("");
  const [defaultValue, setDefaultValue] = useState("");
  const [customComponent, setCustomComponent] = useState<VariableCustomComponent | undefined>();
  const [required, setRequired] = useState(false);
  const [helpText, setHelpText] = useState("");

  // Initialize form with existing variable data
  useEffect(() => {
    if (mode === 'edit' && existingVariable) {
      setName(existingVariable.name);
      setDefaultValue(existingVariable.defaultValue || "");
      setCustomComponent(existingVariable.customComponent);
      setRequired(existingVariable.required || false);
      setHelpText(existingVariable.helpText || "");
    } else {
      // Reset for add mode
      setName("");
      setDefaultValue("");
      setCustomComponent(undefined);
      setRequired(false);
      setHelpText("");
    }
  }, [isOpen, mode, existingVariable]);

  const sanitizedName = name.trim() ? sanitizeVariableName(name) : "";
  
  // Check if name is duplicate (but allow same name in edit mode)
  const isDuplicate = mode === 'add' && sanitizedName && existingNames.includes(sanitizedName);

  const handleSave = () => {
    if (!sanitizedName || isDuplicate) return;
    onSave(sanitizedName, defaultValue, customComponent, required, helpText);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add Variable' : 'Edit Variable'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <VariableEditor
            name={name}
            defaultValue={defaultValue}
            customComponent={customComponent}
            required={required}
            helpText={helpText}
            existingNames={existingNames}
            originalName={mode === 'edit' ? existingVariable?.name : undefined}
            onNameChange={setName}
            onDefaultValueChange={setDefaultValue}
            onCustomComponentChange={setCustomComponent}
            onRequiredChange={setRequired}
            onHelpTextChange={setHelpText}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!sanitizedName || isDuplicate}
            >
              {mode === 'add' ? 'Add Variable' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}