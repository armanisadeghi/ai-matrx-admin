'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FeedbackCategory, CATEGORY_COLORS } from '@/types/feedback.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Tag, GripVertical, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COLOR_OPTIONS = Object.keys(CATEGORY_COLORS) as (keyof typeof CATEGORY_COLORS)[];

function generateSlug(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

interface EditingCategory {
    id: string | null; // null = new
    name: string;
    slug: string;
    description: string;
    color: string;
}

const EMPTY_EDIT: EditingCategory = { id: null, name: '', slug: '', description: '', color: 'gray' };

export default function CategoriesTab() {
    const [categories, setCategories] = useState<FeedbackCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<EditingCategory | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FeedbackCategory | null>(null);

    const loadCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/feedback/categories');
            if (!res.ok) throw new Error('Failed to load');
            const data = await res.json();
            setCategories(data.categories ?? []);
        } catch {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const handleSave = async () => {
        if (!editing) return;
        if (!editing.name.trim()) {
            toast.error('Name is required');
            return;
        }

        setSaving(true);
        try {
            const isNew = editing.id === null;
            const url = isNew
                ? '/api/admin/feedback/categories'
                : `/api/admin/feedback/categories/${editing.id}`;
            const method = isNew ? 'POST' : 'PATCH';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editing.name.trim(),
                    slug: editing.slug || generateSlug(editing.name),
                    description: editing.description.trim() || null,
                    color: editing.color,
                    sort_order: isNew ? categories.length : undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Save failed');
            }

            toast.success(isNew ? 'Category created' : 'Category updated');
            setEditing(null);
            await loadCategories();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/feedback/categories/${deleteTarget.id}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Delete failed');
            }
            toast.success('Category deleted');
            setDeleteTarget(null);
            await loadCategories();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Delete failed');
        }
    };

    const handleToggleActive = async (cat: FeedbackCategory) => {
        try {
            const res = await fetch(`/api/admin/feedback/categories/${cat.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !cat.is_active }),
            });
            if (!res.ok) throw new Error('Update failed');
            await loadCategories();
        } catch {
            toast.error('Failed to update category');
        }
    };

    if (loading) {
        return (
            <Card className="p-8 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading categories...</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Feedback Categories</h2>
                    <p className="text-sm text-muted-foreground">
                        Organize feedback items with categories. Agents and admins can assign categories during triage.
                    </p>
                </div>
                <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => setEditing({ ...EMPTY_EDIT })}
                    disabled={editing !== null}
                >
                    <Plus className="w-4 h-4" />
                    New Category
                </Button>
            </div>

            {/* New Category Form */}
            {editing?.id === null && (
                <CategoryForm
                    editing={editing}
                    onChange={setEditing}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                    saving={saving}
                    isNew
                />
            )}

            {/* Category List */}
            {categories.length === 0 && !editing ? (
                <Card className="p-10 text-center">
                    <Tag className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm font-medium text-muted-foreground">No categories yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Create a category to organize your feedback</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {categories.map((cat) => {
                        const colors = CATEGORY_COLORS[cat.color as keyof typeof CATEGORY_COLORS] ?? CATEGORY_COLORS.gray;
                        const isEditingThis = editing?.id === cat.id;

                        if (isEditingThis) {
                            return (
                                <CategoryForm
                                    key={cat.id}
                                    editing={editing!}
                                    onChange={setEditing}
                                    onSave={handleSave}
                                    onCancel={() => setEditing(null)}
                                    saving={saving}
                                    isNew={false}
                                />
                            );
                        }

                        return (
                            <Card key={cat.id} className={cn('p-3 flex items-center gap-3', !cat.is_active && 'opacity-50')}>
                                <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 cursor-grab" />

                                <Badge className={cn('shrink-0 border text-xs', colors.bg, colors.text, colors.border)}>
                                    {cat.name}
                                </Badge>

                                {cat.description && (
                                    <span className="text-xs text-muted-foreground flex-1 truncate">{cat.description}</span>
                                )}
                                {!cat.description && <div className="flex-1" />}

                                <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">{cat.slug}</span>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground"
                                        onClick={() => handleToggleActive(cat)}
                                    >
                                        {cat.is_active ? 'Active' : 'Inactive'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setEditing({
                                            id: cat.id,
                                            name: cat.name,
                                            slug: cat.slug,
                                            description: cat.description ?? '',
                                            color: cat.color,
                                        })}
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => setDeleteTarget(cat)}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete category?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{deleteTarget?.name}</strong>. This cannot be undone.
                            If any feedback items are assigned to this category, the delete will be blocked — you must reassign them first.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Inline form for create/edit
function CategoryForm({
    editing,
    onChange,
    onSave,
    onCancel,
    saving,
    isNew,
}: {
    editing: EditingCategory;
    onChange: (v: EditingCategory) => void;
    onSave: () => void;
    onCancel: () => void;
    saving: boolean;
    isNew: boolean;
}) {
    const colors = CATEGORY_COLORS[editing.color as keyof typeof CATEGORY_COLORS] ?? CATEGORY_COLORS.gray;

    return (
        <Card className="p-4 border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold">{isNew ? 'New Category' : 'Edit Category'}</span>
                {editing.name && (
                    <Badge className={cn('text-xs border', colors.bg, colors.text, colors.border)}>
                        {editing.name}
                    </Badge>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-medium mb-1 block">Name *</label>
                    <Input
                        value={editing.name}
                        onChange={(e) => onChange({
                            ...editing,
                            name: e.target.value,
                            slug: editing.id === null ? generateSlug(e.target.value) : editing.slug,
                        })}
                        placeholder="e.g. Authentication"
                        className="h-8 text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium mb-1 block">Slug</label>
                    <Input
                        value={editing.slug}
                        onChange={(e) => onChange({ ...editing, slug: e.target.value })}
                        placeholder="auto-generated"
                        className="h-8 text-sm font-mono"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium mb-1 block">Color</label>
                    <Select value={editing.color} onValueChange={(v) => onChange({ ...editing, color: v })}>
                        <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {COLOR_OPTIONS.map((c) => {
                                const cls = CATEGORY_COLORS[c];
                                return (
                                    <SelectItem key={c} value={c}>
                                        <span className={cn('inline-flex items-center gap-1.5')}>
                                            <span className={cn('w-3 h-3 rounded-full inline-block', cls.bg, 'border', cls.border)} />
                                            <span className={cn('capitalize', cls.text)}>{c}</span>
                                        </span>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <label className="text-xs font-medium mb-1 block">Description</label>
                    <Textarea
                        value={editing.description}
                        onChange={(e) => onChange({ ...editing, description: e.target.value })}
                        placeholder="Optional description..."
                        className="min-h-[32px] h-8 text-sm resize-none"
                        rows={1}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-3 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                </Button>
                <Button size="sm" onClick={onSave} disabled={saving || !editing.name.trim()}>
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                    {isNew ? 'Create' : 'Save'}
                </Button>
            </div>
        </Card>
    );
}
