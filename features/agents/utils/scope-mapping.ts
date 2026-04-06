/**
 * Scope Mapping Utility
 *
 * Maps UI-provided scope data (selected text, document content, context objects)
 * to agent variables and context entries using a shortcut's scopeMappings.
 *
 * Resolution rule:
 *   - If the target name matches a variable definition → variable
 *   - If the target name matches a context slot → context entry (slotMatched)
 *   - If neither → context entry (ad-hoc)
 *
 * Unmapped scope keys that aren't in scopeMappings fall through as ad-hoc context.
 */

import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import type {
  ContextSlot,
  ContextObjectType,
} from "@/features/agents/types/agent-api-types";
import type { InstanceContextEntry } from "@/features/agents/types/instance.types";

export interface ApplicationScope {
  selection?: string;
  content?: string;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ScopeMappingResult {
  variableValues: Record<string, unknown>;
  contextEntries: InstanceContextEntry[];
}

function inferContextType(value: unknown): ContextObjectType {
  if (typeof value === "string") {
    try {
      new URL(value);
      return "file_url";
    } catch {
      return "text";
    }
  }
  return "json";
}

export function mapScopeToInstance(
  applicationScope: ApplicationScope,
  scopeMappings: Record<string, string> | null,
  variableDefinitions: VariableDefinition[] | null | undefined,
  contextSlots:
    | Array<{
        key: string;
        type?: ContextObjectType;
        label?: string;
      }>
    | null
    | undefined,
): ScopeMappingResult {
  const defs = variableDefinitions ?? [];
  const slots = contextSlots ?? [];
  const variableNames = new Set(defs.map((v) => v.name));
  const slotMap = new Map(slots.map((s) => [s.key, s]));

  const variableValues: Record<string, unknown> = {};
  const contextEntries: InstanceContextEntry[] = [];
  const mappedScopeKeys = new Set<string>();

  if (scopeMappings) {
    for (const [sourceKey, targetName] of Object.entries(scopeMappings)) {
      const value = applicationScope[sourceKey];
      if (value === undefined) continue;

      mappedScopeKeys.add(sourceKey);

      if (variableNames.has(targetName)) {
        variableValues[targetName] = value;
      } else {
        const slot = slotMap.get(targetName);
        contextEntries.push({
          key: targetName,
          value,
          slotMatched: !!slot,
          type: slot?.type ?? inferContextType(value),
          label: slot?.label ?? targetName,
        });
      }
    }
  }

  // Unmapped scope keys fall through as ad-hoc context
  for (const [key, value] of Object.entries(applicationScope)) {
    if (mappedScopeKeys.has(key) || value === undefined) continue;
    // Skip the well-known structural keys if they're empty
    if (key === "context" && typeof value === "object" && value !== null) {
      for (const [ctxKey, ctxVal] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (ctxVal === undefined) continue;
        const slot = slotMap.get(ctxKey);
        contextEntries.push({
          key: ctxKey,
          value: ctxVal,
          slotMatched: !!slot,
          type: slot?.type ?? inferContextType(ctxVal),
          label: slot?.label ?? ctxKey,
        });
      }
      continue;
    }

    const slot = slotMap.get(key);
    contextEntries.push({
      key,
      value,
      slotMatched: !!slot,
      type: slot?.type ?? inferContextType(value),
      label: slot?.label ?? key,
    });
  }

  return { variableValues, contextEntries };
}
