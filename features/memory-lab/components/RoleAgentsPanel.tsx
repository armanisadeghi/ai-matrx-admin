"use client";

/**
 * Memory Lab — the three roles' agents and their bindings. Each of the chosen agent's declared
 * variables maps to a provision value (default: the value of the same name), saved on the trial as
 * `{role: {variable: "<point key>.<value name>"}}`. With no agent a role still captures its
 * provision, so the page works before any memory agent exists.
 */
import { X } from "lucide-react";

import { AgentListDropdown } from "@ai-matrx/agents/catalog/react";
import { RecordId } from "@ai-matrx/design-system";
import { Button, PropertyRow, Select } from "@ai-matrx/design-system/controls";
import {
  MEMORY_ROLES,
  ROLE_LABEL,
  ROLE_POINTS,
  type LabAgent,
  type MemoryRole,
  type MemoryTrial,
  type TrialBindings,
} from "../types";

const SAME_NAME = "__same__";

function pointShort(point: string): string {
  return point.split(".").pop() ?? point;
}

function RoleRow({
  role,
  trial,
  agent,
  knownValues,
  disabled,
  onAgent,
  onBindings,
}: {
  role: MemoryRole;
  trial: MemoryTrial;
  agent: LabAgent | undefined;
  knownValues: Map<string, string[]>;
  disabled: boolean;
  onAgent: (agentId: string | null) => void;
  onBindings: (bindings: TrialBindings) => void;
}) {
  const agentId = trial.agents[role];
  const map = trial.bindings[role] ?? {};
  const options = [
    { value: SAME_NAME, label: "Same name" },
    ...ROLE_POINTS[role].flatMap((point) =>
      (knownValues.get(point) ?? []).map((name) => ({
        value: `${point}.${name}`,
        label: name,
        meta: pointShort(point),
      })),
    ),
  ];

  const setSource = (variable: string, source: string) => {
    const next = { ...map };
    if (source === SAME_NAME) delete next[variable];
    else next[variable] = source;
    onBindings({ ...trial.bindings, [role]: next });
  };

  return (
    <section className="flex flex-col gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-label w-20 text-foreground">{ROLE_LABEL[role]}</span>
        <AgentListDropdown
          onSelect={(id) => onAgent(id)}
          activeAgentId={agentId ?? undefined}
          label={agentId ? undefined : "Choose agent"}
          includeSystemInAll
        />
        {agentId ? (
          <>
            <RecordId value={agentId} label={agent?.name ?? "Agent"} token="agent" labelled />
            <Button variant="quiet" icon={<X />} aria-label="Clear agent" disabled={disabled} onClick={() => onAgent(null)} />
          </>
        ) : (
          <span className="type-caption text-muted-foreground">No agent yet: captures the provision only</span>
        )}
      </div>
      {agent && agent.variables.length === 0 ? (
        <span className="type-caption text-muted-foreground">This agent declares no variables.</span>
      ) : null}
      {agent && agent.variables.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-3 gap-y-1 pl-20 sm:grid-cols-2">
          {agent.variables.map((variable) => (
            <PropertyRow key={variable} label={variable} layout="inline">
              <Select
                value={map[variable] ?? SAME_NAME}
                options={
                  map[variable] && !options.some((o) => o.value === map[variable])
                    ? [...options, { value: map[variable], label: map[variable] }]
                    : options
                }
                onValueChange={(v) => setSource(variable, v)}
                aria-label={`Value for ${variable}`}
                disabled={disabled}
              />
            </PropertyRow>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function RoleAgentsPanel(props: {
  trial: MemoryTrial;
  agents: Map<string, LabAgent>;
  knownValues: Map<string, string[]>;
  disabled: boolean;
  onAgent: (role: MemoryRole, agentId: string | null) => void;
  onBindings: (bindings: TrialBindings) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      {MEMORY_ROLES.map((role) => {
        const id = props.trial.agents[role];
        return (
          <RoleRow
            key={role}
            role={role}
            trial={props.trial}
            agent={id ? props.agents.get(id) : undefined}
            knownValues={props.knownValues}
            disabled={props.disabled}
            onAgent={(agentId) => props.onAgent(role, agentId)}
            onBindings={props.onBindings}
          />
        );
      })}
    </div>
  );
}
