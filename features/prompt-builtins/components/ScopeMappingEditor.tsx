/**
 * ScopeMappingEditor
 * 
 * Advanced scope management for shortcuts:
 * 1. Enable/disable standard scopes (selection, content, context)
 * 2. Map enabled scopes to builtin variables
 * 3. Add custom scopes with variable mappings
 */

'use client';

import React, { useState } from 'react';
import { ScopeMapping } from '../types/core';
import { PromptVariable } from '@/features/prompts/types/core';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ScopeMappingEditorProps {
  availableScopes: string[];
  scopeMappings: ScopeMapping | null;
  variableDefaults: PromptVariable[];
  onScopesChange: (scopes: string[], mappings: ScopeMapping) => void;
  compact?: boolean;
}

const STANDARD_SCOPES = ['selection', 'content', 'context'];

export function ScopeMappingEditor({
  availableScopes,
  scopeMappings,
  variableDefaults,
  onScopesChange,
  compact = false,
}: ScopeMappingEditorProps) {
  const [newScopeName, setNewScopeName] = useState('');
  
  const mappings = scopeMappings || {};
  const enabledScopes = availableScopes || [];
  
  // Custom scopes are those not in the standard list
  const customScopes = enabledScopes.filter(s => !STANDARD_SCOPES.includes(s));

  const handleScopeToggle = (scopeName: string, enabled: boolean) => {
    let newScopes: string[];
    let newMappings = { ...mappings };

    if (enabled) {
      // Add scope
      newScopes = [...enabledScopes, scopeName];
    } else {
      // Remove scope
      newScopes = enabledScopes.filter(s => s !== scopeName);
      // Remove mapping too
      delete newMappings[scopeName];
    }

    onScopesChange(newScopes, newMappings);
  };

  const handleMappingChange = (scopeName: string, variableName: string) => {
    const newMappings = { ...mappings };
    
    if (variableName && variableName !== '_none_') {
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
    
    const newScopes = [...enabledScopes, trimmedName];
    onScopesChange(newScopes, mappings);
    setNewScopeName('');
  };

  const handleRemoveCustomScope = (scopeName: string) => {
    const newScopes = enabledScopes.filter(s => s !== scopeName);
    const newMappings = { ...mappings };
    delete newMappings[scopeName];
    onScopesChange(newScopes, newMappings);
  };

  const renderVariableSelect = (scopeName: string, isEnabled: boolean) => {
    const currentVarName = mappings[scopeName] || '';

    return (
      <Select
        value={currentVarName || '_none_'}
        onValueChange={(value) => handleMappingChange(scopeName, value)}
        disabled={!isEnabled || variableDefaults.length === 0}
      >
        <SelectTrigger className={compact ? 'h-7 text-xs' : 'h-8'}>
          <SelectValue>
            {currentVarName ? (
              <code className="font-mono text-xs">
                {`{{${currentVarName}}}`}
              </code>
            ) : (
              <span className="text-muted-foreground">Select variable...</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none_">
            <span className="text-muted-foreground italic">None</span>
          </SelectItem>
          {variableDefaults.map(v => (
            <SelectItem key={v.name} value={v.name}>
              <code className="font-mono text-xs">
                {`{{${v.name}}}`}
              </code>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <div className="space-y-3">
      {/* Standard Scopes */}
      <div className="space-y-2">
        <Label className={compact ? 'text-xs' : 'text-sm'}>Standard Scopes</Label>
        <div className={`border rounded-md ${compact ? 'text-xs' : 'text-sm'}`}>
          {STANDARD_SCOPES.map((scopeName) => {
            const isEnabled = enabledScopes.includes(scopeName);
            
            return (
              <div
                key={scopeName}
                className={`flex items-center gap-3 ${compact ? 'p-2' : 'p-3'} border-b last:border-b-0 ${
                  !isEnabled ? 'bg-muted/30' : ''
                }`}
              >
                {/* Checkbox to enable/disable */}
                <Checkbox
                  id={`scope-${scopeName}`}
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleScopeToggle(scopeName, checked === true)}
                />
                
                {/* Scope name */}
                <Label
                  htmlFor={`scope-${scopeName}`}
                  className={`font-medium capitalize cursor-pointer flex-shrink-0 ${compact ? 'text-xs' : 'text-sm'} ${
                    !isEnabled ? 'text-muted-foreground' : ''
                  }`}
                  style={{ width: '80px' }}
                >
                  {scopeName}
                </Label>

                {/* Variable mapping */}
                <div className="flex-1">
                  {renderVariableSelect(scopeName, isEnabled)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Scopes */}
      {customScopes.length > 0 && (
        <div className="space-y-2">
          <Label className={compact ? 'text-xs' : 'text-sm'}>Custom Scopes</Label>
          <div className={`border rounded-md ${compact ? 'text-xs' : 'text-sm'}`}>
            {customScopes.map((scopeName) => (
              <div
                key={scopeName}
                className={`flex items-center gap-3 ${compact ? 'p-2' : 'p-3'} border-b last:border-b-0`}
              >
                {/* Scope name (read-only) */}
                <div className={`font-medium font-mono flex-shrink-0 ${compact ? 'text-xs' : 'text-sm'}`} style={{ width: '100px' }}>
                  {scopeName}
                </div>

                {/* Variable mapping */}
                <div className="flex-1">
                  {renderVariableSelect(scopeName, true)}
                </div>

                {/* Remove button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCustomScope(scopeName)}
                  className={compact ? 'h-6 w-6 p-0' : 'h-7 w-7 p-0'}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Scope */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Enter custom scope name..."
            value={newScopeName}
            onChange={(e) => setNewScopeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCustomScope();
              }
            }}
            className={compact ? 'h-8 text-xs' : 'h-9'}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCustomScope}
            disabled={!newScopeName.trim()}
            className={compact ? 'h-8' : 'h-9'}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
