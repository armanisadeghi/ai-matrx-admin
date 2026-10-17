"use client";

/**
 * Advanced settings for one agent — settings that shape how the agent runs but
 * that most authors never need to see. Opened from the Agent Builder header.
 *
 * Model tiers (`model_tiers`): the named models a caller can switch this agent between.
 * Long cache (`settings.extended_prompt_cache`): keeps the agent's stable prompt
 * prefix cached longer. The server maps it per provider (aidream
 * `matrx_ai/config/cache_marks.py`): Claude 1 hour, OpenAI 24 hours on the models
 * that take it, a stated no-op elsewhere. The line under the switch says which,
 * for the agent's current model.
 */

import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAgentModelId,
  selectAgentOfferingPin,
  selectAgentSettings,
} from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { setAgentSettings } from "@/features/agents/redux/agent-builder.slice";
import { useMessageFlagProfile } from "@ai-matrx/chat/agents/message-flags/useMessageFlagProfile";
import { useModelFull } from "@ai-matrx/chat/agents/identity/model-catalog";
import { RowGroup, SettingRow, Switch } from "@ai-matrx/design-system/controls";
import { ModelListDropdown } from "@ai-matrx/agents/models/react";
import { setAgentModelTiers } from "@/features/agents/redux/agent-builder.slice";
import { selectAgentModelTiers } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import type { ModelTiers } from "@ai-matrx/chat/agents/types/agent-definition.types";
import { Plus, X } from "lucide-react";
import { longCacheLine } from "./advancedSettingsText";

interface AgentAdvancedSettingsWindowProps {
  agentId: string;
  onClose: () => void;
}

export default function AgentAdvancedSettingsWindow({
  agentId,
  onClose,
}: AgentAdvancedSettingsWindowProps) {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => selectAgentSettings(s, agentId));
  const modelId = useAppSelector((s) => selectAgentModelId(s, agentId));
  const offeringPin = useAppSelector((s) => selectAgentOfferingPin(s, agentId));
  const profile = useMessageFlagProfile(modelId, offeringPin);
  const model = useModelFull(modelId);

  const tiers = useAppSelector((s) => selectAgentModelTiers(s, agentId));

  const writeTiers = (next: ModelTiers | null) =>
    dispatch(setAgentModelTiers({ id: agentId, modelTiers: next }));
  const tierEntries = Object.entries(tiers?.tiers ?? {});
  const writeTier = (key: string, patch: { modelId?: string; label?: string }, rename?: string) => {
    if (!tiers) return;
    const entries = Object.entries(tiers.tiers ?? {}).map(([k, v]) =>
      k === key ? ([rename ?? k, { ...v, ...patch }] as const) : ([k, v] as const),
    );
    writeTiers({ ...tiers, tiers: Object.fromEntries(entries) });
  };
  const removeTier = (key: string) => {
    if (!tiers) return;
    const rest = { ...(tiers.tiers ?? {}) };
    delete rest[key];
    writeTiers({ ...tiers, tiers: rest });
  };
  const addTier = () => {
    const base = tiers ?? { default: modelId ?? "" };
    let n = Object.keys(base.tiers ?? {}).length + 1;
    while ((base.tiers ?? {})[`tier${n}`]) n += 1;
    writeTiers({
      ...base,
      tiers: { ...(base.tiers ?? {}), [`tier${n}`]: { modelId: modelId ?? base.default } },
    });
  };

  const record = (settings ?? {}) as Record<string, unknown>;
  const longCache = record.extended_prompt_cache === true;

  const setLongCache = (on: boolean) => {
    const next: Record<string, unknown> = { ...record };
    if (on) next.extended_prompt_cache = true;
    else delete next.extended_prompt_cache;
    dispatch(
      setAgentSettings({
        id: agentId,
        settings: next as typeof settings & object,
      }),
    );
  };

  return (
    <WindowPanel
      id="agent-advanced-settings-window"
      overlayId="agentAdvancedSettingsWindow"
      title="Advanced settings"
      onClose={onClose}
      width={440}
      height={420}
      minWidth={360}
      minHeight={200}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-auto p-3"
    >
      <RowGroup title="Prompt cache">
        <SettingRow
          label="Long cache"
          htmlFor="agent-long-cache"
          line={longCacheLine(profile?.wire_format ?? null, model?.name ?? null, !!modelId)}
        >
          <Switch
            id="agent-long-cache"
            aria-label="Long cache"
            checked={longCache}
            onCheckedChange={setLongCache}
          />
        </SettingRow>
      </RowGroup>
      <RowGroup title="Model tiers">
        {tiers ? (
          <>
            <SettingRow label="Default" htmlFor="agent-tier-default">
              <ModelListDropdown
                id="agent-tier-default"
                aria-label="Default model"
                value={tiers.default}
                onValueChange={(id) => writeTiers({ ...tiers, default: id })}
                inputModalities={[]}
                outputModalities={["text"]}
                selectionPurpose="agent"
                modelOnly
              />
            </SettingRow>
            <SettingRow label="Flexible" htmlFor="agent-tier-flexible">
              <Switch
                id="agent-tier-flexible"
                aria-label="Flexible tiers"
                checked={tiers.flexible === true}
                onCheckedChange={(on) => writeTiers({ ...tiers, flexible: on })}
              />
            </SettingRow>
            {tierEntries.map(([key, tier]) => (
              <SettingRow key={key} label={tier.label || key}>
                <div className="flex items-center gap-1">
                  <ModelListDropdown
                    aria-label={`Model for ${tier.label || key}`}
                    value={tier.modelId}
                    onValueChange={(id) => writeTier(key, { modelId: id })}
                    inputModalities={[]}
                    outputModalities={["text"]}
                    selectionPurpose="agent"
                    modelOnly
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${tier.label || key}`}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    onClick={() => removeTier(key)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </SettingRow>
            ))}
            <div className="flex items-center justify-between px-1 pt-1">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={addTier}
              >
                <Plus className="h-3.5 w-3.5" /> Add tier
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => writeTiers(null)}
              >
                Remove tiers
              </button>
            </div>
          </>
        ) : (
          <SettingRow label="Tiers" line="Off">
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={addTier}
            >
              <Plus className="h-3.5 w-3.5" /> Add tier
            </button>
          </SettingRow>
        )}
      </RowGroup>
    </WindowPanel>
  );
}
