"use client";

/**
 * AgentSettingsCore
 *
 * Pure settings content — no Card, no Dialog wrapper.
 * Reads agent settings from Redux via agentId prop.
 * Writes via setAgentSettings / setAgentField.
 *
 * Uses the same useModelControls hook as the prompts builder so the
 * dynamic control rendering is identical — sliders, toggles, enums.
 *
 * Renders in any context: modal, panel, inline section.
 */

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
import { useModelControls } from "@/features/prompts/hooks/useModelControls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LLMParams } from "@/features/agents/types/agent-api-types";

interface AgentSettingsCoreProps {
  agentId: string;
  /** Optional: constrain scroll height. Pass "full" to fill the parent. */
  scrollHeight?: string | "full";
}

export function AgentSettingsCore({
  agentId,
  scrollHeight,
}: AgentSettingsCoreProps) {
  const dispatch = useAppDispatch();

  const settings = useAppSelector((state) =>
    selectAgentSettings(state, agentId),
  );
  const modelId = useAppSelector((state) => selectAgentModelId(state, agentId));
  const models = useAppSelector(selectAllModels);

  const { normalizedControls, selectedModel } = useModelControls(
    models,
    modelId ?? "",
  );

  const handleModelChange = (newModelId: string) => {
    dispatch(
      setAgentField({ id: agentId, field: "modelId", value: newModelId }),
    );
  };

  const handleSettingChange = (key: keyof LLMParams, value: unknown) => {
    if (!settings) return;
    const updated: LLMParams = { ...settings, [key]: value };
    dispatch(setAgentSettings({ id: agentId, settings: updated }));
  };

  const currentSettings = settings ?? ({} as LLMParams);

  const content = (
    <div className="space-y-6 py-1">
      {/* Model selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Model</Label>
        <SmartModelSelect value={modelId} onValueChange={handleModelChange} />
        {selectedModel?.description && (
          <p className="text-xs text-muted-foreground">
            {String(selectedModel.description)}
          </p>
        )}
      </div>

      {normalizedControls && (
        <>
          <Separator />
          <div className="space-y-6">
            {/* Temperature */}
            {normalizedControls.temperature && (
              <SettingSlider
                label="Temperature"
                tooltip="Controls randomness. Lower = more focused, higher = more creative."
                value={
                  currentSettings.temperature ??
                  (normalizedControls.temperature.default as number) ??
                  0.7
                }
                min={normalizedControls.temperature.min ?? 0}
                max={normalizedControls.temperature.max ?? 2}
                step={0.01}
                onChange={(v) => handleSettingChange("temperature", v)}
              />
            )}

            {/* Max output tokens */}
            {(normalizedControls.max_output_tokens ||
              normalizedControls.max_tokens) && (
              <SettingSliderWithInput
                label="Max Output Tokens"
                tooltip="Maximum tokens the model will generate."
                value={
                  currentSettings.max_output_tokens ??
                  ((normalizedControls.max_output_tokens?.default ??
                    normalizedControls.max_tokens?.default ??
                    1024) as number)
                }
                min={
                  normalizedControls.max_output_tokens?.min ??
                  normalizedControls.max_tokens?.min ??
                  1
                }
                max={
                  normalizedControls.max_output_tokens?.max ??
                  normalizedControls.max_tokens?.max ??
                  8192
                }
                step={1}
                onChange={(v) => handleSettingChange("max_output_tokens", v)}
              />
            )}

            {/* Top P */}
            {normalizedControls.top_p && (
              <SettingSlider
                label="Top P"
                tooltip="Nucleus sampling: restricts output to the top P probability mass."
                value={
                  currentSettings.top_p ??
                  (normalizedControls.top_p.default as number) ??
                  1
                }
                min={normalizedControls.top_p.min ?? 0}
                max={normalizedControls.top_p.max ?? 1}
                step={0.01}
                onChange={(v) => handleSettingChange("top_p", v)}
              />
            )}

            {/* Top K */}
            {normalizedControls.top_k && (
              <SettingSlider
                label="Top K"
                tooltip="Limits next token choices to the top K candidates."
                value={
                  currentSettings.top_k ??
                  (normalizedControls.top_k.default as number) ??
                  40
                }
                min={normalizedControls.top_k.min ?? 1}
                max={normalizedControls.top_k.max ?? 100}
                step={1}
                onChange={(v) => handleSettingChange("top_k", v)}
              />
            )}

            {/* Thinking budget */}
            {normalizedControls.thinking_budget && (
              <SettingSliderWithInput
                label="Thinking Budget"
                tooltip="Token budget for extended reasoning (Anthropic thinking models)."
                value={
                  currentSettings.thinking_budget ??
                  (normalizedControls.thinking_budget.default as number) ??
                  1024
                }
                min={normalizedControls.thinking_budget.min ?? 0}
                max={normalizedControls.thinking_budget.max ?? 10000}
                step={256}
                onChange={(v) => handleSettingChange("thinking_budget", v)}
              />
            )}

            {/* Reasoning effort (enum) */}
            {normalizedControls.reasoning_effort?.enum && (
              <div className="space-y-2">
                <Label className="text-sm">Reasoning Effort</Label>
                <Select
                  value={
                    currentSettings.reasoning_effort ??
                    String(
                      normalizedControls.reasoning_effort.default ?? "auto",
                    )
                  }
                  onValueChange={(v) =>
                    handleSettingChange(
                      "reasoning_effort",
                      v as LLMParams["reasoning_effort"],
                    )
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {normalizedControls.reasoning_effort.enum.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Boolean / capability toggles */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Capabilities
              </Label>

              {normalizedControls.stream && (
                <SettingToggle
                  id="agent-stream"
                  label="Stream Response"
                  checked={
                    currentSettings.stream ??
                    (normalizedControls.stream.default as boolean) ??
                    false
                  }
                  onChange={(v) => handleSettingChange("stream", v)}
                />
              )}

              {normalizedControls.include_thoughts && (
                <SettingToggle
                  id="agent-thoughts"
                  label="Include Thoughts"
                  checked={
                    currentSettings.include_thoughts ??
                    (normalizedControls.include_thoughts.default as boolean) ??
                    false
                  }
                  onChange={(v) => handleSettingChange("include_thoughts", v)}
                />
              )}

              {normalizedControls.internal_web_search && (
                <SettingToggle
                  id="agent-web-search"
                  label="Web Search"
                  checked={
                    currentSettings.internal_web_search ??
                    (normalizedControls.internal_web_search
                      .default as boolean) ??
                    false
                  }
                  onChange={(v) =>
                    handleSettingChange("internal_web_search", v)
                  }
                />
              )}

              {normalizedControls.internal_url_context && (
                <SettingToggle
                  id="agent-url-context"
                  label="URL Context"
                  checked={
                    currentSettings.internal_url_context ??
                    (normalizedControls.internal_url_context
                      .default as boolean) ??
                    false
                  }
                  onChange={(v) =>
                    handleSettingChange("internal_url_context", v)
                  }
                />
              )}

              {normalizedControls.parallel_tool_calls && (
                <SettingToggle
                  id="agent-parallel-tools"
                  label="Parallel Tool Calls"
                  checked={
                    currentSettings.parallel_tool_calls ??
                    (normalizedControls.parallel_tool_calls
                      .default as boolean) ??
                    false
                  }
                  onChange={(v) =>
                    handleSettingChange("parallel_tool_calls", v)
                  }
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (scrollHeight) {
    return (
      <ScrollArea
        className={scrollHeight === "full" ? "h-full" : `h-[${scrollHeight}]`}
      >
        <div className="px-1">{content}</div>
      </ScrollArea>
    );
  }

  return content;
}

// ---------------------------------------------------------------------------
// Sub-components — reusable within this file
// ---------------------------------------------------------------------------

interface SettingSliderProps {
  label: string;
  tooltip: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}

function SettingSlider({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  onChange,
}: SettingSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-[200px] text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

interface SettingSliderWithInputProps extends SettingSliderProps {}

function SettingSliderWithInput({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  onChange,
}: SettingSliderWithInputProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">{label}</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="max-w-[200px] text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          className="flex-1"
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v)}
        />
        <Input
          type="number"
          className="w-20 h-7 text-xs text-right"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

interface SettingToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function SettingToggle({ id, label, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={id} className="text-sm cursor-pointer">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
