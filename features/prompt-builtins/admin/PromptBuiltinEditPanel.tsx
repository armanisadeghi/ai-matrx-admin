'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2 } from 'lucide-react';
import IconInputWithValidation from '@/components/official/IconInputWithValidation';
import {
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
} from '../types';
import { PLACEMENT_TYPES, getPlacementTypeMeta } from '../constants';
import { RESULT_DISPLAY_META, type ResultDisplay } from '../types';

interface PromptBuiltinEditPanelProps {
  selectedItem: 
    | { type: 'category'; data: ShortcutCategory }
    | { type: 'shortcut'; data: PromptShortcut & { category?: ShortcutCategory; builtin?: PromptBuiltin } };
  editCategoryData?: Partial<ShortcutCategory>;
  editShortcutData?: Partial<PromptShortcut>;
  categories: ShortcutCategory[];
  builtins: PromptBuiltin[];
  onCategoryChange?: (field: string, value: any) => void;
  onShortcutChange?: (field: string, value: any) => void;
  onOpenBuiltinEditor?: (builtinId: string) => void;
  onOpenSelectPromptModal?: () => void;
  onToast?: (message: { title: string; description: string; variant?: 'default' | 'destructive' }) => void;
}

export function PromptBuiltinEditPanel({
  selectedItem,
  editCategoryData,
  editShortcutData,
  categories,
  builtins,
  onCategoryChange,
  onShortcutChange,
  onOpenBuiltinEditor,
  onOpenSelectPromptModal,
  onToast,
}: PromptBuiltinEditPanelProps) {
  const getCategoryHierarchyLabel = (category: ShortcutCategory): string => {
    if (!category.parent_category_id) {
      return category.label;
    }
    const parent = categories.find(c => c.id === category.parent_category_id);
    if (!parent) {
      return category.label;
    }
    return `${getCategoryHierarchyLabel(parent)} > ${category.label}`;
  };

  if (selectedItem.type === 'category' && editCategoryData && onCategoryChange) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Label</Label>
                <Input
                  value={editCategoryData.label || ''}
                  onChange={(e) => onCategoryChange('label', e.target.value)}
                  placeholder="Category name"
                />
              </div>
              <div>
                <Label>Placement Type</Label>
                <Select
                  value={editCategoryData.placement_type}
                  onValueChange={(value) => onCategoryChange('placement_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLACEMENT_TYPES).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {getPlacementTypeMeta(value).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editCategoryData.description || ''}
                onChange={(e) => onCategoryChange('description', e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="category-icon-edit">Icon Name</Label>
                <IconInputWithValidation
                  id="category-icon-edit"
                  value={editCategoryData.icon_name || ''}
                  onChange={(value) => onCategoryChange('icon_name', value)}
                  placeholder="e.g., Folder"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  value={editCategoryData.color || ''}
                  onChange={(e) => onCategoryChange('color', e.target.value)}
                  placeholder="Color or code (e.g. #3b82f6 or blue)"
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editCategoryData.sort_order || 0}
                  onChange={(e) => onCategoryChange('sort_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <Label>Parent Category</Label>
              <Select
                value={editCategoryData.parent_category_id || 'none'}
                onValueChange={(value) => onCategoryChange('parent_category_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Root Level)</SelectItem>
                  {categories
                    .filter(c => 
                      c.id !== editCategoryData.id && 
                      c.placement_type === editCategoryData.placement_type
                    )
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={editCategoryData.is_active}
                onCheckedChange={(checked) => onCategoryChange('is_active', checked)}
              />
              <span className="text-sm">Active (visible in menus)</span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata (JSON)</CardTitle>
            <CardDescription>Optional JSON data for advanced use cases</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={JSON.stringify(editCategoryData.metadata || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onCategoryChange('metadata', parsed);
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder="{}"
              rows={6}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedItem.type === 'shortcut' && editShortcutData && onShortcutChange) {
    return (
      <div className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Label</Label>
                <Input
                  value={editShortcutData.label || ''}
                  onChange={(e) => onShortcutChange('label', e.target.value)}
                  placeholder="Shortcut name"
                />
              </div>
              <div>
                <Label>Keyboard Shortcut</Label>
                <Input
                  value={editShortcutData.keyboard_shortcut || ''}
                  onChange={(e) => onShortcutChange('keyboard_shortcut', e.target.value)}
                  placeholder="Ctrl+Shift+K"
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={editShortcutData.description || ''}
                onChange={(e) => onShortcutChange('description', e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="shortcut-icon-edit">Icon Name</Label>
                <IconInputWithValidation
                  id="shortcut-icon-edit"
                  value={editShortcutData.icon_name || ''}
                  onChange={(value) => onShortcutChange('icon_name', value)}
                  placeholder="e.g., Zap"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={editShortcutData.category_id}
                  onValueChange={(value) => onShortcutChange('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {getCategoryHierarchyLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={editShortcutData.sort_order || 0}
                  onChange={(e) => onShortcutChange('sort_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={editShortcutData.is_active}
                onCheckedChange={(checked) => onShortcutChange('is_active', checked)}
              />
              <span className="text-sm">Active (visible in menus)</span>
            </label>
          </CardContent>
        </Card>

        {/* Execution Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Execution Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {/* Result Display */}
            <div className="flex items-center gap-3">
              <Label className="text-xs flex-shrink-0 w-28">Display</Label>
              <Select
                value={editShortcutData.result_display || 'modal-full'}
                onValueChange={(value: ResultDisplay) => onShortcutChange('result_display', value)}
              >
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  {Object.entries(RESULT_DISPLAY_META).map(([key, meta]) => (
                    <SelectItem key={key} value={key} className="text-xs py-1">
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Divider */}
            <div className="pt-1 border-t border-border" />

            {/* Boolean switches in compact grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {/* Auto Run */}
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Auto run</Label>
                <Switch
                  checked={editShortcutData.auto_run ?? true}
                  onCheckedChange={(checked) => onShortcutChange('auto_run', checked)}
                />
              </div>

              {/* Allow Chat */}
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Allow chat</Label>
                <Switch
                  checked={editShortcutData.allow_chat ?? true}
                  onCheckedChange={(checked) => onShortcutChange('allow_chat', checked)}
                />
              </div>

              {/* Show Variables */}
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Show variables</Label>
                <Switch
                  checked={editShortcutData.show_variables ?? false}
                  onCheckedChange={(checked) => onShortcutChange('show_variables', checked)}
                />
              </div>

              {/* Apply Variables */}
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Apply variables</Label>
                <Switch
                  checked={editShortcutData.apply_variables ?? true}
                  onCheckedChange={(checked) => onShortcutChange('apply_variables', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Scope Keys - Primary Section */}
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle>Scopes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pl-4">
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                {['selection', 'content', 'context'].map(scope => (
                  <label key={scope} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={(editShortcutData.available_scopes || []).includes(scope)}
                      onCheckedChange={(checked) => {
                        const currentScopes = editShortcutData.available_scopes || [];
                        const newScopes = checked
                          ? [...currentScopes, scope]
                          : currentScopes.filter(s => s !== scope);
                        onShortcutChange('available_scopes', newScopes);
                      }}
                    />
                    <span className="font-normal capitalize text-sm">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold">Custom Scope Keys (comma-separated)</Label>
              <Input
                value={(editShortcutData.available_scopes || [])
                  .filter(s => !['selection', 'content', 'context'].includes(s))
                  .join(', ')}
                onChange={(e) => {
                  const customScopes = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  const commonScopes = (editShortcutData.available_scopes || [])
                    .filter(s => ['selection', 'content', 'context'].includes(s));
                  onShortcutChange('available_scopes', [...commonScopes, ...customScopes]);
                }}
                placeholder="custom_key1, custom_key2"
              />
            </div>

            {editShortcutData.available_scopes && editShortcutData.available_scopes.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-sm font-medium mb-2">Current Scopes:</p>
                <div className="flex flex-wrap gap-2">
                  {editShortcutData.available_scopes.map(scope => (
                    <Badge key={scope} variant="outline">{scope}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompt Builtin & Scope Mappings - Independent Bottom Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Prompt Builtin Selection/Creation */}
          <Card>
            <CardHeader>
              <CardTitle>Prompt Builtin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Select
                  value={editShortcutData.prompt_builtin_id || 'none'}
                  onValueChange={(value) => onShortcutChange('prompt_builtin_id', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No prompt connected" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-500">No prompt connected</span>
                    </SelectItem>
                    {builtins.map(builtin => (
                      <SelectItem key={builtin.id} value={builtin.id}>
                        {builtin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {editShortcutData.prompt_builtin_id && onOpenBuiltinEditor && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => onOpenBuiltinEditor(editShortcutData.prompt_builtin_id!)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    View/Edit Builtin
                  </Button>
                )}
              </div>

              {onOpenSelectPromptModal && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onOpenSelectPromptModal}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Builtin Prompt
                </Button>
              )}

              {!editShortcutData.prompt_builtin_id && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  ℹ️ Shortcut won't be functional until a prompt is connected
                </p>
              )}

              {/* Show prompt variables if builtin selected */}
              {editShortcutData.prompt_builtin_id && (() => {
                const selectedBuiltin = builtins.find(b => b.id === editShortcutData.prompt_builtin_id);
                if (selectedBuiltin) {
                  const hasVariables = selectedBuiltin.variableDefaults && selectedBuiltin.variableDefaults.length > 0;
                  
                  if (hasVariables) {
                    return (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                          Variables in "{selectedBuiltin.name}":
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedBuiltin.variableDefaults.map((v: any) => (
                            <Badge key={v.name} variant="secondary" className="text-xs">
                              {v.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md border border-orange-200 dark:border-orange-800">
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                          ⚠️ No Variables Defined
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          This prompt has no variables. You may want to add variables or scope mappings may not be needed.
                        </p>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </CardContent>
          </Card>

          {/* Scope Mappings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scope Mappings</CardTitle>
                  <CardDescription>Map scope keys to prompt variables</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e: any) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const json = JSON.parse(event.target?.result as string);
                            onShortcutChange('scope_mappings', json);
                            onToast?.({ title: 'Success', description: 'Scope mappings imported' });
                          } catch (err) {
                            onToast?.({ title: 'Error', description: 'Invalid JSON file', variant: 'destructive' });
                          }
                        };
                        reader.readAsText(file);
                      }
                    };
                    input.click();
                  }}
                >
                  Upload JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(editShortcutData.available_scopes || []).map((scopeKey) => {
                const selectedBuiltin = builtins.find(b => b.id === editShortcutData.prompt_builtin_id);
                const availableVariables = selectedBuiltin?.variableDefaults?.map((v: any) => v.name) || [];
                const currentValue = (editShortcutData.scope_mappings as any)?.[scopeKey] || '';
                
                return (
                  <div key={scopeKey} className="flex items-center gap-2">
                    <Label className="w-32 text-sm font-medium">{scopeKey}</Label>
                    <span className="text-gray-500">→</span>
                    <Select
                      value={currentValue || '_none_'}
                      onValueChange={(value) => {
                        if (value === '_none_') {
                          // Clear the mapping
                          const newMappings = { ...(editShortcutData.scope_mappings || {}), [scopeKey]: '' };
                          onShortcutChange('scope_mappings', newMappings);
                        } else {
                          const newMappings = { ...(editShortcutData.scope_mappings || {}), [scopeKey]: value };
                          onShortcutChange('scope_mappings', newMappings);
                        }
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select variable" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVariables.length > 0 ? (
                          <>
                            {availableVariables.map((varName: string) => (
                              <SelectItem key={varName} value={varName}>
                                {varName}
                              </SelectItem>
                            ))}
                            <SelectItem value="_none_" className="text-gray-500">
                              Custom
                            </SelectItem>
                          </>
                        ) : (
                          <SelectItem value="_none_">
                            No variables
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <Input
                      value={currentValue}
                      onChange={(e) => {
                        const newMappings = { ...(editShortcutData.scope_mappings || {}), [scopeKey]: e.target.value };
                        onShortcutChange('scope_mappings', newMappings);
                      }}
                      placeholder="or type custom"
                      className="flex-1"
                    />
                  </div>
                );
              })}

              {(!editShortcutData.available_scopes || editShortcutData.available_scopes.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Add available scope keys above first
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}

