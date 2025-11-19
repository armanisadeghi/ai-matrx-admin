'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import IconInputWithValidation from '@/components/official/IconInputWithValidation';
import { CategorySelector } from './CategorySelector';
import { ScopeMappingEditor } from './ScopeMappingEditor';
import type { ShortcutCategory, CreatePromptShortcutInput, PromptBuiltin } from '../types/core';
import type { ResultDisplay } from '../types/execution-modes';
import type { PromptVariable } from '@/features/prompts/types/core';
import type { PlacementType } from '../constants';

interface ShortcutFormFieldsProps {
  formData: CreatePromptShortcutInput;
  onChange: (updates: Partial<CreatePromptShortcutInput>) => void;
  categories: ShortcutCategory[];
  builtins?: PromptBuiltin[];
  builtinVariables?: PromptVariable[];
  compact?: boolean;
  excludedPlacementTypes?: PlacementType[];
  allowedPlacementTypes?: PlacementType[];
  mode?: 'from-builtin' | 'standalone'; // from-builtin = can't change builtin, standalone = full control
  onOpenBuiltinEditor?: (builtinId: string) => void;
  onOpenCreateBuiltin?: () => void;
}

const DEFAULT_AVAILABLE_SCOPES = ['selection', 'content', 'context'];

export function ShortcutFormFields({
  formData,
  onChange,
  categories,
  builtins = [],
  builtinVariables = [],
  compact = false,
  excludedPlacementTypes,
  allowedPlacementTypes,
  mode = 'standalone',
  onOpenBuiltinEditor,
  onOpenCreateBuiltin,
}: ShortcutFormFieldsProps) {
  const containerClass = compact ? 'space-y-3' : 'space-y-4';
  const gridClass = compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-2 gap-4';
  
  const isFromBuiltin = mode === 'from-builtin';
  const selectedBuiltin = builtins.find(b => b.id === formData.prompt_builtin_id);

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
          <CategorySelector
            categories={categories}
            value={formData.category_id}
            onValueChange={(value) => onChange({ category_id: value })}
            compact={compact}
            excludedPlacementTypes={excludedPlacementTypes}
            allowedPlacementTypes={allowedPlacementTypes}
          />
        </div>
      </div>

      {/* Keyboard Shortcut & Sort Order */}
      <div className={gridClass}>
        <div className="space-y-1.5">
          <Label htmlFor="keyboard-shortcut" className="text-sm">
            Keyboard Shortcut
          </Label>
          <Input
            id="keyboard-shortcut"
            value={formData.keyboard_shortcut || ''}
            onChange={(e) => onChange({ keyboard_shortcut: e.target.value || null })}
            placeholder="Ctrl+Shift+K"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort-order" className="text-sm">
            Sort Order
          </Label>
          <Input
            id="sort-order"
            type="number"
            value={formData.sort_order ?? 0}
            onChange={(e) => onChange({ sort_order: parseInt(e.target.value) || 0 })}
            className="h-9"
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

      {/* Active Toggle */}
      <div className="flex items-center justify-between px-3 py-2 border rounded-md bg-muted/30">
        <Label htmlFor="is-active" className="text-sm font-normal cursor-pointer">
          Active (visible in menus)
        </Label>
        <Switch
          id="is-active"
          checked={formData.is_active ?? true}
          onCheckedChange={(checked) => onChange({ is_active: checked })}
        />
      </div>

      <Separator />

      {/* Builtin Management - Conditional based on mode */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Prompt Builtin</Label>
        
        {isFromBuiltin ? (
          // From builtin mode: Show as read-only
          <div className="p-3 bg-muted/30 rounded-lg border">
            <div className="text-sm text-muted-foreground mb-2">
              Linked to this builtin (cannot be changed)
            </div>
            {selectedBuiltin && (
              <div className="space-y-2">
                <div className="font-medium">{selectedBuiltin.name}</div>
                {selectedBuiltin.description && (
                  <div className="text-xs text-muted-foreground">{selectedBuiltin.description}</div>
                )}
                {(selectedBuiltin.variableDefaults || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(selectedBuiltin.variableDefaults || []).map((v: any) => (
                      <Badge key={v.name} variant="secondary" className="text-xs">
                        {v.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          // Standalone mode: Full control
          <div className="space-y-3">
            <Select
              value={formData.prompt_builtin_id || '_none_'}
              onValueChange={(value) => onChange({ prompt_builtin_id: value === '_none_' ? null : value })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select builtin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">
                  <span className="text-muted-foreground italic">No builtin connected</span>
                </SelectItem>
                {builtins.map(builtin => (
                  <SelectItem key={builtin.id} value={builtin.id}>
                    {builtin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Builtin Actions */}
            <div className="flex gap-2">
              {formData.prompt_builtin_id && onOpenBuiltinEditor && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenBuiltinEditor(formData.prompt_builtin_id!)}
                  className="flex-1"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  View/Edit Builtin
                </Button>
              )}
              {onOpenCreateBuiltin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenCreateBuiltin}
                  className={formData.prompt_builtin_id ? 'flex-1' : 'w-full'}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  {formData.prompt_builtin_id ? 'Replace' : 'Create Builtin'}
                </Button>
              )}
            </div>

            {/* Show builtin info if selected */}
            {selectedBuiltin && (
              <div className="p-3 bg-muted/30 rounded-lg border">
                {selectedBuiltin.description && (
                  <div className="text-xs text-muted-foreground mb-2">{selectedBuiltin.description}</div>
                )}
                {(selectedBuiltin.variableDefaults || []).length > 0 ? (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Variables:</div>
                    <div className="flex flex-wrap gap-1">
                      {(selectedBuiltin.variableDefaults || []).map((v: any) => (
                        <Badge key={v.name} variant="secondary" className="text-xs">
                          {v.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-warning">No variables defined</div>
                )}
              </div>
            )}

            {!formData.prompt_builtin_id && (
              <div className="text-xs text-warning p-2 bg-warning/10 rounded border border-warning/20">
                ⚠️ Shortcut won't be functional until a builtin is connected
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scope Mappings */}
      {builtinVariables.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Scope Mappings</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const json = JSON.parse(event.target?.result as string);
                          onChange({ scope_mappings: json });
                        } catch (err) {
                          console.error('Invalid JSON file:', err);
                        }
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
              >
                Import JSON
              </Button>
            </div>
            <ScopeMappingEditor
              availableScopes={formData.available_scopes || DEFAULT_AVAILABLE_SCOPES}
              scopeMappings={formData.scope_mappings || null}
              variableDefaults={builtinVariables}
              onScopesChange={(scopes, mappings) => {
                onChange({
                  available_scopes: scopes,
                  scope_mappings: mappings,
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
          <IconInputWithValidation
            id="shortcut-icon"
            value={formData.icon_name || ''}
            onChange={(value) => onChange({ icon_name: value || null })}
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

