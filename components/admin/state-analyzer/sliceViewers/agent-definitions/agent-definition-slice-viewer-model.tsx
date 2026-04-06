"use client";

import { useEffect, useState } from "react";
import type {
  AgentDefinitionRecord,
  AgentDefinitionSliceState,
} from "@/features/agents/types/agent-definition.types";
import { formatJson } from "@/utils/json/json-cleaner-utility";

export function safeFormat(value: unknown, space = 2): string {
  try {
    return formatJson(value, space);
  } catch {
    return String(value);
  }
}

export function setToSortedArray<T>(s: Set<T>): T[] {
  return [...s].sort((a, b) => String(a).localeCompare(String(b)));
}

export interface AgentDefVarRowData {
  name: string;
  defaultFormatted: string;
  required: string;
  helpText: string;
  customComponentFormatted: string | null;
}

export interface AgentDefToolRowData {
  name: string;
  description: string;
  inputSchemaFormatted: string | null;
}

export function useAgentDefinitionSliceViewModel(
  state: AgentDefinitionSliceState | undefined,
) {
  const agents = state?.agents ?? {};
  const ids = Object.keys(agents).sort();
  const activeAgentId = state?.activeAgentId ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);

  let resolvedId: string | null =
    selectedId !== null && agents[selectedId] ? selectedId : null;
  if (resolvedId === null) {
    if (activeAgentId && agents[activeAgentId]) resolvedId = activeAgentId;
    else resolvedId = ids[0] ?? null;
  }

  const record: AgentDefinitionRecord | undefined = resolvedId
    ? agents[resolvedId]
    : undefined;

  useEffect(() => {
    setMsgIdx(0);
  }, [resolvedId]);

  const messages = record?.messages ?? [];
  const safeMsgIdx = Math.min(msgIdx, Math.max(0, messages.length - 1));
  const selectedMessage =
    messages.length > 0 ? messages[safeMsgIdx] : undefined;

  const variableDefs = record?.variableDefinitions ?? null;
  const varRowData: AgentDefVarRowData[] =
    variableDefs?.map((v) => ({
      name: v.name,
      defaultFormatted: safeFormat(v.defaultValue),
      required:
        v.required === true ? "true" : v.required === false ? "false" : "—",
      helpText: v.helpText ?? "—",
      customComponentFormatted: v.customComponent
        ? safeFormat(v.customComponent)
        : null,
    })) ?? [];

  const slots = record?.contextSlots ?? [];
  const slotRows = slots.map((s) => [
    s.key,
    String(s.type),
    s.label ?? "—",
    s.description ?? "—",
    s.max_inline_chars != null ? String(s.max_inline_chars) : "—",
    s.summary_agent_id ?? "—",
  ]);

  const customTools = record?.customTools ?? [];
  const toolRowData: AgentDefToolRowData[] = customTools.map((t) => ({
    name: t.name,
    description: t.description ?? "—",
    inputSchemaFormatted: t.input_schema ? safeFormat(t.input_schema) : null,
  }));

  return {
    agents,
    ids,
    activeAgentId,
    state,
    selectedId,
    setSelectedId,
    resolvedId,
    record,
    messages,
    msgIdx,
    setMsgIdx,
    safeMsgIdx,
    selectedMessage,
    variableDefs,
    varRowData,
    slotRows,
    toolRowData,
  };
}
