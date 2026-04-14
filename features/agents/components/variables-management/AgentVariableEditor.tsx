"use client";

/**
 * AgentVariableEditor
 *
 * Single source of truth for editing one variable definition.
 *
 * Two modes:
 *   • Existing variable (agentId + variableName provided) — dispatches directly
 *     to Redux on every change. No save button needed.
 *   • New variable (callbacks only) — parent owns the add flow and calls
 *     onCustomComponentChange / onDefaultValueChange etc. to collect state,
 *     then dispatches when the user confirms.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
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
} from "@/features/agents/utils/variable-utils";
import type {
  VariableCustomComponent,
  VariableComponentType,
  VariableDefinition,
} from "@/features/agents/types/agent-definition.types";
import {
  getComponentTypeOptions,
  getComponentTypeMeta,
} from "@/features/agents/components/inputs/variable-input-variations/variable-input-options";
import { VariableInputComponent } from "@/features/agents/components/inputs/input-components";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import { selectAgentVariableDefinitions } from "@/features/agents/redux/agent-definition/selectors";
import { setAgentVariableDefinitions } from "@/features/agents/redux/agent-definition/slice";

// ─── Props ───────────────────────────────────────────────────────────────────

interface AgentVariableEditorProps {
  // ── Existing-variable mode ─────────────────────────────────────────────────
  /** When provided together with variableName, the editor dispatches directly. */
  agentId?: string;
  /** The saved name of the variable being edited (original, pre-sanitization). */
  variableName?: string;

  // ── New-variable / controlled mode (parent drives state) ──────────────────
  name?: string;
  defaultValue?: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCustomComponent(
  componentType: VariableComponentType,
  options: string[],
  allowOther: boolean,
  toggleOffLabel: string,
  toggleOnLabel: string,
  min: number | undefined,
  max: number | undefined,
  step: number,
): VariableCustomComponent | undefined {
  if (componentType === "textarea") return undefined;
  const meta = getComponentTypeMeta(componentType);
  const cc: VariableCustomComponent = { type: componentType };
  if (meta.requiresToggleValues) {
    cc.toggleValues = [toggleOffLabel || "No", toggleOnLabel || "Yes"];
  } else if (meta.requiresOptions) {
    if (options.length === 0) return undefined;
    cc.options = options;
    if (allowOther) cc.allowOther = true;
  } else if (meta.requiresMinMax || componentType === "number") {
    if (min !== undefined) cc.min = min;
    if (max !== undefined) cc.max = max;
    if (step !== 1) cc.step = step;
  }
  return cc;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AgentVariableEditor({
  agentId,
  variableName,
  name: nameProp,
  defaultValue: defaultValueProp,
  customComponent: customComponentProp,
  required: requiredProp = false,
  helpText: helpTextProp = "",
  existingNames = [],
  originalName,
  onNameChange,
  onDefaultValueChange,
  onCustomComponentChange,
  onRequiredChange,
  onHelpTextChange,
  readonly = false,
}: AgentVariableEditorProps) {
  const dispatch = useAppDispatch();

  // Redux data (only used in existing-variable mode)
  const rawVariables = useAppSelector((state) =>
    agentId ? selectAgentVariableDefinitions(state, agentId) : null,
  );
  const variables: VariableDefinition[] = rawVariables ?? [];

  // In existing-variable mode, resolve the variable from Redux
  const existingVariable =
    agentId && variableName
      ? variables.find((v) => v.name === variableName)
      : undefined;

  const isExistingMode = !!(agentId && variableName);

  // ── Derive initial values from the right source ───────────────────────────
  const getInitial = useCallback(() => {
    const cc = isExistingMode
      ? existingVariable?.customComponent
      : customComponentProp;
    const name = isExistingMode
      ? (existingVariable?.name ?? "")
      : (nameProp ?? "");
    const defaultVal = isExistingMode
      ? String(existingVariable?.defaultValue ?? "")
      : (defaultValueProp ?? "");
    const required = isExistingMode
      ? (existingVariable?.required ?? false)
      : requiredProp;
    const helpText = isExistingMode
      ? (existingVariable?.helpText ?? "")
      : (helpTextProp ?? "");
    return { cc, name, defaultVal, required, helpText };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableName, agentId]); // intentionally shallow — we re-init on variable switch

  const initial = getInitial();

  // ── Local state ───────────────────────────────────────────────────────────
  const [localName, setLocalName] = useState(initial.name);
  const [localDefaultValue, setLocalDefaultValue] = useState(
    initial.defaultVal,
  );
  const [localRequired, setLocalRequired] = useState(initial.required);
  const [localHelpText, setLocalHelpText] = useState(initial.helpText);
  const [componentType, setComponentType] = useState<VariableComponentType>(
    initial.cc?.type ?? "textarea",
  );
  const [options, setOptions] = useState<string[]>(initial.cc?.options ?? []);
  const [newOption, setNewOption] = useState("");
  const [allowOther, setAllowOther] = useState(initial.cc?.allowOther ?? false);
  const [toggleOffLabel, setToggleOffLabel] = useState(
    initial.cc?.toggleValues?.[0] ?? "No",
  );
  const [toggleOnLabel, setToggleOnLabel] = useState(
    initial.cc?.toggleValues?.[1] ?? "Yes",
  );
  const [min, setMin] = useState<number | undefined>(initial.cc?.min);
  const [max, setMax] = useState<number | undefined>(initial.cc?.max);
  const [step, setStep] = useState<number>(initial.cc?.step ?? 1);

  const isSyncingRef = useRef(false);

  // Re-sync when the variable being edited changes (selection changes in Panel)
  useEffect(() => {
    isSyncingRef.current = true;
    const { cc, name, defaultVal, required, helpText } = getInitial();
    setLocalName(name);
    setLocalDefaultValue(defaultVal);
    setLocalRequired(required);
    setLocalHelpText(helpText);
    setComponentType(cc?.type ?? "textarea");
    setOptions(cc?.options ? [...cc.options] : []);
    setAllowOther(cc?.allowOther ?? false);
    setToggleOffLabel(cc?.toggleValues?.[0] ?? "No");
    setToggleOnLabel(cc?.toggleValues?.[1] ?? "Yes");
    setMin(cc?.min);
    setMax(cc?.max);
    setStep(cc?.step ?? 1);
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableName, agentId, customComponentProp]);

  // ── Auto-dispatch for existing variables ─────────────────────────────────
  const dispatchUpdate = useCallback(
    (patch: Partial<VariableDefinition>) => {
      if (!agentId || !variableName || isSyncingRef.current) return;
      const current = variables.find((v) => v.name === variableName);
      if (!current) return;
      const updated: VariableDefinition = { ...current, ...patch };
      dispatch(
        setAgentVariableDefinitions({
          id: agentId,
          variableDefinitions: variables.map((v) =>
            v.name === variableName ? updated : v,
          ),
        }),
      );
    },
    [agentId, variableName, variables, dispatch],
  );

  // ── Field change handlers ─────────────────────────────────────────────────

  const handleNameChange = (v: string) => {
    setLocalName(v);
    onNameChange?.(v);
    // Name saved on blur only (sanitization happens at save time)
  };

  const handleNameBlur = () => {
    if (!isExistingMode) return;
    const sanitized = localName.trim() ? sanitizeVariableName(localName) : "";
    if (!sanitized || sanitized === variableName) return;
    const isDup = variables.some(
      (v) => v.name !== variableName && v.name === sanitized,
    );
    if (isDup) return;
    // Rename: update the variable name in the array
    if (!agentId) return;
    dispatch(
      setAgentVariableDefinitions({
        id: agentId,
        variableDefinitions: variables.map((v) =>
          v.name === variableName ? { ...v, name: sanitized } : v,
        ),
      }),
    );
  };

  const handleDefaultValueChange = (v: string) => {
    setLocalDefaultValue(v);
    onDefaultValueChange?.(v);
    dispatchUpdate({ defaultValue: v });
  };

  const handleRequiredChange = (v: boolean) => {
    setLocalRequired(v);
    onRequiredChange?.(v);
    dispatchUpdate({ required: v || undefined });
  };

  const handleHelpTextChange = (v: string) => {
    setLocalHelpText(v);
    onHelpTextChange?.(v);
    dispatchUpdate({ helpText: v || undefined });
  };

  // Rebuild and emit/dispatch customComponent whenever config changes
  const emitCustomComponent = useCallback(
    (
      type: VariableComponentType,
      opts: string[],
      other: boolean,
      offLabel: string,
      onLabel: string,
      minV: number | undefined,
      maxV: number | undefined,
      stepV: number,
    ) => {
      if (isSyncingRef.current) return;
      const cc = buildCustomComponent(
        type,
        opts,
        other,
        offLabel,
        onLabel,
        minV,
        maxV,
        stepV,
      );
      onCustomComponentChange?.(cc);
      dispatchUpdate({ customComponent: cc });
    },
    [onCustomComponentChange, dispatchUpdate],
  );

  const handleTypeChange = (v: VariableComponentType) => {
    setComponentType(v);
    setOptions([]);
    setAllowOther(false);
    // Reset default value when type changes
    handleDefaultValueChange("");
    emitCustomComponent(
      v,
      [],
      false,
      toggleOffLabel,
      toggleOnLabel,
      min,
      max,
      step,
    );
  };

  const handleOptionsChange = (next: string[]) => {
    setOptions(next);
    emitCustomComponent(
      componentType,
      next,
      allowOther,
      toggleOffLabel,
      toggleOnLabel,
      min,
      max,
      step,
    );
  };

  const handleAllowOtherChange = (v: boolean) => {
    setAllowOther(v);
    emitCustomComponent(
      componentType,
      options,
      v,
      toggleOffLabel,
      toggleOnLabel,
      min,
      max,
      step,
    );
  };

  const handleToggleOffLabelChange = (v: string) => {
    setToggleOffLabel(v);
    emitCustomComponent(
      componentType,
      options,
      allowOther,
      v,
      toggleOnLabel,
      min,
      max,
      step,
    );
  };

  const handleToggleLabelOnChange = (v: string) => {
    setToggleOnLabel(v);
    emitCustomComponent(
      componentType,
      options,
      allowOther,
      toggleOffLabel,
      v,
      min,
      max,
      step,
    );
  };

  const handleMinChange = (v: number | undefined) => {
    setMin(v);
    emitCustomComponent(
      componentType,
      options,
      allowOther,
      toggleOffLabel,
      toggleOnLabel,
      v,
      max,
      step,
    );
  };

  const handleMaxChange = (v: number | undefined) => {
    setMax(v);
    emitCustomComponent(
      componentType,
      options,
      allowOther,
      toggleOffLabel,
      toggleOnLabel,
      min,
      v,
      step,
    );
  };

  const handleStepChange = (v: number) => {
    setStep(v);
    emitCustomComponent(
      componentType,
      options,
      allowOther,
      toggleOffLabel,
      toggleOnLabel,
      min,
      max,
      v,
    );
  };

  // Bug fix #1: auto-add pending option on blur so it's never silently lost
  const handleOptionBlur = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      handleOptionsChange([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !options.includes(trimmed)) {
      handleOptionsChange([...options, trimmed]);
      setNewOption("");
    }
  };

  const handleRemoveOption = (idx: number) => {
    handleOptionsChange(options.filter((_, i) => i !== idx));
  };

  // ── Preview customComponent for the live default-value input ──────────────
  const previewCustomComponent = React.useMemo(
    () =>
      buildCustomComponent(
        componentType,
        options,
        allowOther,
        toggleOffLabel,
        toggleOnLabel,
        min,
        max,
        step,
      ),
    [
      componentType,
      options,
      allowOther,
      toggleOffLabel,
      toggleOnLabel,
      min,
      max,
      step,
    ],
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const effectiveName = isExistingMode ? localName : (nameProp ?? localName);
  const sanitizedName = effectiveName.trim()
    ? sanitizeVariableName(effectiveName)
    : "";
  const showSanitizationPreview = shouldShowSanitizationPreview(effectiveName);
  const isDuplicate =
    !!sanitizedName &&
    sanitizedName !== (originalName ?? variableName) &&
    existingNames.includes(sanitizedName);

  const meta = getComponentTypeMeta(componentType);

  // ── Resolve display values ────────────────────────────────────────────────
  const displayName = isExistingMode ? localName : (nameProp ?? "");
  const displayDefaultValue = isExistingMode
    ? localDefaultValue
    : (defaultValueProp ?? "");
  const displayRequired = isExistingMode ? localRequired : requiredProp;
  const displayHelpText = isExistingMode ? localHelpText : (helpTextProp ?? "");

  return (
    <div className="space-y-3">
      {/* ── Name ─────────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Name</Label>
        <Input
          placeholder="e.g. city_name"
          value={displayName}
          onChange={(e) => handleNameChange(e.target.value)}
          onBlur={handleNameBlur}
          disabled={readonly}
          className={isDuplicate ? "border-destructive" : ""}
          style={{ fontSize: "16px" }}
        />
        {showSanitizationPreview && !readonly && (
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
        {isExistingMode &&
          !isDuplicate &&
          sanitizedName &&
          sanitizedName !== variableName && (
            <p className="text-xs text-muted-foreground">
              Rename will apply when you click away.
            </p>
          )}
      </div>

      {/* ── Help Text ────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Help Text</Label>
        <Textarea
          autoGrow
          placeholder="Optional — shown to users as a hint"
          value={displayHelpText}
          onChange={(e) => handleHelpTextChange(e.target.value)}
          disabled={readonly}
          minHeight={48}
          maxHeight={160}
        />
      </div>

      {/* ── Required ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-muted/50 rounded-lg border border-border">
        <Label className="text-sm font-medium cursor-pointer">Required</Label>
        <Switch
          checked={displayRequired}
          onCheckedChange={handleRequiredChange}
          disabled={readonly}
        />
      </div>

      {/* ── Input Type ───────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Input Type</Label>
        <Select
          value={componentType}
          onValueChange={(v) => handleTypeChange(v as VariableComponentType)}
          disabled={readonly}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getComponentTypeOptions().map(({ value, label, description }) => (
              <SelectItem key={value} value={value}>
                <span>{label}</span>
                <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
                  — {description}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Toggle / light-switch labels ─────────────────────────────────── */}
      {meta.requiresToggleValues && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
          <Label className="text-sm font-medium">Toggle Labels</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Off
              </Label>
              <Input
                value={toggleOffLabel}
                onChange={(e) => handleToggleOffLabelChange(e.target.value)}
                placeholder="No"
                disabled={readonly}
                style={{ fontSize: "16px" }}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                On
              </Label>
              <Input
                value={toggleOnLabel}
                onChange={(e) => handleToggleLabelOnChange(e.target.value)}
                placeholder="Yes"
                disabled={readonly}
                style={{ fontSize: "16px" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Options list ─────────────────────────────────────────────────── */}
      {meta.requiresOptions && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
          <Label className="text-sm font-medium">Options</Label>
          {options.length > 0 && (
            <div className="space-y-1.5">
              {options.map((option, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-card rounded border border-border"
                >
                  <span className="text-sm flex-1">{option}</span>
                  {!readonly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!readonly && (
            <div className="flex gap-1.5">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                onBlur={handleOptionBlur}
                placeholder="Type an option and press Enter..."
                className="h-7 text-xs"
                style={{ fontSize: "16px" }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleAddOption}
                disabled={!newOption.trim()}
                title="Add option"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between pt-1.5 border-t border-border">
            <Label className="text-sm cursor-pointer">
              Allow "Other" option
            </Label>
            <Switch
              checked={allowOther}
              onCheckedChange={handleAllowOtherChange}
              disabled={readonly}
            />
          </div>
        </div>
      )}

      {/* ── Number / slider settings ─────────────────────────────────────── */}
      {(meta.requiresMinMax || componentType === "number") && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border">
          <Label className="text-sm font-medium">Number Settings</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Min
              </Label>
              <Input
                type="number"
                value={min ?? ""}
                onChange={(e) =>
                  handleMinChange(
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="None"
                disabled={readonly}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Max
              </Label>
              <Input
                type="number"
                value={max ?? ""}
                onChange={(e) =>
                  handleMaxChange(
                    e.target.value ? parseFloat(e.target.value) : undefined,
                  )
                }
                placeholder="None"
                disabled={readonly}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">
                Step
              </Label>
              <Input
                type="number"
                value={step}
                onChange={(e) =>
                  handleStepChange(parseFloat(e.target.value) || 1)
                }
                placeholder="1"
                disabled={readonly}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Default Value — rendered as the actual component ─────────────── */}
      <div className="space-y-1.5 p-3 bg-muted/30 rounded-lg border border-border">
        <Label className="text-sm font-medium">Default Value</Label>
        <p className="text-xs text-muted-foreground">
          Use the component below to set the default.
        </p>
        {readonly ? (
          <p className="text-sm text-foreground">
            {displayDefaultValue || (
              <span className="text-muted-foreground italic">None</span>
            )}
          </p>
        ) : (
          <VariableInputComponent
            value={displayDefaultValue}
            onChange={handleDefaultValueChange}
            variableName={displayName || "variable"}
            customComponent={previewCustomComponent}
            hideLabel
          />
        )}
      </div>
    </div>
  );
}
