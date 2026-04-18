"use client";

/**
 * AgentVariablesManager
 *
 * Compact chip row. Edit opens AgentVariableEditorModal which dispatches
 * directly to Redux. Add uses controlled state and dispatches on confirm.
 */

import React, { useState } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectAgentVariableDefinitions,
  selectAgentMessages,
} from "@/features/agents/redux/agent-definition/selectors";
import { setAgentVariableDefinitions } from "@/features/agents/redux/agent-definition/slice";
import type { VariableDefinition } from "@/features/agents/types/agent-definition.types";
import { AgentVariableEditorModal } from "./AgentVariableEditorModal";
import { extractVariableReferences } from "@/features/agents/utils/variable-utils";

interface AgentVariablesManagerProps {
  agentId: string;
}

function isVariableUsedInText(name: string, text: string): boolean {
  return new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`).test(text);
}

export function AgentVariablesManager({ agentId }: AgentVariablesManagerProps) {
  const dispatch = useAppDispatch();
  const rawVariables = useAppSelector((state) =>
    selectAgentVariableDefinitions(state, agentId),
  );
  const messages = useAppSelector((state) =>
    selectAgentMessages(state, agentId),
  );

  const variables: VariableDefinition[] = rawVariables ?? [];

  const allText = (messages ?? [])
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

  const definedNamesSet = new Set(variables.map((v) => v.name));
  const undeclaredNames = extractVariableReferences(allText).filter(
    (n) => !definedNamesSet.has(n),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingVariableName, setEditingVariableName] = useState<
    string | undefined
  >(undefined);
  const [prefillName, setPrefillName] = useState<string | undefined>(undefined);

  const handleAddClick = (prefill?: string) => {
    setModalMode("add");
    setEditingVariableName(undefined);
    setPrefillName(prefill);
    setIsModalOpen(true);
  };

  const handleEditClick = (name: string) => {
    setModalMode("edit");
    setEditingVariableName(name);
    setIsModalOpen(true);
  };

  const handleAdd = (saved: VariableDefinition) => {
    dispatch(
      setAgentVariableDefinitions({
        id: agentId,
        variableDefinitions: [...variables, saved],
      }),
    );
  };

  const handleRemove = (name: string) => {
    dispatch(
      setAgentVariableDefinitions({
        id: agentId,
        variableDefinitions: variables.filter((v) => v.name !== name),
      }),
    );
  };

  const existingNames = variables.map((v) => v.name);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs text-muted-foreground">Variables</Label>

        {variables.map((variable) => {
          const isUsed = isVariableUsedInText(variable.name, allText);
          return (
            <div
              key={variable.name}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium group ${
                isUsed
                  ? "bg-muted text-foreground border border-border"
                  : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              {!isUsed && <AlertCircle className="w-3 h-3 shrink-0" />}
              <span
                className={`cursor-pointer transition-colors ${
                  isUsed
                    ? "hover:text-primary"
                    : "hover:text-amber-900 dark:hover:text-amber-100"
                }`}
                onClick={() => handleEditClick(variable.name)}
                title={
                  isUsed
                    ? "Click to edit"
                    : "Not used in messages — click to edit"
                }
              >
                {variable.name}
              </span>
              <button
                onClick={() => handleRemove(variable.name)}
                title="Remove variable"
                className="hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          onClick={() => handleAddClick()}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {undeclaredNames.length > 0 && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Label className="text-xs text-muted-foreground">
            Undeclared
            <span className="ml-1 text-foreground/60">
              ({undeclaredNames.length})
            </span>
          </Label>
          {undeclaredNames.map((name) => (
            <button
              key={name}
              onClick={() => handleAddClick(name)}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title={`Found in messages — click to define ${name}`}
            >
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{name}</span>
              <Plus className="w-3 h-3 shrink-0 opacity-70" />
            </button>
          ))}
        </div>
      )}

      <AgentVariableEditorModal
        agentId={agentId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        variableName={editingVariableName}
        onAdd={handleAdd}
        existingNames={existingNames}
        mode={modalMode}
        prefillName={prefillName}
      />
    </>
  );
}
