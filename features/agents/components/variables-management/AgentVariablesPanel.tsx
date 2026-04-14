"use client";

/**
 * AgentVariablesPanel
 *
 * Two-column variable manager.
 *   Left  — scrollable list of variables + "Add New Variable" slot
 *   Right — AgentVariableEditor
 *             • existing variable: passes agentId + variableName → auto-saves to Redux
 *             • new variable: controlled state here → dispatched on "Add Variable"
 */

import React, { useState } from "react";
import { Plus, Variable, AlertCircle, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentVariableDefinitions,
  selectAgentMessages,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentVariableDefinitions } from "@/features/agents/redux/agent-definition/slice";
import type {
  VariableDefinition,
  VariableCustomComponent,
} from "@/features/agents/types/agent-definition.types";
import { sanitizeVariableName } from "@/features/agents/utils/variable-utils";
import { AgentVariableEditor } from "./AgentVariableEditor";

interface AgentVariablesPanelProps {
  agentId: string;
}

type SelectionState =
  | { kind: "none" }
  | { kind: "existing"; name: string }
  | { kind: "new" };

function isVariableUsedInText(name: string, text: string): boolean {
  return new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`).test(text);
}

function buildAllText(
  messages: ReturnType<typeof selectAgentMessages>,
): string {
  return (messages ?? [])
    .flatMap((m) =>
      (m.content ?? []).flatMap((b) => {
        const block = b as unknown as Record<string, unknown>;
        if (b.type === "text") return [(block.text as string) ?? ""];
        return Object.values(block).filter(
          (v) => typeof v === "string" && v !== b.type,
        ) as string[];
      }),
    )
    .join(" ");
}

export function AgentVariablesPanel({ agentId }: AgentVariablesPanelProps) {
  const dispatch = useAppDispatch();

  const rawVariables = useAppSelector((state) =>
    selectAgentVariableDefinitions(state, agentId),
  );
  const messages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  const variables: VariableDefinition[] = rawVariables ?? [];
  const allText = buildAllText(messages);

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selection, setSelection] = useState<SelectionState>(() =>
    rawVariables && rawVariables.length > 0
      ? { kind: "existing", name: rawVariables[0].name }
      : { kind: "none" },
  );

  // ── New-variable form state (only active when selection.kind === "new") ────
  const [newName, setNewName] = useState("");
  const [newDefaultValue, setNewDefaultValue] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [newHelpText, setNewHelpText] = useState("");
  const [newCustomComponent, setNewCustomComponent] = useState<
    VariableCustomComponent | undefined
  >(undefined);

  const resetNewForm = () => {
    setNewName("");
    setNewDefaultValue("");
    setNewRequired(false);
    setNewHelpText("");
    setNewCustomComponent(undefined);
  };

  const handleStartNew = () => {
    resetNewForm();
    setSelection({ kind: "new" });
  };

  const handleCancelNew = () => {
    resetNewForm();
    setSelection({ kind: "none" });
  };

  // ── Add variable ───────────────────────────────────────────────────────────
  const sanitizedNewName = newName.trim() ? sanitizeVariableName(newName) : "";
  const newNameIsDuplicate =
    !!sanitizedNewName && variables.some((v) => v.name === sanitizedNewName);
  const canAdd = !!sanitizedNewName && !newNameIsDuplicate;

  const handleAdd = () => {
    if (!canAdd) return;
    const saved: VariableDefinition = {
      name: sanitizedNewName,
      defaultValue: newDefaultValue,
      customComponent: newCustomComponent,
      required: newRequired || undefined,
      helpText: newHelpText || undefined,
    };
    dispatch(
      setAgentVariableDefinitions({
        id: agentId,
        variableDefinitions: [...variables, saved],
      }),
    );
    resetNewForm();
    setSelection({ kind: "existing", name: sanitizedNewName });
  };

  // ── Delete variable ────────────────────────────────────────────────────────
  const handleDelete = (name: string) => {
    dispatch(
      setAgentVariableDefinitions({
        id: agentId,
        variableDefinitions: variables.filter((v) => v.name !== name),
      }),
    );
    if (selection.kind === "existing" && selection.name === name) {
      setSelection({ kind: "none" });
    }
  };

  const isEditing = selection.kind !== "none";

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel — variable list ─────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col border-r border-border overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Variables
            {variables.length > 0 && (
              <span className="ml-1.5 text-foreground/60">
                ({variables.length})
              </span>
            )}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-1">
            {variables.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No variables yet
              </p>
            )}

            {variables.map((variable) => {
              const isUsed = isVariableUsedInText(variable.name, allText);
              const isSelected =
                selection.kind === "existing" &&
                selection.name === variable.name;

              return (
                <button
                  key={variable.name}
                  onClick={() =>
                    setSelection({ kind: "existing", name: variable.name })
                  }
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/60 text-foreground",
                  )}
                >
                  <Variable className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-xs font-mono truncate">
                    {variable.name}
                  </span>
                  {!isUsed && (
                    <span title="Not referenced in messages">
                      <AlertCircle className="w-3 h-3 shrink-0 text-amber-500" />
                    </span>
                  )}
                </button>
              );
            })}

            <button
              onClick={handleStartNew}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                selection.kind === "new"
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground",
              )}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Add New Variable</span>
            </button>
          </div>
        </ScrollArea>
      </div>

      {/* ── Right panel — editor ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isEditing ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Variable className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {variables.length === 0
                  ? "No variables defined"
                  : "Select a variable"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {variables.length === 0
                  ? 'Click "Add New Variable" to get started'
                  : "Choose a variable from the list to edit it, or add a new one"}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {selection.kind === "new" ? "New Variable" : selection.name}
                </p>
                {selection.kind === "existing" && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Changes save automatically
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {selection.kind === "existing" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(selection.name)}
                    title="Delete variable"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {selection.kind === "new" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={handleCancelNew}
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Editor */}
            <ScrollArea className="flex-1">
              <div className="px-5 py-4">
                {selection.kind === "existing" ? (
                  // Existing variable — AgentVariableEditor dispatches directly
                  <AgentVariableEditor
                    agentId={agentId}
                    variableName={selection.name}
                    existingNames={variables
                      .filter((v) => v.name !== selection.name)
                      .map((v) => v.name)}
                  />
                ) : (
                  // New variable — controlled state here, dispatched on Add
                  <>
                    <AgentVariableEditor
                      name={newName}
                      defaultValue={newDefaultValue}
                      customComponent={newCustomComponent}
                      required={newRequired}
                      helpText={newHelpText}
                      existingNames={variables.map((v) => v.name)}
                      onNameChange={setNewName}
                      onDefaultValueChange={setNewDefaultValue}
                      onCustomComponentChange={setNewCustomComponent}
                      onRequiredChange={setNewRequired}
                      onHelpTextChange={setNewHelpText}
                    />
                    <div className="mt-4 flex justify-end">
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={handleAdd}
                        disabled={!canAdd}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Variable
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
    </div>
  );
}
