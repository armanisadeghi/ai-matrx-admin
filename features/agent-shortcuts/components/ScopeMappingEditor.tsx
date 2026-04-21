"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { DEFAULT_AVAILABLE_SCOPES, SCOPE_LEVELS } from "../constants";

export interface AgentVariableDefinition {
  name: string;
  default_value?: unknown;
  description?: string | null;
}

export interface ScopeMappingEditorProps {
  availableScopes: string[];
  scopeMappings: Record<string, string> | null;
  variableDefinitions: AgentVariableDefinition[];
  onScopesChange: (
    scopes: string[],
    mappings: Record<string, string>,
  ) => void;
  compact?: boolean;
}

const STANDARD_SCOPES: string[] = [
  SCOPE_LEVELS.SELECTION,
  SCOPE_LEVELS.CONTENT,
  SCOPE_LEVELS.CONTEXT,
];

export function ScopeMappingEditor({
  availableScopes,
  scopeMappings,
  variableDefinitions,
  onScopesChange,
  compact = false,
}: ScopeMappingEditorProps) {
  const [newScopeName, setNewScopeName] = useState("");

  const mappings = scopeMappings ?? {};
  const enabledScopes =
    availableScopes.length > 0 ? availableScopes : DEFAULT_AVAILABLE_SCOPES;
  const customScopes = enabledScopes.filter(
    (s) => !STANDARD_SCOPES.includes(s),
  );

  const handleScopeToggle = (scopeName: string, enabled: boolean) => {
    let newScopes: string[];
    const newMappings = { ...mappings };

    if (enabled) {
      newScopes = [...enabledScopes, scopeName];
    } else {
      newScopes = enabledScopes.filter((s) => s !== scopeName);
      delete newMappings[scopeName];
    }

    onScopesChange(newScopes, newMappings);
  };

  const handleMappingChange = (scopeName: string, variableName: string) => {
    const newMappings = { ...mappings };
    if (variableName && variableName !== "_none_") {
      newMappings[scopeName] = variableName;
    } else {
      delete newMappings[scopeName];
    }
    onScopesChange(enabledScopes, newMappings);
  };

  const handleAddCustomScope = () => {
    const trimmedName = newScopeName.trim().toLowerCase();
    if (!trimmedName) return;
    if (enabledScopes.includes(trimmedName)) return;
    onScopesChange([...enabledScopes, trimmedName], mappings);
    setNewScopeName("");
  };

  const handleRemoveCustomScope = (scopeName: string) => {
    const newScopes = enabledScopes.filter((s) => s !== scopeName);
    const newMappings = { ...mappings };
    delete newMappings[scopeName];
    onScopesChange(newScopes, newMappings);
  };

  const renderVariableSelect = (scopeName: string, isEnabled: boolean) => {
    const currentVarName = mappings[scopeName] ?? "";

    return (
      <Select
        value={currentVarName || "_none_"}
        onValueChange={(value) => handleMappingChange(scopeName, value)}
        disabled={!isEnabled || variableDefinitions.length === 0}
      >
        <SelectTrigger className={compact ? "h-7 text-xs" : "h-8"}>
          <SelectValue>
            {currentVarName ? (
              <code className="font-mono text-xs">{`{{${currentVarName}}}`}</code>
            ) : (
              <span className="text-muted-foreground">Select variable...</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none_">
            <span className="text-muted-foreground italic">None</span>
          </SelectItem>
          {variableDefinitions.map((v) => (
            <SelectItem key={v.name} value={v.name}>
              <code className="font-mono text-xs">{`{{${v.name}}}`}</code>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className={compact ? "text-xs" : "text-sm"}>
          Standard Scopes
        </Label>
        <div
          className={`border border-border rounded-md ${compact ? "text-xs" : "text-sm"}`}
        >
          {STANDARD_SCOPES.map((scopeName) => {
            const isEnabled = enabledScopes.includes(scopeName);
            return (
              <div
                key={scopeName}
                className={`flex items-center gap-3 ${compact ? "p-2" : "p-3"} border-b border-border last:border-b-0 ${
                  !isEnabled ? "bg-muted/30" : ""
                }`}
              >
                <Checkbox
                  id={`scope-${scopeName}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    handleScopeToggle(scopeName, checked === true)
                  }
                />
                <Label
                  htmlFor={`scope-${scopeName}`}
                  className={`font-medium capitalize cursor-pointer flex-shrink-0 ${compact ? "text-xs" : "text-sm"} ${
                    !isEnabled ? "text-muted-foreground" : ""
                  }`}
                  style={{ width: "80px" }}
                >
                  {scopeName}
                </Label>
                <div className="flex-1">
                  {renderVariableSelect(scopeName, isEnabled)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {customScopes.length > 0 && (
        <div className="space-y-2">
          <Label className={compact ? "text-xs" : "text-sm"}>
            Custom Scopes
          </Label>
          <div
            className={`border border-border rounded-md ${compact ? "text-xs" : "text-sm"}`}
          >
            {customScopes.map((scopeName) => (
              <div
                key={scopeName}
                className={`flex items-center gap-3 ${compact ? "p-2" : "p-3"} border-b border-border last:border-b-0`}
              >
                <div
                  className={`font-medium font-mono flex-shrink-0 ${compact ? "text-xs" : "text-sm"}`}
                  style={{ width: "100px" }}
                >
                  {scopeName}
                </div>
                <div className="flex-1">
                  {renderVariableSelect(scopeName, true)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCustomScope(scopeName)}
                  className={compact ? "h-6 w-6 p-0" : "h-7 w-7 p-0"}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Enter custom scope name..."
          value={newScopeName}
          onChange={(e) => setNewScopeName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustomScope();
            }
          }}
          className={compact ? "h-8 text-[16px]" : "h-9 text-[16px]"}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCustomScope}
          disabled={!newScopeName.trim()}
          className={compact ? "h-8" : "h-9"}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}
