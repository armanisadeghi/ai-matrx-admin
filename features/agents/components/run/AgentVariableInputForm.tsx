"use client";

/**
 * AgentVariableInputForm
 *
 * Shown when an instance has variable definitions.
 * Reads the snapshotted definitions + user values from the instance slices.
 * Writes via setUserVariableValue.
 *
 * Prop: instanceId — the only key needed. No agentId.
 */

import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  selectInstanceVariableDefinitions,
  selectUserVariableValues,
} from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.selectors";
import { setUserVariableValue } from "@/features/agents/redux/execution-system/instance-variable-values/instance-variable-values.slice";
import { selectShowVariablePanel } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.selectors";
import { toggleVariablePanel } from "@/features/agents/redux/execution-system/instance-ui-state/instance-ui-state.slice";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Variable } from "lucide-react";

interface AgentVariableInputFormProps {
  instanceId: string;
}

export function AgentVariableInputForm({
  instanceId,
}: AgentVariableInputFormProps) {
  const dispatch = useAppDispatch();
  const definitions = useAppSelector(
    selectInstanceVariableDefinitions(instanceId),
  );
  const userValues = useAppSelector(selectUserVariableValues(instanceId));
  const showVariables = useAppSelector(selectShowVariablePanel(instanceId));

  if (!definitions || definitions.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors"
        onClick={() => dispatch(toggleVariablePanel(instanceId))}
      >
        <div className="flex items-center gap-2">
          <Variable className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Variables</span>
          <Badge variant="secondary" className="text-[11px]">
            {definitions.length}
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
          {definitions.map((def) => {
            const value = String(
              userValues[def.name] ?? def.defaultValue ?? "",
            );
            const isLong = String(def.defaultValue ?? "").length > 80;

            return (
              <div key={def.name} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`var-${def.name}`}
                    className="text-xs font-medium"
                  >
                    {`{{${def.name}}}`}
                  </Label>
                  {def.required && (
                    <Badge variant="destructive" className="text-[10px] h-4">
                      required
                    </Badge>
                  )}
                </div>
                {def.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {def.helpText}
                  </p>
                )}
                {isLong ? (
                  <Textarea
                    id={`var-${def.name}`}
                    value={value}
                    onChange={(e) =>
                      dispatch(
                        setUserVariableValue({
                          instanceId,
                          name: def.name,
                          value: e.target.value,
                        }),
                      )
                    }
                    className="text-sm min-h-[80px] resize-y"
                    style={{ fontSize: "16px" }}
                  />
                ) : (
                  <Input
                    id={`var-${def.name}`}
                    value={value}
                    onChange={(e) =>
                      dispatch(
                        setUserVariableValue({
                          instanceId,
                          name: def.name,
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
