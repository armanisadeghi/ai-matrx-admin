'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { HierarchicalCategorySelector } from './HierarchicalCategorySelector';
import { ScopeMappingEditor } from './ScopeMappingEditor';
import type { ShortcutCategory, CreatePromptShortcutInput } from '../types/core';
import type { ResultDisplay } from '../types/execution-modes';
import type { PromptVariable } from '@/features/prompts/types/core';

interface ShortcutFormFieldsProps {
  formData: CreatePromptShortcutInput;
  onChange: (updates: Partial<CreatePromptShortcutInput>) => void;
  categories: ShortcutCategory[];
  builtinVariables?: PromptVariable[];
  compact?: boolean;
}

const DEFAULT_AVAILABLE_SCOPES = ['selection', 'content', 'context'];

export function ShortcutFormFields({
  formData,
  onChange,
  categories,
  builtinVariables = [],
  compact = false,
}: ShortcutFormFieldsProps) {
  const containerClass = compact ? 'space-y-3' : 'space-y-4';
  const gridClass = compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-4';

  return (
    <div className={containerClass}>
      {/* Label & Category */}
      <div className={gridClass}>
        <div className="space-y-1.5">
          <Label htmlFor="shortcut-label" className="text-sm">
            Label <span className="text-destructive">*</span>
          </Label>
          <Input
            id="shortcut-label"
            value={formData.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Shortcut name"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shortcut-category" className="text-sm">
            Category <span className="text-destructive">*</span>
          </Label>
          <HierarchicalCategorySelector
            categories={categories}
            value={formData.category_id}
            onValueChange={(value) => onChange({ category_id: value })}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="shortcut-description" className="text-sm">
          Description
        </Label>
        <Textarea
          id="shortcut-description"
          value={formData.description || ''}
          onChange={(e) => onChange({ description: e.target.value || null })}
          placeholder="Optional description"
          rows={compact ? 2 : 3}
          className="resize-none"
        />
      </div>

      {/* Scope Mappings */}
      {builtinVariables.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Scope Mappings</Label>
            <ScopeMappingEditor
              availableScopes={formData.available_scopes || DEFAULT_AVAILABLE_SCOPES}
              scopeMappings={formData.scope_mappings || {}}
              variableDefaults={builtinVariables}
              onMappingChange={(scopeKey, variableName) => {
                onChange({
                  scope_mappings: {
                    ...formData.scope_mappings,
                    [scopeKey]: variableName,
                  },
                });
              }}
              compact={compact}
            />
          </div>
        </>
      )}

      <Separator />

      {/* Icon & Display */}
      <div className={gridClass}>
        <div className="space-y-1.5">
          <Label htmlFor="shortcut-icon" className="text-sm">
            Icon Name
          </Label>
          <Input
            id="shortcut-icon"
            value={formData.icon_name || ''}
            onChange={(e) => onChange({ icon_name: e.target.value || null })}
            placeholder="e.g., Sparkles"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="result-display" className="text-sm">
            Result Display
          </Label>
          <Select
            value={formData.result_display || 'modal-full'}
            onValueChange={(value: ResultDisplay) => onChange({ result_display: value })}
          >
            <SelectTrigger id="result-display" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="modal-full">Full Modal</SelectItem>
              <SelectItem value="modal-compact">Compact Modal</SelectItem>
              <SelectItem value="inline">Inline</SelectItem>
              <SelectItem value="sidebar">Sidebar</SelectItem>
              <SelectItem value="flexible-panel">Flexible Panel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Execution Options */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Execution Options</Label>
        <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 gap-3'}`}>
          <div className="flex items-center justify-between px-3 py-2 border rounded-md bg-muted/30">
            <Label htmlFor="auto-run" className="text-xs font-normal cursor-pointer">
              Auto Run
            </Label>
            <Switch
              id="auto-run"
              checked={formData.auto_run ?? true}
              onCheckedChange={(checked) => onChange({ auto_run: checked })}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border rounded-md bg-muted/30">
            <Label htmlFor="allow-chat" className="text-xs font-normal cursor-pointer">
              Allow Chat
            </Label>
            <Switch
              id="allow-chat"
              checked={formData.allow_chat ?? true}
              onCheckedChange={(checked) => onChange({ allow_chat: checked })}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border rounded-md bg-muted/30">
            <Label htmlFor="show-variables" className="text-xs font-normal cursor-pointer">
              Show Variables
            </Label>
            <Switch
              id="show-variables"
              checked={formData.show_variables ?? false}
              onCheckedChange={(checked) => onChange({ show_variables: checked })}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 border rounded-md bg-muted/30">
            <Label htmlFor="apply-variables" className="text-xs font-normal cursor-pointer">
              Apply Variables
            </Label>
            <Switch
              id="apply-variables"
              checked={formData.apply_variables ?? true}
              onCheckedChange={(checked) => onChange({ apply_variables: checked })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

