'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Plus,
    Trash2,
    Eye,
    EyeOff,
    FileText,
    Folder,
    FolderOpen,
    Search,
    Save,
    X
} from 'lucide-react';
import { 
    ContentBlockDB, 
    CategoryConfigDB, 
    SubcategoryConfigDB,
    CreateContentBlockInput,
    UpdateContentBlockInput,
    CategoryWithSubcategories
} from '@/types/content-blocks-db';
import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';

interface ContentBlocksManagerProps {
    className?: string;
}

// Auto-resizing textarea component
const AutoResizeTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
        value?: string;
        onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
        minHeight?: number;
    }
>(({ className, value, onChange, minHeight = 100, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    
    React.useImperativeHandle(ref, () => textareaRef.current!);
    
    const adjustHeight = React.useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            textarea.style.height = Math.max(minHeight, scrollHeight) + 'px';
        }
    }, [minHeight]);
    
    React.useEffect(() => {
        adjustHeight();
    }, [value, adjustHeight]);
    
    React.useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            adjustHeight();
            // Adjust on window resize
            window.addEventListener('resize', adjustHeight);
            return () => window.removeEventListener('resize', adjustHeight);
        }
    }, [adjustHeight]);
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e);
        // Small delay to ensure the value is updated before adjusting height
        setTimeout(adjustHeight, 0);
    };
    
    return (
        <textarea
            ref={textareaRef}
            className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-hidden ${className}`}
            value={value}
            onChange={handleChange}
            style={{ minHeight: minHeight + 'px' }}
            {...props}
        />
    );
});

AutoResizeTextarea.displayName = 'AutoResizeTextarea';

export function ContentBlocksManager({ className }: ContentBlocksManagerProps) {
    // State
    const [contentBlocks, setContentBlocks] = useState<ContentBlockDB[]>([]);
    const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editData, setEditData] = useState<Partial<ContentBlockDB>>({});
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [createFormData, setCreateFormData] = useState<Partial<CreateContentBlockInput>>({});

    // Load data from Supabase
    const loadData = async () => {
        try {
            setLoading(true);
            const supabase = getBrowserSupabaseClient();

            // Load categories with their subcategories
            const { data: categoryData, error: categoryError } = await supabase
                .from('category_configs')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (categoryError) throw categoryError;

            // Load subcategories
            const { data: subcategoryData, error: subcategoryError } = await supabase
                .from('subcategory_configs')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (subcategoryError) throw subcategoryError;

            // Organize categories with their subcategories
            const categoriesWithSubcategories: CategoryWithSubcategories[] = categoryData.map(category => ({
                ...category,
                subcategories: subcategoryData.filter(subcat => subcat.category_id === category.category_id)
            }));

            setCategories(categoriesWithSubcategories);

            // Load content blocks
            const { data: blockData, error: blockError } = await supabase
                .from('content_blocks')
                .select('*')
                .order('category', { ascending: true })
                .order('subcategory', { ascending: true })
                .order('sort_order', { ascending: true });

            if (blockError) throw blockError;

            setContentBlocks(blockData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filtered and searched content blocks
    const filteredBlocks = contentBlocks.filter(block => {
        const matchesCategory = selectedCategory === 'all' || block.category === selectedCategory;
        const matchesSearch = searchTerm === '' || 
            block.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            block.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            block.block_id.toLowerCase().includes(searchTerm.toLowerCase());
        
        return matchesCategory && matchesSearch;
    });

    // Group blocks by category and subcategory for sidebar
    const groupedBlocks = filteredBlocks.reduce((acc, block) => {
        const categoryKey = block.category;
        const subcategoryKey = block.subcategory || 'none';
        
        if (!acc[categoryKey]) {
            acc[categoryKey] = {};
        }
        if (!acc[categoryKey][subcategoryKey]) {
            acc[categoryKey][subcategoryKey] = [];
        }
        acc[categoryKey][subcategoryKey].push(block);
        
        return acc;
    }, {} as Record<string, Record<string, ContentBlockDB[]>>);

    // Initialize edit data when block is selected
    useEffect(() => {
        const selectedBlock = selectedBlockId ? contentBlocks.find(b => b.id === selectedBlockId) : null;
        if (selectedBlock) {
            setEditData({
                id: selectedBlock.id,
                block_id: selectedBlock.block_id,
                label: selectedBlock.label,
                description: selectedBlock.description,
                icon_name: selectedBlock.icon_name,
                category: selectedBlock.category,
                subcategory: selectedBlock.subcategory,
                template: selectedBlock.template,
                sort_order: selectedBlock.sort_order,
                is_active: selectedBlock.is_active
            });
            setHasUnsavedChanges(false);
        }
    }, [selectedBlockId, contentBlocks]);

    const handleCreateNew = () => {
        setCreateFormData({
            block_id: '',
            label: '',
            description: '',
            icon_name: 'FileText',
            category: 'structure' as const,
            subcategory: undefined,
            template: '',
            sort_order: 0,
            is_active: true
        });
        setIsCreateDialogOpen(true);
    };

    const handleEditChange = (field: string, value: any) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedBlockId || !editData.id) return;

        try {
            const supabase = getBrowserSupabaseClient();
            const { error } = await supabase
                .from('content_blocks')
                .update({
                    label: editData.label,
                    description: editData.description,
                    icon_name: editData.icon_name,
                    category: editData.category,
                    subcategory: editData.subcategory || null,
                    template: editData.template,
                    sort_order: editData.sort_order,
                    is_active: editData.is_active
                })
                .eq('id', editData.id);

            if (error) throw error;
            
            setHasUnsavedChanges(false);
            loadData(); // Reload data
        } catch (error) {
            console.error('Error saving changes:', error);
        }
    };

    const handleCreateBlock = async () => {
        try {
            const supabase = getBrowserSupabaseClient();
            const { error } = await supabase
                .from('content_blocks')
                .insert([{
                    block_id: createFormData.block_id,
                    label: createFormData.label,
                    description: createFormData.description,
                    icon_name: createFormData.icon_name,
                    category: createFormData.category,
                    subcategory: createFormData.subcategory || null,
                    template: createFormData.template,
                    sort_order: createFormData.sort_order || 0,
                    is_active: createFormData.is_active !== false
                }]);

            if (error) throw error;

            setIsCreateDialogOpen(false);
            loadData(); // Reload data
        } catch (error) {
            console.error('Error creating block:', error);
        }
    };

    const handleDiscardChanges = () => {
        const selectedBlock = selectedBlockId ? contentBlocks.find(b => b.id === selectedBlockId) : null;
        if (selectedBlock) {
            setEditData({
                id: selectedBlock.id,
                block_id: selectedBlock.block_id,
                label: selectedBlock.label,
                description: selectedBlock.description,
                icon_name: selectedBlock.icon_name,
                category: selectedBlock.category,
                subcategory: selectedBlock.subcategory,
                template: selectedBlock.template,
                sort_order: selectedBlock.sort_order,
                is_active: selectedBlock.is_active
            });
            setHasUnsavedChanges(false);
        }
    };

    const handleDeleteBlock = async (block: ContentBlockDB) => {
        if (!confirm(`Are you sure you want to delete "${block.label}"?`)) return;

        try {
            const supabase = getBrowserSupabaseClient();
            const { error } = await supabase
                .from('content_blocks')
                .delete()
                .eq('id', block.id);

            if (error) throw error;
            
            loadData(); // Reload data
        } catch (error) {
            console.error('Error deleting block:', error);
        }
    };

    const handleToggleActive = async (block: ContentBlockDB) => {
        try {
            const supabase = getBrowserSupabaseClient();
            const { error } = await supabase
                .from('content_blocks')
                .update({ is_active: !block.is_active })
                .eq('id', block.id);

            if (error) throw error;
            
            loadData(); // Reload data
        } catch (error) {
            console.error('Error toggling block status:', error);
        }
    };

    const getSubcategoriesForCategory = (categoryId: string) => {
        const category = categories.find(cat => cat.category_id === categoryId);
        return category?.subcategories || [];
    };

    const getCategoryLabel = (categoryId: string) => {
        const category = categories.find(cat => cat.category_id === categoryId);
        return category?.label || categoryId;
    };

    const getSubcategoryLabel = (categoryId: string, subcategoryId: string | null) => {
        if (!subcategoryId) return null;
        const category = categories.find(cat => cat.category_id === categoryId);
        const subcategory = category?.subcategories.find(sub => sub.subcategory_id === subcategoryId);
        return subcategory?.label || subcategoryId;
    };

    const selectedBlock = selectedBlockId ? contentBlocks.find(b => b.id === selectedBlockId) : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-lg text-gray-600 dark:text-gray-400">Loading content blocks...</div>
            </div>
        );
    }

    return (
        <div className={`flex h-full w-full bg-white dark:bg-gray-900 ${className}`}>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Content Blocks
                        </h2>
                        <Button onClick={handleCreateNew} size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                        </Button>
                    </div>
                    
                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search blocks..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    
                    {/* Category Filter */}
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category.category_id} value={category.category_id}>
                                    {category.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Sidebar Content */}
                <ScrollArea className="flex-1">
                    <div className="p-2">
                        {Object.entries(groupedBlocks).map(([categoryId, subcategories]) => (
                            <div key={categoryId} className="mb-4">
                                <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    <Folder className="w-4 h-4" />
                                    {getCategoryLabel(categoryId)}
                                </div>
                                
                                {Object.entries(subcategories).map(([subcategoryId, blocks]) => (
                                    <div key={subcategoryId} className="ml-4 mb-2">
                                        {subcategoryId !== 'none' && (
                                            <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                                <FolderOpen className="w-3 h-3" />
                                                {getSubcategoryLabel(categoryId, subcategoryId)}
                                            </div>
                                        )}
                                        
                                        <div className={subcategoryId !== 'none' ? 'ml-4' : ''}>
                                            {blocks.map(block => (
                                                <div
                                                    key={block.id}
                                                    onClick={() => setSelectedBlockId(block.id)}
                                                    className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors
                                                        ${selectedBlockId === block.id 
                                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                        }`}
                                                >
                                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">
                                                            {block.label}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                            {block.block_id}
                                                        </div>
                                                    </div>
                                                    {!block.is_active && (
                                                        <EyeOff className="w-3 h-3 text-gray-400" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Stats */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                        {filteredBlocks.length} blocks ({contentBlocks.filter(b => b.is_active).length} active)
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {selectedBlock ? (
                    <>
                        {/* Header with Save/Discard buttons */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                        Edit Content Block
                                    </h1>
                                    {hasUnsavedChanges && (
                                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                                            Unsaved Changes
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {hasUnsavedChanges && (
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={handleDiscardChanges}
                                        >
                                            <X className="w-4 h-4 mr-1" />
                                            Discard
                                        </Button>
                                    )}
                                    <Button 
                                        size="sm"
                                        onClick={handleSaveChanges}
                                        disabled={!hasUnsavedChanges}
                                    >
                                        <Save className="w-4 h-4 mr-1" />
                                        Save Changes
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleToggleActive(selectedBlock)}
                                    >
                                        {selectedBlock.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        {selectedBlock.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                    <Button 
                                        variant="destructive" 
                                        size="sm"
                                        onClick={() => handleDeleteBlock(selectedBlock)}
                                    >
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Inline Edit Form */}
                        <div className="flex-1 p-6 space-y-6">
                            {/* Basic Information */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Basic Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="edit-label">Label</Label>
                                            <Input
                                                id="edit-label"
                                                value={editData.label || ''}
                                                onChange={(e) => handleEditChange('label', e.target.value)}
                                                placeholder="Display name"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-block-id">Block ID</Label>
                                            <Input
                                                id="edit-block-id"
                                                value={editData.block_id || ''}
                                                onChange={(e) => handleEditChange('block_id', e.target.value)}
                                                placeholder="unique-block-id"
                                                disabled
                                                className="bg-gray-50 dark:bg-gray-800"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="edit-description">Description</Label>
                                        <AutoResizeTextarea
                                            id="edit-description"
                                            value={editData.description || ''}
                                            onChange={(e) => handleEditChange('description', e.target.value)}
                                            placeholder="Brief description of this block"
                                            minHeight={40}
                                            className="text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label htmlFor="edit-category">Category</Label>
                                            <Select 
                                                value={editData.category || ''} 
                                                onValueChange={(value) => handleEditChange('category', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {categories.map(category => (
                                                        <SelectItem key={category.category_id} value={category.category_id}>
                                                            {category.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-subcategory">Subcategory</Label>
                                            <Select 
                                                value={editData.subcategory || 'none'} 
                                                onValueChange={(value) => handleEditChange('subcategory', value === 'none' ? null : value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select subcategory" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem>
                                                    {editData.category && getSubcategoriesForCategory(editData.category).map(subcat => (
                                                        <SelectItem key={subcat.subcategory_id} value={subcat.subcategory_id}>
                                                            {subcat.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-sort-order">Sort Order</Label>
                                            <Input
                                                id="edit-sort-order"
                                                type="number"
                                                value={editData.sort_order || 0}
                                                onChange={(e) => handleEditChange('sort_order', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="edit-is-active"
                                            checked={editData.is_active !== false}
                                            onCheckedChange={(checked) => handleEditChange('is_active', checked)}
                                        />
                                        <Label htmlFor="edit-is-active">Active (visible in context menus)</Label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Template Content */}
                            <Card className="flex-1 flex flex-col">
                                <CardHeader>
                                    <CardTitle>Template Content</CardTitle>
                                    <CardDescription>
                                        This is the content that will be inserted when users select this block from context menus.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 flex flex-col">
                                    <AutoResizeTextarea
                                        value={editData.template || ''}
                                        onChange={(e) => handleEditChange('template', e.target.value)}
                                        placeholder="Enter the template content that will be inserted..."
                                        className="font-mono text-sm"
                                        minHeight={300}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No Block Selected</h3>
                            <p>Select a content block from the sidebar to view and edit its details.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Content Block</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="create-block-id">Block ID</Label>
                                <Input
                                    id="create-block-id"
                                    value={createFormData.block_id || ''}
                                    onChange={(e) => setCreateFormData({ ...createFormData, block_id: e.target.value })}
                                    placeholder="unique-block-id"
                                />
                            </div>
                            <div>
                                <Label htmlFor="create-label">Label</Label>
                                <Input
                                    id="create-label"
                                    value={createFormData.label || ''}
                                    onChange={(e) => setCreateFormData({ ...createFormData, label: e.target.value })}
                                    placeholder="Display name"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="create-description">Description</Label>
                            <AutoResizeTextarea
                                id="create-description"
                                value={createFormData.description || ''}
                                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                                placeholder="Brief description of this block"
                                minHeight={40}
                                className="text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="create-category">Category</Label>
                                <Select 
                                    value={createFormData.category || ''} 
                                    onValueChange={(value) => setCreateFormData({ ...createFormData, category: value as any, subcategory: undefined })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(category => (
                                            <SelectItem key={category.category_id} value={category.category_id}>
                                                {category.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="create-subcategory">Subcategory</Label>
                                <Select 
                                    value={createFormData.subcategory || 'none'} 
                                    onValueChange={(value) => setCreateFormData({ ...createFormData, subcategory: value === 'none' ? undefined : value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select subcategory" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {createFormData.category && getSubcategoriesForCategory(createFormData.category).map(subcat => (
                                            <SelectItem key={subcat.subcategory_id} value={subcat.subcategory_id}>
                                                {subcat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="create-sort-order">Sort Order</Label>
                                <Input
                                    id="create-sort-order"
                                    type="number"
                                    value={createFormData.sort_order || 0}
                                    onChange={(e) => setCreateFormData({ ...createFormData, sort_order: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="create-template">Template</Label>
                            <AutoResizeTextarea
                                id="create-template"
                                value={createFormData.template || ''}
                                onChange={(e) => setCreateFormData({ ...createFormData, template: e.target.value })}
                                placeholder="Enter the template content that will be inserted..."
                                className="font-mono"
                                minHeight={200}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    checked={createFormData.is_active !== false}
                                    onCheckedChange={(checked) => setCreateFormData({ ...createFormData, is_active: checked as boolean })}
                                />
                                <Label className="text-sm">Active (visible in context menus)</Label>
                            </div>
                            
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateBlock}>
                                    Create
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}