/**
 * ScopeMappingEditor
 * 
 * Reusable component for editing scope mappings
 * Maps scope keys (selection, content, context) to prompt variable names
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScopeMapping } from '../types/core';
import { PromptVariable } from '@/features/prompts/types/core';
import { ArrowRight } from 'lucide-react';

interface ScopeMappingEditorProps {
  availableScopes: string[];
  scopeMappings: ScopeMapping | null;
  variableDefaults: PromptVariable[] | null;
  onMappingChange: (scopeKey: string, variableName: string) => void;
  compact?: boolean;
}

export function ScopeMappingEditor({
  availableScopes,
  scopeMappings,
  variableDefaults,
  onMappingChange,
  compact = false,
}: ScopeMappingEditorProps) {
  
  const availableVariables = variableDefaults?.map(v => v.name) || [];

  if (availableScopes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No scopes configured for this shortcut
      </div>
    );
  }

  if (availableVariables.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        This builtin has no variables to map
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {availableScopes.map(scopeKey => {
        const currentValue = (scopeMappings as any)?.[scopeKey] || '';

        return (
          <div 
            key={scopeKey} 
            className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}
          >
            <Label className={`${compact ? 'w-24 text-xs' : 'w-28 text-sm'} font-medium capitalize`}>
              {scopeKey}
            </Label>
            <ArrowRight className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} text-muted-foreground flex-shrink-0`} />
            <Select
              value={currentValue || '_none_'}
              onValueChange={(value) => {
                onMappingChange(scopeKey, value === '_none_' ? '' : value);
              }}
            >
              <SelectTrigger className={compact ? 'h-8 text-xs' : ''}>
                <SelectValue placeholder="Select variable" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">
                  <span className="text-muted-foreground italic">None</span>
                </SelectItem>
                {availableVariables.map(varName => (
                  <SelectItem key={varName} value={varName}>
                    {varName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

