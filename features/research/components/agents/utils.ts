import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import type { ContextSlot } from "@/features/agents/types/agent-api-types";

export interface ContractRow {
  name: string;
  type?: string;
  helpText?: string;
  required?: boolean;
}

export interface ComparisonResult {
  /** Variables required by the system agent and present on the candidate. */
  matchedVariables: ContractRow[];
  /** Variables required by the system agent but missing on the candidate. */
  missingVariables: ContractRow[];
  /** Variables on the candidate beyond the contract. Informational only. */
  extraVariables: ContractRow[];
  /** Same shape, but for context slots. */
  matchedSlots: ContractRow[];
  missingSlots: ContractRow[];
  extraSlots: ContractRow[];
  /** True when nothing required is missing. Extras don't fail the check. */
  passing: boolean;
}

function variableToRow(v: VariableDefinition): ContractRow {
  return {
    name: v.name,
    helpText: v.helpText,
    required: v.required,
  };
}

function slotToRow(s: ContextSlot): ContractRow {
  return {
    name: s.key,
    type: s.type,
    helpText: s.description,
  };
}

/**
 * Compares the system agent's declared contract against the candidate's.
 *
 * Rule (per spec): the candidate must declare **at least** every variable name
 * and context slot key the system agent declares. Extras pass — the candidate
 * is free to ask for more, the research pipeline simply won't supply them.
 */
export function compareContracts(
  system: {
    variableDefinitions: VariableDefinition[] | null;
    contextSlots: ContextSlot[];
  },
  candidate: {
    variableDefinitions: VariableDefinition[] | null;
    contextSlots: ContextSlot[];
  },
): ComparisonResult {
  const sysVars = system.variableDefinitions ?? [];
  const candVars = candidate.variableDefinitions ?? [];
  const sysSlots = system.contextSlots ?? [];
  const candSlots = candidate.contextSlots ?? [];

  const candVarNames = new Set(candVars.map((v) => v.name));
  const sysVarNames = new Set(sysVars.map((v) => v.name));
  const matchedVariables: ContractRow[] = [];
  const missingVariables: ContractRow[] = [];
  for (const v of sysVars) {
    if (candVarNames.has(v.name)) matchedVariables.push(variableToRow(v));
    else missingVariables.push(variableToRow(v));
  }
  const extraVariables: ContractRow[] = candVars
    .filter((v) => !sysVarNames.has(v.name))
    .map(variableToRow);

  const candSlotKeys = new Set(candSlots.map((s) => s.key));
  const sysSlotKeys = new Set(sysSlots.map((s) => s.key));
  const matchedSlots: ContractRow[] = [];
  const missingSlots: ContractRow[] = [];
  for (const s of sysSlots) {
    if (candSlotKeys.has(s.key)) matchedSlots.push(slotToRow(s));
    else missingSlots.push(slotToRow(s));
  }
  const extraSlots: ContractRow[] = candSlots
    .filter((s) => !sysSlotKeys.has(s.key))
    .map(slotToRow);

  const passing = missingVariables.length === 0 && missingSlots.length === 0;

  return {
    matchedVariables,
    missingVariables,
    extraVariables,
    matchedSlots,
    missingSlots,
    extraSlots,
    passing,
  };
}

/** Returns just the contract rows for a system agent, for display. */
export function systemContractRows(system: {
  variableDefinitions: VariableDefinition[] | null;
  contextSlots: ContextSlot[];
}): { variables: ContractRow[]; slots: ContractRow[] } {
  return {
    variables: (system.variableDefinitions ?? []).map(variableToRow),
    slots: (system.contextSlots ?? []).map(slotToRow),
  };
}

/**
 * Truncates a UUID for compact display: `2e081af2…6325c6c80f`.
 */
export function shortUuid(id: string): string {
  if (id.length < 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-12)}`;
}
