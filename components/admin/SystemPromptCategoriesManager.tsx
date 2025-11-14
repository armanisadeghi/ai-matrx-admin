/**
 * System Prompt Categories Manager
 * 
 * Admin UI for managing system prompt categories (Text Operations, Code Operations, etc.)
 * with icons, colors, and sort order.
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
import { useSystemPromptCategories } from '@/hooks/useSystemPromptCategories';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const ICON_OPTIONS = [
  'FileText', 'Code', 'Sparkles', 'Wrench', 'LayoutGrid',
  'MessageCircleQuestion', 'Languages', 'PenLine', 'Search',
  'Lightbulb', 'Globe', 'CreditCard', 'HelpCircle',
];

const COLOR_OPTIONS = [
  { label: 'Blue', value: 'blue' },
  { label: 'Purple', value: 'purple' },
  { label: 'Green', value: 'green' },
  { label: 'Orange', value: 'orange' },
  { label: 'Indigo', value: 'indigo' },
  { label: 'Red', value: 'red' },
  { label: 'Pink', value: 'pink' },
  { label: 'Teal', value: 'teal' },
];

interface CategoryForm {
  id?: string;
  name: string;
  description: string;
  icon_name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export function SystemPromptCategoriesManager() {
  const { categories, isLoading, error, refetch } = useSystemPromptCategories({ activeOnly: false });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<CategoryForm>({
    name: '',
    description: '',
    icon_name: 'FileText',
    color: 'blue',
    sort_order: 1,
    is_active: true,
  });

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setForm({
      id: category.id,
      name: category.name,
      description: category.description || '',
      icon_name: category.icon_name,
      color: category.color,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      description: '',
      icon_name: 'FileText',
      color: 'blue',
      sort_order: categories.length + 1,
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      if (editingCategory?.id) {
        // Update existing
        const { error: updateError } = await supabase
          .from('system_prompt_categories')
          .update({
            name: form.name,
            description: form.description,
            icon_name: form.icon_name,
            color: form.color,
            sort_order: form.sort_order,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase
          .from('system_prompt_categories')
          .insert({
            name: form.name,
            description: form.description,
            icon_name: form.icon_name,
            color: form.color,
            sort_order: form.sort_order,
            is_active: form.is_active,
          });

        if (insertError) throw insertError;
      }

      await refetch();
      setIsDialogOpen(false);
      setEditingCategory(null);
    } catch (err) {
      console.error('[SystemPromptCategoriesManager] Error saving category:', err);
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) return;

    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('system_prompt_categories')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await refetch();
    } catch (err) {
      console.error('[SystemPromptCategoriesManager] Error deleting category:', err);
      alert(`Error: ${(err as Error).message}`);
    }
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.FileText;
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Prompt Categories</CardTitle>
          <CardDescription>Error loading categories</CardDescription>
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
            <CardTitle>System Prompt Categories</CardTitle>
            <CardDescription>
              Manage categories for AI Tools (Text Operations, Code Operations, etc.)
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories found. Create one to get started.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Icon</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => {
                const Icon = getIcon(category.icon_name);
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {category.name}
                      {category.description && (
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Icon className="h-5 w-5" style={{ color: category.color }} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.color}</Badge>
                    </TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell>
                      {category.is_active ? (
                        <Badge>Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category.id)}
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
            <DialogDescription>
              Configure the category display settings for AI Tools menu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Text Operations"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="AI tools for explaining, summarizing, and improving text"
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
                <Label htmlFor="color">Color</Label>
                <Select
                  value={form.color}
                  onValueChange={(value) => setForm({ ...form, color: value })}
                >
                  <SelectTrigger id="color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        {color.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="flex items-center space-x-2 pt-7">
                <Switch
                  id="is_active"
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

