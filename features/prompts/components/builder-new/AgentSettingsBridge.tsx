"use client";

/**
 * AgentSettingsBridge
 *
 * Wires agentSettingsSlice into the PromptBuilderRedux workflow.
 *
 * Responsibilities:
 *   1. After promptEditorSlice loads a prompt, push the settings into agentSettingsSlice
 *      (so our new UI has something to render)
 *   2. Whenever agentSettingsSlice effective settings change, sync them back into
 *      promptEditorSlice (so savePrompt still works — it reads state.promptEditor.settings)
 *
 * This is a zero-render bridge component — it returns null.
 * Mount it once inside PromptBuilderRedux after the prompt has loaded.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectPromptId,
  selectPromptSettings,
  selectPromptVariables,
  updateSettings,
} from "@/lib/redux/slices/promptEditorSlice";
import {
  selectEffectiveSettings,
  selectEntry,
} from "@/lib/redux/slices/agent-settings/selectors";
import { loadAgentSettingsDirect } from "@/lib/redux/slices/agent-settings/agentSettingsSlice";
import type { AgentSettings } from "@/lib/redux/slices/agent-settings/types";
import type { PromptSettings } from "@/features/prompts/types/core";

// Stable ID used for this builder session inside agentSettingsSlice.
// We key off the actual prompt ID so it survives tab switches.
export const BUILDER_AGENT_ID_PREFIX = "builder:";

interface AgentSettingsBridgeProps {
  agentId: string;
}

export function AgentSettingsBridge({ agentId }: AgentSettingsBridgeProps) {
  const dispatch = useAppDispatch();

  // Source of truth for the initial load
  const promptId = useAppSelector(selectPromptId);
  const promptSettings = useAppSelector(selectPromptSettings);
  const promptVariables = useAppSelector(selectPromptVariables);

  // Our slice entry (to detect whether it's been initialized)
  const entry = useAppSelector((state) => selectEntry(state, agentId));

  // Effective settings from our slice (what the new UI is currently showing)
  const effectiveSettings = useAppSelector((state) =>
    selectEffectiveSettings(state, agentId),
  );

  // --- Step 1: Initialize agentSettingsSlice from promptEditorSlice data ---
  const initializedForRef = useRef<string | null>(null);

  useEffect(() => {
    // Only initialize once per prompt ID, and only after promptEditorSlice has data
    const key = promptId ?? "__new__";
    if (initializedForRef.current === key) return;

    initializedForRef.current = key;

    dispatch(
      loadAgentSettingsDirect({
        agentId,
        source: "prompt",
        context: "builder",
        data: {
          settings: promptSettings as unknown as AgentSettings,
          variable_defaults: promptVariables.map((v) => ({
            name: v.name,
            defaultValue:
              (v as { defaultValue?: string; default_value?: string })
                .defaultValue ??
              (v as { defaultValue?: string; default_value?: string })
                .default_value ??
              "",
            helpText:
              (v as { helpText?: string; help_text?: string }).helpText ??
              (v as { helpText?: string; help_text?: string }).help_text,
            required: (v as { required?: boolean }).required,
          })),
        },
      }),
    );
  }, [dispatch, agentId, promptId, promptSettings, promptVariables]);

  // --- Step 2: Sync effective settings back to promptEditorSlice on every change ---
  // We skip the very first render to avoid a spurious isDirty=true on load.
  const isFirstSyncRef = useRef(true);
  const prevEffectiveRef = useRef<string>("");

  useEffect(() => {
    if (!entry) return; // Not initialized yet

    const serialized = JSON.stringify(effectiveSettings);
    if (serialized === prevEffectiveRef.current) return;
    prevEffectiveRef.current = serialized;

    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }

    // Push into promptEditorSlice so savePrompt still works
    dispatch(
      updateSettings(effectiveSettings as unknown as Partial<PromptSettings>),
    );
  }, [dispatch, effectiveSettings, entry]);

  return null;
}
