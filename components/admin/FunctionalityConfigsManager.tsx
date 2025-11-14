/**
 * Functionality Configs Manager
 * 
 * Admin UI for managing functionality configurations (linking hardcoded functionalities
 * to database categories with display settings like labels, icons, sort order).
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useFunctionalityConfigs } from '@/hooks/useFunctionalityConfigs';
import { useSystemPromptCategories } from '@/hooks/useSystemPromptCategories';
import { getAllFunctionalities } from '@/types/system-prompt-functionalities';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const ICON_OPTIONS = [
  'MessageCircleQuestion', 'RefreshCw', 'FileText', 'Languages', 'PenLine',
  'List', 'Search', 'Wrench', 'Code', 'Sparkles', 'CreditCard',
  'HelpCircle', 'Globe', 'Lightbulb',
];

interface FunctionalityConfigForm {
  id?: string;
  functionality_id: string;
  category_id: string;
  label: string;
  description: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

export function FunctionalityConfigsManager() {
  const { configs, isLoading, error, refetch } = useFunctionalityConfigs({ 
    activeOnly: false, 
    includeCategory: true 
  });
  const { categories } = useSystemPromptCategories({ activeOnly: false });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<FunctionalityConfigForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const allFunctionalities = getAllFunctionalities();
  const configuredFunctionalityIds = new Set(configs.map(c => c.functionality_id));
  const availableFunctionalities = allFunctionalities.filter(
    f => !configuredFunctionalityIds.has(f.id) || f.id === editingConfig?.functionality_id
  );

  const [form, setForm] = useState<FunctionalityConfigForm>({
    functionality_id: '',
    category_id: '',
    label: '',
    description: '',
    icon_name: 'Sparkles',
    sort_order: 1,
    is_active: true,
  });

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setForm({
      id: config.id,
      functionality_id: config.functionality_id,
      category_id: config.category_id,
      label: config.label,
      description: config.description || '',
      icon_name: config.icon_name,
      sort_order: config.sort_order,
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingConfig(null);
    setForm({
      functionality_id: '',
      category_id: categories[0]?.id || '',
      label: '',
      description: '',
      icon_name: 'Sparkles',
      sort_order: configs.length + 1,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleFunctionalityChange = (functionalityId: string) => {
    const func = allFunctionalities.find(f => f.id === functionalityId);
    if (func) {
      setForm({
        ...form,
        functionality_id: functionalityId,
        label: func.name,
        description: func.description,
      });
    }
  };

  const handleSave = async () => {
    if (!form.functionality_id || !form.category_id || !form.label) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      const supabase = createClient();

      if (editingConfig?.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('system_prompt_functionality_configs')
          .update({
            functionality_id: form.functionality_id,
            category_id: form.category_id,
            label: form.label,
            description: form.description,
            icon_name: form.icon_name,
            sort_order: form.sort_order,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingConfig.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('system_prompt_functionality_configs')
          .insert({
            functionality_id: form.functionality_id,
            category_id: form.category_id,
            label: form.label,
            description: form.description,
            icon_name: form.icon_name,
            sort_order: form.sort_order,
            is_active: form.is_active,
          });

        if (insertError) throw insertError;
      }

      await refetch();
      setIsDialogOpen(false);
      setEditingConfig(null);
    } catch (err) {
      console.error('[FunctionalityConfigsManager] Error saving config:', err);
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this functionality config? This cannot be undone.')) return;

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('system_prompt_functionality_configs')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await refetch();
    } catch (err) {
      console.error('[FunctionalityConfigsManager] Error deleting config:', err);
      alert(`Error: ${(err as Error).message}`);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Sparkles;
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Functionality Configs</CardTitle>
          <CardDescription>Error loading configs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Functionality Configs</CardTitle>
            <CardDescription>
              Link hardcoded functionalities to categories with custom display settings
            </CardDescription>
          </div>
          <Button onClick={handleCreate} disabled={availableFunctionalities.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Add Config
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading configs...</p>
        ) : configs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No configs found. Create one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Functionality ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.map((config) => {
                const Icon = getIcon(config.icon_name);
                return (
                  <TableRow key={config.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {config.label}
                      {config.description && (
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {config.functionality_id}
                      </code>
                    </TableCell>
                    <TableCell>
                      {config.category ? (
                        <Badge variant="outline">{config.category.label}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">No category</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Icon className="h-5 w-5" />
                    </TableCell>
                    <TableCell>{config.sort_order}</TableCell>
                    <TableCell>
                      {config.is_active ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Edit Functionality Config' : 'Create Functionality Config'}</DialogTitle>
            <DialogDescription>
              Configure how a hardcoded functionality appears in the AI Tools menu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="functionality">Functionality (Hardcoded)</Label>
              <Select
                value={form.functionality_id}
                onValueChange={handleFunctionalityChange}
                disabled={!!editingConfig}
              >
                <SelectTrigger id="functionality">
                  <SelectValue placeholder="Select a functionality" />
                </SelectTrigger>
                <SelectContent>
                  {availableFunctionalities.map((func) => (
                    <SelectItem key={func.id} value={func.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{func.name}</span>
                        <span className="text-xs text-muted-foreground">{func.id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.functionality_id && (
                <p className="text-xs text-muted-foreground">
                  Required vars: {allFunctionalities.find(f => f.id === form.functionality_id)?.requiredVariables.join(', ') || 'none'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(value) => setForm({ ...form, category_id: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Display Label</Label>
              <Input
                id="label"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Explain Text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explain selected text or concept in simple terms"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select
                  value={form.icon_name}
                  onValueChange={(value) => setForm({ ...form, icon_name: value })}
                >
                  <SelectTrigger id="icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((iconName) => {
                      const Icon = getIcon(iconName);
                      return (
                        <SelectItem key={iconName} value={iconName}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {iconName}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingConfig ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

