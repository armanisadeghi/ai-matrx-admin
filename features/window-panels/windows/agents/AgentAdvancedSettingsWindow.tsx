"use client";

/**
 * Advanced settings for one agent — settings that shape how the agent runs but
 * that most authors never need to see. Opened from the Agent Builder header.
 *
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
      height={260}
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
    </WindowPanel>
  );
}
