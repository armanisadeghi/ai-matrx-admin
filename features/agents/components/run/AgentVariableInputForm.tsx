"use client";

/**
 * AgentVariableInputForm
 *
 * Shown when a run instance has variable definitions.
 * Reads variable defaults + current values from agentExecution slice.
 * Writes via updateVariableValue action.
 */

import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectVariableDefaults,
  selectVariableValues,
  selectShowVariables,
} from "@/features/agents/redux/agent-execution/selectors";
import {
  updateVariableValue,
  setShowVariables,
} from "@/features/agents/redux/agent-execution/slice";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Variable } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentVariableInputFormProps {
  runId: string;
}

export function AgentVariableInputForm({ runId }: AgentVariableInputFormProps) {
  const dispatch = useAppDispatch();
  const variables = useAppSelector((state) =>
    selectVariableDefaults(state, runId),
  );
  const values = useAppSelector((state) => selectVariableValues(state, runId));
  const showVariables = useAppSelector((state) =>
    selectShowVariables(state, runId),
  );

  if (!variables || variables.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors"
        onClick={() =>
          dispatch(setShowVariables({ runId, show: !showVariables }))
        }
      >
        <div className="flex items-center gap-2">
          <Variable className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Variables</span>
          <Badge variant="secondary" className="text-[11px]">
            {variables.length}
          </Badge>
        </div>
        {showVariables ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {showVariables && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {variables.map((v) => {
            const value = values[v.name] ?? String(v.defaultValue ?? "");
            const isLong = String(v.defaultValue ?? "").length > 80;

            return (
              <div key={v.name} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`var-${v.name}`}
                    className="text-xs font-medium"
                  >
                    {`{{${v.name}}}`}
                  </Label>
                  {v.required && (
                    <Badge variant="destructive" className="text-[10px] h-4">
                      required
                    </Badge>
                  )}
                </div>
                {v.helpText && (
                  <p className="text-xs text-muted-foreground">{v.helpText}</p>
                )}
                {isLong ? (
                  <Textarea
                    id={`var-${v.name}`}
                    value={value}
                    onChange={(e) =>
                      dispatch(
                        updateVariableValue({
                          runId,
                          name: v.name,
                          value: e.target.value,
                        }),
                      )
                    }
                    className="text-sm min-h-[80px] resize-y"
                    style={{ fontSize: "16px" }}
                  />
                ) : (
                  <Input
                    id={`var-${v.name}`}
                    value={value}
                    onChange={(e) =>
                      dispatch(
                        updateVariableValue({
                          runId,
                          name: v.name,
                          value: e.target.value,
                        }),
                      )
                    }
                    className="text-sm"
                    style={{ fontSize: "16px" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
