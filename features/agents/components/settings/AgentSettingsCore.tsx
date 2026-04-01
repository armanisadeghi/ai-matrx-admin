"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X, FileJson, AlertCircle, ChevronLeft, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useModelControls,
  ControlDefinition,
} from "@/features/agents/hooks/useModelControls";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentSettings,
  selectAgentModelId,
} from "@/features/agents/redux/agent-definition/selectors";
import {
  setAgentSettings,
  setAgentField,
} from "@/features/agents/redux/agent-definition/slice";
import { selectAllModels } from "@/features/ai-models/redux/modelRegistrySlice";
import { SmartModelSelect } from "@/features/ai-models/components/smart/SmartModelSelect";
import type { LLMParams } from "@/features/agents/types/agent-api-types";

// ── NumberInput ──────────────────────────────────────────────────────────────
interface NumberInputProps {
  value: number;
  onChange: (val: number) => void;
  onSliderChange?: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isInteger?: boolean;
  disabled?: boolean;
  withSlider?: boolean;
}

function NumberInput({
  value,
  onChange,
  onSliderChange,
  min,
  max,
  step = 1,
  isInteger = false,
  disabled = false,
  withSlider = false,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string>(() => String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    if (raw === "" || raw === "-") return;
    const parsed = isInteger ? parseInt(raw, 10) : parseFloat(raw);
    if (!isNaN(parsed)) onChange(parsed);
    else setDraft(String(value));
  };

  if (withSlider) {
    return (
      <div className="flex items-center gap-2">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(val) => {
            onSliderChange?.(val[0]);
            setDraft(String(val[0]));
          }}
          disabled={disabled}
          className="flex-1"
        />
        <Input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onFocus={(e) => e.target.select()}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          disabled={disabled}
          className="w-20 h-7 px-2 text-xs"
        />
      </div>
    );
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      disabled={disabled}
      className="h-7 px-2 text-xs w-full"
    />
  );
}

// ── AgentSettingsCore ────────────────────────────────────────────────────────

interface AgentSettingsCoreProps {
  agentId: string;
}

export function AgentSettingsCore({ agentId }: AgentSettingsCoreProps) {
  const dispatch = useAppDispatch();

  const settings = useAppSelector((state) =>
    selectAgentSettings(state, agentId),
  );
  const modelId = useAppSelector((state) => selectAgentModelId(state, agentId));
  const models = useAppSelector(selectAllModels);

  const { normalizedControls, error } = useModelControls(models, modelId ?? "");

  const currentSettings: LLMParams = settings ?? {};

  // Track enabled settings (keys with non-null values)
  const [enabledSettings, setEnabledSettings] = useState<Set<string>>(() => {
    const enabled = new Set<string>();
    Object.entries(currentSettings).forEach(([key, value]) => {
      if (value !== null && value !== undefined) enabled.add(key);
    });
    return enabled;
  });

  useEffect(() => {
    const enabled = new Set<string>();
    Object.entries(currentSettings).forEach(([key, value]) => {
      if (value !== null && value !== undefined) enabled.add(key);
    });
    setEnabledSettings(enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // JSON flip
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

  const recognizedKeys = useMemo(() => {
    const keys = new Set<string>([
      // ── All LLMParams fields (keep in sync with agent-api-types.ts LLMParams) ──
      "model",
      // Sampling
      "max_output_tokens",
      "temperature",
      "top_p",
      "top_k",
      // Tool calling
      "tool_choice",
      "parallel_tool_calls",
      // Reasoning / thinking
      "reasoning_effort",
      "reasoning_summary",
      "thinking_level",
      "include_thoughts",
      "thinking_budget",
      "clear_thinking",
      "disable_reasoning",
      // Output control
      "response_format",
      "stop_sequences",
      "stream",
      "store",
      "verbosity",
      // Provider-native features
      "internal_web_search",
      "internal_url_context",
      // Image generation
      "size",
      "quality",
      "count",
      // Audio / TTS
      "tts_voice",
      "audio_format",
      // Video / diffusion generation
      "seconds",
      "fps",
      "steps",
      "seed",
      "guidance_scale",
      "output_quality",
      "negative_prompt",
      "output_format",
      "width",
      "height",
      "frame_images",
      "reference_images",
      "image_loras",
      "disable_safety_checker",
    ]);
    if (!normalizedControls) return keys;
    Object.keys(normalizedControls).forEach((key) => {
      if (key !== "rawControls" && key !== "unmappedControls") keys.add(key);
    });
    return keys;
  }, [normalizedControls]);

  const unrecognizedSettings = useMemo(() => {
    return Object.keys(currentSettings).filter(
      (key) =>
        recognizedKeys.has(key) === false &&
        (currentSettings as Record<string, unknown>)[key] !== null &&
        (currentSettings as Record<string, unknown>)[key] !== undefined,
    );
  }, [currentSettings, recognizedKeys]);

  const handleModelChange = (newModelId: string) => {
    dispatch(
      setAgentField({ id: agentId, field: "modelId", value: newModelId }),
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSettingChange = (key: keyof LLMParams, value: any) => {
    if (!enabledSettings.has(key)) {
      setEnabledSettings(new Set(enabledSettings).add(key));
    }

    if (key === "response_format" && typeof value === "string") {
      if (value === "text" || value === "") {
        const { response_format: _r, ...rest } = currentSettings;
        dispatch(
          setAgentSettings({ id: agentId, settings: rest as LLMParams }),
        );
        return;
      }
      dispatch(
        setAgentSettings({
          id: agentId,
          settings: { ...currentSettings, response_format: { type: value } },
        }),
      );
      return;
    }

    if (key === "include_thoughts") {
      if (value === false) {
        dispatch(
          setAgentSettings({
            id: agentId,
            settings: {
              ...currentSettings,
              include_thoughts: false,
              thinking_budget: -1,
            },
          }),
        );
      } else if (value === true && currentSettings.thinking_budget === -1) {
        dispatch(
          setAgentSettings({
            id: agentId,
            settings: {
              ...currentSettings,
              include_thoughts: true,
              thinking_budget:
                (normalizedControls?.thinking_budget?.default as number) ??
                1024,
            },
          }),
        );
      } else {
        dispatch(
          setAgentSettings({
            id: agentId,
            settings: { ...currentSettings, [key]: value },
          }),
        );
      }
      return;
    }

    dispatch(
      setAgentSettings({
        id: agentId,
        settings: { ...currentSettings, [key]: value },
      }),
    );
  };

  // Safe accessor — NormalizedControls has known keys only; cast via unknown to index by string
  const getControl = (key: string): ControlDefinition | undefined =>
    normalizedControls
      ? (normalizedControls as unknown as Record<string, ControlDefinition>)[
          key
        ]
      : undefined;

  const handleToggleSetting = (key: keyof LLMParams, enabled: boolean) => {
    const newEnabled = new Set(enabledSettings);
    if (enabled) {
      newEnabled.add(key);
      const control = getControl(key);
      if (control) {
        let defaultValue: unknown = control.default;
        if (defaultValue === null || defaultValue === undefined) {
          if (control.type === "number" || control.type === "integer") {
            defaultValue = control.min ?? 0;
          } else if (
            control.type === "string" ||
            control.type === "string_array"
          ) {
            defaultValue = "";
          } else if (control.type === "boolean") {
            defaultValue = false;
          } else if (
            control.type === "enum" &&
            control.enum &&
            control.enum.length > 0
          ) {
            defaultValue = control.enum[0];
          } else if (
            control.type === "array" ||
            control.type === "object_array"
          ) {
            defaultValue = [];
          }
        }
        if (key === "response_format" && typeof defaultValue === "string") {
          defaultValue =
            defaultValue === "text" || defaultValue === ""
              ? undefined
              : { type: defaultValue };
        }
        if (defaultValue !== undefined) {
          dispatch(
            setAgentSettings({
              id: agentId,
              settings: { ...currentSettings, [key]: defaultValue },
            }),
          );
        }
      }
    } else {
      newEnabled.delete(key);
      const { [key]: _removed, ...rest } = currentSettings;
      dispatch(setAgentSettings({ id: agentId, settings: rest as LLMParams }));
    }
    setEnabledSettings(newEnabled);
  };

  const handleFlipToJson = () => {
    setJsonText(JSON.stringify(currentSettings, null, 2));
    setJsonError(null);
    setShowJsonEditor(true);
    setTimeout(() => jsonTextareaRef.current?.focus(), 420);
  };

  const handleFlipBack = () => {
    setShowJsonEditor(false);
    setJsonError(null);
  };

  const handleJsonApply = () => {
    try {
      const parsed = JSON.parse(jsonText) as LLMParams;
      setJsonError(null);
      dispatch(setAgentSettings({ id: agentId, settings: parsed }));
      const newEnabled = new Set<string>();
      Object.entries(parsed).forEach(([key, value]) => {
        if (value !== null && value !== undefined) newEnabled.add(key);
      });
      setEnabledSettings(newEnabled);
      setShowJsonEditor(false);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  if (error) {
    return (
      <div className="text-xs text-red-600 dark:text-red-400 px-1 py-2">
        Error loading model controls: {error}
      </div>
    );
  }

  if (!normalizedControls) {
    return (
      <div className="space-y-3 px-1 py-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-36 flex-shrink-0">
            Model
          </Label>
          <SmartModelSelect value={modelId} onValueChange={handleModelChange} />
        </div>
        <p className="text-xs text-muted-foreground">
          Select a model to see available settings.
        </p>
      </div>
    );
  }

  // ── renderControl ──────────────────────────────────────────────────────────

  const renderControlInput = (
    key: keyof LLMParams,
    control: ControlDefinition,
    value: unknown,
    isEnabled: boolean,
  ) => {
    let actualValue =
      value ??
      control.default ??
      (control.type === "number" || control.type === "integer"
        ? (control.min ?? 0)
        : "");

    if (
      key === "response_format" &&
      typeof actualValue === "object" &&
      actualValue !== null &&
      "type" in (actualValue as Record<string, unknown>)
    ) {
      actualValue = (actualValue as Record<string, unknown>).type;
    }

    if (control.type === "enum" && control.enum) {
      return (
        <Select
          value={actualValue as string}
          onValueChange={(val) => handleSettingChange(key, val)}
          disabled={!isEnabled}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="text-xs">
            {control.enum.map((option) => (
              <SelectItem key={option} value={option} className="text-xs py-1">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (control.type === "boolean") {
      const boolId = `bool-agent-${key}`;
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={boolId}
            checked={!!actualValue}
            onCheckedChange={(checked) => handleSettingChange(key, checked)}
            disabled={!isEnabled}
            className="cursor-pointer"
          />
          <Label
            htmlFor={boolId}
            className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer"
          >
            {actualValue ? "Enabled" : "Disabled"}
          </Label>
        </div>
      );
    }

    if (
      (control.type === "number" || control.type === "integer") &&
      control.min !== undefined &&
      control.max !== undefined
    ) {
      const step = control.type === "integer" ? 1 : 0.01;
      return (
        <NumberInput
          value={actualValue as number}
          onChange={(val) => handleSettingChange(key, val)}
          onSliderChange={(val) => handleSettingChange(key, val)}
          min={control.min}
          max={control.max}
          step={step}
          isInteger={control.type === "integer"}
          disabled={!isEnabled}
          withSlider
        />
      );
    }

    if (control.type === "number" || control.type === "integer") {
      return (
        <NumberInput
          value={actualValue as number}
          onChange={(val) => handleSettingChange(key, val)}
          min={control.min}
          max={control.max}
          step={control.type === "integer" ? 1 : 0.01}
          isInteger={control.type === "integer"}
          disabled={!isEnabled}
        />
      );
    }

    if (control.type === "string_array") {
      const arrayValue = Array.isArray(value)
        ? (value as string[]).join("\n")
        : "";
      return (
        <Textarea
          value={arrayValue}
          onChange={(e) =>
            handleSettingChange(
              key,
              e.target.value.split("\n").filter((s) => s.trim()),
            )
          }
          disabled={!isEnabled}
          className="min-h-[60px] text-xs font-mono disabled:opacity-50"
          placeholder="One value per line..."
        />
      );
    }

    return (
      <input
        type="text"
        value={actualValue as string}
        onChange={(e) => handleSettingChange(key, e.target.value)}
        disabled={!isEnabled}
        className="h-7 px-2 text-xs text-gray-900 dark:text-gray-100 bg-textured border border-border rounded disabled:opacity-50 w-full"
      />
    );
  };

  const renderControl = (
    key: keyof LLMParams,
    label: string,
    control: ControlDefinition,
  ) => {
    const isEnabled = enabledSettings.has(key);
    const value = (currentSettings as Record<string, unknown>)[key];
    const checkboxId = `setting-agent-${key}`;

    return (
      <div key={key} className="flex items-center gap-3 mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleToggleSetting(key, !isEnabled)}
        >
          <Checkbox
            id={checkboxId}
            checked={isEnabled}
            onCheckedChange={(checked) =>
              handleToggleSetting(key, checked as boolean)
            }
            className="cursor-pointer"
          />
          <Label
            htmlFor={checkboxId}
            className={`text-xs flex-shrink-0 w-36 cursor-pointer ${
              isEnabled
                ? "text-gray-700 dark:text-gray-300"
                : "text-gray-400 dark:text-gray-600"
            }`}
          >
            {label}
          </Label>
        </div>
        <div
          className={`flex-1 ${!isEnabled ? "opacity-50 pointer-events-none" : ""}`}
        >
          {renderControlInput(key, control, value, isEnabled)}
        </div>
      </div>
    );
  };

  // Setting groups
  const textModelSettings: { key: keyof LLMParams; label: string }[] = [
    { key: "response_format", label: "Response Format" },
    { key: "temperature", label: "Temperature" },
    { key: "max_output_tokens", label: "Max Output Tokens" },
    { key: "top_p", label: "Top P" },
    { key: "top_k", label: "Top K" },
    { key: "thinking_budget", label: "Thinking Budget" },
    { key: "reasoning_effort", label: "Reasoning Effort" },
    { key: "reasoning_summary", label: "Reasoning Summary" },
    { key: "verbosity", label: "Verbosity" },
    { key: "tool_choice", label: "Tool Choice" },
  ];

  const booleanSettings: { key: keyof LLMParams; label: string }[] = [
    { key: "stream", label: "Stream Response" },
    { key: "store", label: "Store Conversation" },
    { key: "parallel_tool_calls", label: "Parallel Tool Calls" },
    { key: "include_thoughts", label: "Include Thoughts" },
    { key: "internal_web_search", label: "Internal Web Search" },
    { key: "internal_url_context", label: "Internal URL Context" },
    { key: "disable_safety_checker", label: "Disable Safety Checker" },
    { key: "clear_thinking", label: "Clear Thinking" },
    { key: "disable_reasoning", label: "Disable Reasoning" },
  ];

  const imageVideoSettings: { key: keyof LLMParams; label: string }[] = [
    { key: "steps", label: "Steps" },
    { key: "guidance_scale", label: "Guidance Scale" },
    { key: "seed", label: "Seed" },
    { key: "width", label: "Width" },
    { key: "height", label: "Height" },
    { key: "fps", label: "FPS" },
    { key: "seconds", label: "Duration (s)" },
    { key: "output_quality", label: "Output Quality" },
    { key: "negative_prompt", label: "Negative Prompt" },
  ];

  return (
    <div className="relative" style={{ perspective: "1200px" }}>
      <div
        className="relative w-full transition-transform duration-500 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: showJsonEditor ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: showJsonEditor ? "420px" : undefined,
        }}
      >
        {/* ── FRONT: settings panel ─────────────────────────── */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          <div className="space-y-1.5">
            {/* Model selector */}
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Label className="text-xs text-muted-foreground flex-shrink-0 w-36">
                Model
              </Label>
              <div className="flex-1">
                <SmartModelSelect
                  value={modelId}
                  onValueChange={handleModelChange}
                />
              </div>
            </div>

            {/* Unrecognized settings warning */}
            {unrecognizedSettings.length > 0 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Unrecognized Settings
                  </div>
                  <div className="text-yellow-700 dark:text-yellow-300 mb-1">
                    Not shown in UI: {unrecognizedSettings.join(", ")}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFlipToJson}
                    className="h-6 text-[10px] px-2"
                  >
                    <FileJson className="h-3 w-3 mr-1" />
                    View in JSON Editor
                  </Button>
                </div>
              </div>
            )}

            {/* Text model settings */}
            {textModelSettings.map(({ key, label }) => {
              const control = getControl(key);
              if (!control) return null;
              return renderControl(key, label, control);
            })}

            {/* Image/Video settings */}
            {imageVideoSettings.some(({ key }) => getControl(key)) && (
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Image/Video Settings
                </div>
                {imageVideoSettings.map(({ key, label }) => {
                  const control = getControl(key);
                  if (!control) return null;
                  return renderControl(key, label, control);
                })}
              </div>
            )}

            {/* Boolean / Feature flags */}
            {booleanSettings.some(({ key }) => getControl(key)) && (
              <div className="border-t pt-2 mt-2">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Feature Flags
                </div>
                {booleanSettings.map(({ key, label }) => {
                  const control = getControl(key);
                  if (!control) return null;
                  return renderControl(key, label, control);
                })}
              </div>
            )}

            {/* JSON editor button */}
            <div className="border-t pt-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleFlipToJson}
                className="w-full h-7 text-xs"
              >
                <FileJson className="h-3.5 w-3.5 mr-1.5" />
                Edit as JSON
              </Button>
            </div>
          </div>
        </div>

        {/* ── BACK: JSON editor ─────────────────────────────── */}
        <div
          className="absolute inset-0 flex flex-col gap-2"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <button
              onClick={handleFlipBack}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to settings
            </button>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <FileJson className="w-3.5 h-3.5 text-primary" />
              Raw JSON
            </span>
          </div>

          <Textarea
            ref={jsonTextareaRef}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
            }}
            className="flex-1 font-mono text-xs resize-none min-h-[320px]"
            placeholder='{"temperature": 0.7, "max_output_tokens": 1024}'
            spellCheck={false}
          />

          {jsonError && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-800 dark:text-red-200">
              <strong>Parse error:</strong> {jsonError}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFlipBack}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleJsonApply}
              className="h-7 text-xs gap-1.5"
            >
              <Save className="w-3 h-3" />
              Apply changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
