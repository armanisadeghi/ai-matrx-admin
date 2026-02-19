'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, GripVertical, Pencil, Trash2, Loader2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { useTopicContext } from '../../context/ResearchContext';
import { useResearchApi } from '../../hooks/useResearchApi';
import { useResearchTags } from '../../hooks/useResearchState';
import { createTag, updateTag, deleteTag } from '../../service';
import type { ResearchTag } from '../../types';

export default function TagManager() {
    const { topicId } = useTopicContext();
    const api = useResearchApi();
    const isMobile = useIsMobile();
    const { data: tags, refetch } = useResearchTags(topicId);

    const [createOpen, setCreateOpen] = useState(false);
    const [editTag, setEditTag] = useState<ResearchTag | null>(null);
    const [deleteTag, setDeleteTag] = useState<ResearchTag | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const tagList = (tags as ResearchTag[]) ?? [];

    const openCreate = () => { setName(''); setDescription(''); setEditTag(null); setCreateOpen(true); };
    const openEdit = (tag: ResearchTag) => { setName(tag.name); setDescription(tag.description || ''); setEditTag(tag); setCreateOpen(true); };

    const handleSave = useCallback(async () => {
        if (!name.trim()) return;
        setSaving(true);
        try {
            if (editTag) {
                await updateTag(editTag.id, { name, description: description || null });
            } else {
                await createTag(topicId, { name, description: description || null });
            }
            setCreateOpen(false);
            refetch();
        } finally {
            setSaving(false);
        }
    }, [topicId, editTag, name, description, refetch]);

    const handleDelete = useCallback(async () => {
        if (!deleteTag) return;
        await deleteTag(deleteTag.id);
        setDeleteTag(null);
        refetch();
    }, [deleteTag, refetch]);

    const handleConsolidate = useCallback(async (tagId: string) => {
        await api.consolidateTag(topicId, tagId);
        refetch();
    }, [api, topicId, refetch]);

    const formContent = (
        <div className="space-y-4 p-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tag name..."
                    className="text-base"
                    style={{ fontSize: '16px' }}
                    autoFocus
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Optional description..."
                    rows={3}
                    className="text-base resize-none"
                    style={{ fontSize: '16px' }}
                />
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={!name.trim() || saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editTag ? 'Update' : 'Create'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Tags</h1>
                <Button size="sm" onClick={openCreate} className="gap-2 min-h-[44px] sm:min-h-0">
                    <Plus className="h-4 w-4" />
                    Add Tag
                </Button>
            </div>

            {tagList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Layers className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No tags yet. Create tags to categorize your sources.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {tagList.map(tag => (
                        <div key={tag.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 sm:p-4 group">
                            <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab hidden sm:block" />
                            <div className="flex-1 min-w-0">
                                <Link
                                    href={`/p/research/topics/${topicId}/tags/${tag.id}`}
                                    className="font-medium text-sm hover:text-primary transition-colors"
                                >
                                    {tag.name}
                                </Link>
                                {tag.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tag.description}</p>
                                )}
                            </div>
                            {tag.source_count != null && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                    {tag.source_count} sources
                                </span>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleConsolidate(tag.id)}
                                >
                                    <Layers className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEdit(tag)}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => setDeleteTag(tag)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isMobile ? (
                <Drawer open={createOpen} onOpenChange={setCreateOpen}>
                    <DrawerContent className="max-h-[75dvh]">
                        <DrawerTitle className="px-4 pt-4 text-base font-semibold">
                            {editTag ? 'Edit Tag' : 'Create Tag'}
                        </DrawerTitle>
                        <div className="pb-safe">
                            {formContent}
                        </div>
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>{editTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
                        </DialogHeader>
                        {formContent}
                    </DialogContent>
                </Dialog>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTag} onOpenChange={(open) => !open && setDeleteTag(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &ldquo;{deleteTag?.name}&rdquo;? This action cannot be undone.
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
