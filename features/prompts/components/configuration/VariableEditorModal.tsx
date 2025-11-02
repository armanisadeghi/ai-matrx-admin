import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { VariableCustomComponent, VariableComponentType } from "../../types/variable-components";
import { sanitizeVariableName, shouldShowSanitizationPreview } from "../../utils/variable-utils";

interface VariableEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, defaultValue: string, customComponent?: VariableCustomComponent) => void;
  existingVariable?: {
    name: string;
    defaultValue: string;
    customComponent?: VariableCustomComponent;
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
  const [componentType, setComponentType] = useState<VariableComponentType>("textarea");
  const [options, setOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState("");
  const [allowOther, setAllowOther] = useState(false);
  const [toggleOffLabel, setToggleOffLabel] = useState("No");
  const [toggleOnLabel, setToggleOnLabel] = useState("Yes");
  const [min, setMin] = useState<number | undefined>(undefined);
  const [max, setMax] = useState<number | undefined>(undefined);
  const [step, setStep] = useState<number>(1);

  // Initialize form with existing variable data
  useEffect(() => {
    if (mode === 'edit' && existingVariable) {
      setName(existingVariable.name);
      setDefaultValue(existingVariable.defaultValue || "");
      const comp = existingVariable.customComponent;
      
      if (comp) {
        setComponentType(comp.type);
        
        if (comp.options) {
          setOptions(comp.options);
        }
        
        if (comp.allowOther !== undefined) {
          setAllowOther(comp.allowOther);
        }
        
        if (comp.toggleValues) {
          setToggleOffLabel(comp.toggleValues[0]);
          setToggleOnLabel(comp.toggleValues[1]);
        }
        
        if (comp.min !== undefined) setMin(comp.min);
        if (comp.max !== undefined) setMax(comp.max);
        if (comp.step !== undefined) setStep(comp.step);
      }
    } else {
      // Reset for add mode
      setName("");
      setDefaultValue("");
      setComponentType("textarea");
      setOptions([]);
      setNewOption("");
      setAllowOther(false);
      setToggleOffLabel("No");
      setToggleOnLabel("Yes");
      setMin(undefined);
      setMax(undefined);
      setStep(1);
    }
  }, [isOpen, mode, existingVariable]);

  const sanitizedName = name.trim() ? sanitizeVariableName(name) : "";
  const showPreview = shouldShowSanitizationPreview(name);
  
  // Check if name is duplicate (but allow same name in edit mode)
  const isDuplicate = mode === 'add' && sanitizedName && existingNames.includes(sanitizedName);
  
  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (option: string) => {
    setOptions(options.filter(o => o !== option));
  };

  const handleSave = () => {
    if (!sanitizedName || isDuplicate) return;

    // Build customComponent based on type
    let customComponent: VariableCustomComponent | undefined;

    if (componentType !== "textarea") {
      customComponent = { type: componentType };

      if (componentType === "toggle") {
        customComponent.toggleValues = [toggleOffLabel, toggleOnLabel];
      } else if (componentType === "radio" || componentType === "checkbox" || componentType === "select") {
        if (options.length > 0) {
          customComponent.options = options;
          if (allowOther) {
            customComponent.allowOther = true;
          }
        } else {
          // If no options provided, fall back to textarea
          customComponent = undefined;
        }
      } else if (componentType === "number") {
        if (min !== undefined) customComponent.min = min;
        if (max !== undefined) customComponent.max = max;
        if (step !== 1) customComponent.step = step;
      }
    }

    onSave(sanitizedName, defaultValue, customComponent);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? 'Add Variable' : 'Edit Variable'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Variable Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Variable Name</Label>
            <Input
              type="text"
              placeholder="e.g. city name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={mode === 'edit'} // Can't change name in edit mode
              autoFocus
              className={isDuplicate ? "border-red-500" : ""}
            />
            
            {showPreview && (
              <div className="px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <span className="text-blue-600 dark:text-blue-400">Will be saved as: </span>
                <span className="font-mono text-blue-800 dark:text-blue-300">{sanitizedName}</span>
              </div>
            )}
            
            {isDuplicate && (
              <p className="text-xs text-red-600 dark:text-red-400">
                A variable with this name already exists
              </p>
            )}
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Spaces and dashes become underscores. Only lowercase letters, numbers, and underscores allowed.
            </p>
          </div>

          {/* Default Value */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Default Value</Label>
            <Input
              type="text"
              placeholder="Optional default value for this variable"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The default value that will be pre-filled when using this prompt
            </p>
          </div>

          {/* Component Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Input Type</Label>
            <Select value={componentType} onValueChange={(value) => setComponentType(value as VariableComponentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="textarea">Textarea (Default)</SelectItem>
                <SelectItem value="toggle">Toggle (Yes/No)</SelectItem>
                <SelectItem value="radio">Radio Group</SelectItem>
                <SelectItem value="checkbox">Checkbox Group</SelectItem>
                <SelectItem value="select">Select Dropdown</SelectItem>
                <SelectItem value="number">Number Input</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose how users will input this variable value
            </p>
          </div>

          {/* Toggle Configuration */}
          {componentType === "toggle" && (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Toggle Labels</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Off Label</Label>
                  <Input
                    value={toggleOffLabel}
                    onChange={(e) => setToggleOffLabel(e.target.value)}
                    placeholder="No"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">On Label</Label>
                  <Input
                    value={toggleOnLabel}
                    onChange={(e) => setToggleOnLabel(e.target.value)}
                    placeholder="Yes"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Options Configuration (Radio, Checkbox, Select) */}
          {(componentType === "radio" || componentType === "checkbox" || componentType === "select") && (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Options</p>
              
              {/* Existing Options */}
              <div className="space-y-1.5">
                {options.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-600">
                    <span className="text-sm flex-1">{option}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(option)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {options.length === 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic py-2">
                    No options added yet
                  </p>
                )}
              </div>

              {/* Add New Option */}
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOption();
                    }
                  }}
                  placeholder="Enter option..."
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddOption}
                  disabled={!newOption.trim()}
                  className="h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              </div>
              
              {/* Allow Other Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Allow "Other" Option
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Let users enter custom text with "Other: custom value" format
                  </p>
                </div>
                <Switch
                  checked={allowOther}
                  onCheckedChange={setAllowOther}
                />
              </div>
            </div>
          )}

          {/* Number Configuration */}
          {componentType === "number" && (
            <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Number Settings</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Min</Label>
                  <Input
                    type="number"
                    value={min ?? ""}
                    onChange={(e) => setMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="None"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Max</Label>
                  <Input
                    type="number"
                    value={max ?? ""}
                    onChange={(e) => setMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="None"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600 dark:text-gray-400">Step</Label>
                  <Input
                    type="number"
                    value={step}
                    onChange={(e) => setStep(parseFloat(e.target.value) || 1)}
                    placeholder="1"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

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

