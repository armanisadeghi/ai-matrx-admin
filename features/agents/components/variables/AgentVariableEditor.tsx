"use client";

import React, { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  sanitizeVariableName,
  shouldShowSanitizationPreview,
} from "@/features/prompts/utils/variable-utils";
import type {
  VariableCustomComponent,
  VariableComponentType,
} from "@/features/prompts/types/core";

interface AgentVariableEditorProps {
  name: string;
  defaultValue: string;
  customComponent?: VariableCustomComponent;
  required?: boolean;
  helpText?: string;
  existingNames?: string[];
  originalName?: string;
  onNameChange?: (name: string) => void;
  onDefaultValueChange?: (value: string) => void;
  onCustomComponentChange?: (
    component: VariableCustomComponent | undefined,
  ) => void;
  onRequiredChange?: (required: boolean) => void;
  onHelpTextChange?: (helpText: string) => void;
  readonly?: boolean;
}

export function AgentVariableEditor({
  name,
  defaultValue,
  customComponent,
  required = false,
  helpText = "",
  existingNames = [],
  originalName,
  onNameChange,
  onDefaultValueChange,
  onCustomComponentChange,
  onRequiredChange,
  onHelpTextChange,
  readonly = false,
}: AgentVariableEditorProps) {
  const [componentType, setComponentType] = useState<VariableComponentType>(
    customComponent?.type || "textarea",
  );
  const [options, setOptions] = useState<string[]>(
    customComponent?.options || [],
  );
  const [newOption, setNewOption] = useState("");
  const [allowOther, setAllowOther] = useState(
    customComponent?.allowOther || false,
  );
  const [toggleOffLabel, setToggleOffLabel] = useState(
    customComponent?.toggleValues?.[0] || "No",
  );
  const [toggleOnLabel, setToggleOnLabel] = useState(
    customComponent?.toggleValues?.[1] || "Yes",
  );
  const [min, setMin] = useState<number | undefined>(customComponent?.min);
  const [max, setMax] = useState<number | undefined>(customComponent?.max);
  const [step, setStep] = useState<number>(customComponent?.step || 1);

  const isSyncingRef = useRef(false);

  useEffect(() => {
    isSyncingRef.current = true;
    if (!customComponent) {
      setComponentType("textarea");
      setOptions([]);
      setAllowOther(false);
      setToggleOffLabel("No");
      setToggleOnLabel("Yes");
      setMin(undefined);
      setMax(undefined);
      setStep(1);
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 0);
      return;
    }
    setComponentType(customComponent.type || "textarea");
    setOptions(customComponent.options ? [...customComponent.options] : []);
    setAllowOther(customComponent.allowOther || false);
    setToggleOffLabel(customComponent.toggleValues?.[0] || "No");
    setToggleOnLabel(customComponent.toggleValues?.[1] || "Yes");
    setMin(customComponent.min);
    setMax(customComponent.max);
    setStep(customComponent.step || 1);
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
  }, [customComponent]);

  useEffect(() => {
    if (readonly || !onCustomComponentChange || isSyncingRef.current) return;
    let newCustomComponent: VariableCustomComponent | undefined;
    if (componentType !== "textarea") {
      newCustomComponent = { type: componentType };
      if (componentType === "toggle") {
        newCustomComponent.toggleValues = [toggleOffLabel, toggleOnLabel];
      } else if (
        componentType === "radio" ||
        componentType === "checkbox" ||
        componentType === "select"
      ) {
        if (options.length > 0) {
          newCustomComponent.options = options;
          if (allowOther) newCustomComponent.allowOther = true;
        } else {
          newCustomComponent = undefined;
        }
      } else if (componentType === "number") {
        if (min !== undefined) newCustomComponent.min = min;
        if (max !== undefined) newCustomComponent.max = max;
        if (step !== 1) newCustomComponent.step = step;
      }
    }
    onCustomComponentChange(newCustomComponent);
  }, [
    componentType,
    options,
    allowOther,
    toggleOffLabel,
    toggleOnLabel,
    min,
    max,
    step,
    readonly,
    onCustomComponentChange,
  ]);

  const sanitizedName = name.trim() ? sanitizeVariableName(name) : "";
  const showPreview = shouldShowSanitizationPreview(name);
  const isDuplicate =
    sanitizedName &&
    sanitizedName !== originalName &&
    existingNames.includes(sanitizedName);

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Name</Label>
        <Input
          placeholder="e.g. city_name"
          value={name}
          onChange={(e) => onNameChange?.(e.target.value)}
          disabled={readonly}
          className={isDuplicate ? "border-destructive" : ""}
          style={{ fontSize: "16px" }}
        />
        {showPreview && !readonly && (
          <div className="px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <span className="text-blue-600 dark:text-blue-400">
              Will be saved as:{" "}
            </span>
            <span className="font-mono text-blue-800 dark:text-blue-300">
              {sanitizedName}
            </span>
          </div>
        )}
        {isDuplicate && (
          <p className="text-xs text-destructive">
            A variable with this name already exists.
          </p>
        )}
      </div>

      {/* Default Value */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Default Value</Label>
        <Textarea
          autoGrow
          placeholder="Optional"
          value={defaultValue}
          onChange={(e) => onDefaultValueChange?.(e.target.value)}
          disabled={readonly}
          minHeight={80}
          maxHeight={300}
        />
      </div>

      {/* Help Text */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Help Text</Label>
        <Textarea
          autoGrow
          placeholder="Optional help text to guide users"
          value={helpText}
          onChange={(e) => onHelpTextChange?.(e.target.value)}
          disabled={readonly}
          minHeight={60}
          maxHeight={200}
        />
        <p className="text-xs text-muted-foreground">
          Provide instructions or context for this variable
        </p>
      </div>

      {/* Required */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex-1">
          <Label className="text-sm font-medium">Required</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            User must provide a value for this variable
          </p>
        </div>
        <Switch
          checked={required}
          onCheckedChange={onRequiredChange}
          disabled={readonly}
        />
      </div>

      {/* Input Type */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Input Type</Label>
        <Select
          value={componentType}
          onValueChange={(v) => setComponentType(v as VariableComponentType)}
          disabled={readonly}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="toggle">Toggle</SelectItem>
            <SelectItem value="radio">Radio Group</SelectItem>
            <SelectItem value="checkbox">Checkbox Group</SelectItem>
            <SelectItem value="select">Select Dropdown</SelectItem>
            <SelectItem value="number">Number Input</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggle config */}
      {componentType === "toggle" && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
          <Label className="text-sm font-medium">Toggle Labels</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Off
              </Label>
              <Input
                value={toggleOffLabel}
                onChange={(e) => setToggleOffLabel(e.target.value)}
                placeholder="No"
                disabled={readonly}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                On
              </Label>
              <Input
                value={toggleOnLabel}
                onChange={(e) => setToggleOnLabel(e.target.value)}
                placeholder="Yes"
                disabled={readonly}
              />
            </div>
          </div>
        </div>
      )}

      {/* Options config */}
      {(componentType === "radio" ||
        componentType === "checkbox" ||
        componentType === "select") && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
          <Label className="text-sm font-medium">Options</Label>
          {options.length > 0 && (
            <div className="space-y-2">
              {options.map((option, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-card rounded border border-border"
                >
                  <span className="text-sm flex-1">{option}</span>
                  {!readonly && (
                    <button
                      type="button"
                      onClick={() =>
                        setOptions(options.filter((_, i) => i !== idx))
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!readonly && (
            <div className="flex gap-2">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder="Add option..."
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddOption}
                disabled={!newOption.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Label className="text-sm">Allow "Other" option</Label>
            <Switch
              checked={allowOther}
              onCheckedChange={setAllowOther}
              disabled={readonly}
            />
          </div>
        </div>
      )}

      {/* Number config */}
      {componentType === "number" && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
          <Label className="text-sm font-medium">Number Settings</Label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Min
              </Label>
              <Input
                type="number"
                value={min ?? ""}
                onChange={(e) =>
                  setMin(
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="None"
                disabled={readonly}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Max
              </Label>
              <Input
                type="number"
                value={max ?? ""}
                onChange={(e) =>
                  setMax(
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="None"
                disabled={readonly}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Step
              </Label>
              <Input
                type="number"
                value={step}
                onChange={(e) => setStep(parseFloat(e.target.value) || 1)}
                placeholder="1"
                disabled={readonly}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
