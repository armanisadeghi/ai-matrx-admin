"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getIconComponent } from "@/components/official/icons/IconResolver";
import { AGENT_SCOPES, SCOPE_OPTIONS } from "../constants";
import type { AgentScope } from "../constants";

export interface ShortcutScopePickerProps {
  scope: AgentScope;
  scopeId?: string;
  onScopeChange: (scope: AgentScope, scopeId?: string) => void;
  disabled?: boolean;
  allowGlobal?: boolean;
  className?: string;
}

export function ShortcutScopePicker({
  scope,
  scopeId,
  onScopeChange,
  disabled = false,
  allowGlobal = true,
  className,
}: ShortcutScopePickerProps) {
  const selectedOption =
    SCOPE_OPTIONS.find((opt) => opt.value === scope) ?? SCOPE_OPTIONS[0];
  const SelectedIcon = getIconComponent(selectedOption.icon);

  const visibleOptions = allowGlobal
    ? SCOPE_OPTIONS
    : SCOPE_OPTIONS.filter((o) => o.value !== AGENT_SCOPES.GLOBAL);

  const handleScopeChange = (next: AgentScope) => {
    const option = SCOPE_OPTIONS.find((o) => o.value === next);
    if (!option) return;
    onScopeChange(next, option.requiresId ? (scopeId ?? "") : undefined);
  };

  const handleScopeIdChange = (value: string) => {
    onScopeChange(scope, value);
  };

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <div className="space-y-1.5">
        <Label className="text-sm">Scope</Label>
        <Select
          value={scope}
          onValueChange={(v) => handleScopeChange(v as AgentScope)}
          disabled={disabled}
        >
          <SelectTrigger className="h-9">
            <SelectValue>
              <div className="flex items-center gap-2">
                <SelectedIcon className="h-4 w-4" />
                <span>{selectedOption.label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {visibleOptions.map((option) => {
              const Icon = getIconComponent(option.icon);
              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5" />
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {selectedOption.requiresId && (
        <div className="space-y-1.5">
          <Label className="text-sm">
            {selectedOption.label} ID
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Input
            value={scopeId ?? ""}
            onChange={(e) => handleScopeIdChange(e.target.value)}
            placeholder={`${selectedOption.label.toLowerCase()} UUID`}
            disabled={disabled}
            className="h-9 text-[16px] font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {selectedOption.description}
          </p>
        </div>
      )}
    </div>
  );
}
