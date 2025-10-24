'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
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
    X,
    ChevronDown,
    ChevronRight,
    Edit2,
    Settings,
    Check,
    Columns2,
    PanelLeft
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
import EnhancedChatMarkdown from '@/components/mardown-display/chat-markdown/EnhancedChatMarkdown';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';

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
    // Collapsible state management
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
    // Category management
    const [isCategoryManagementOpen, setIsCategoryManagementOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);
    const [newCategoryLabel, setNewCategoryLabel] = useState('');
    const [newSubcategoryData, setNewSubcategoryData] = useState<{ categoryId: string; label: string } | null>(null);
    // Quick create modals for "New..." option
    const [isQuickCreateCategoryOpen, setIsQuickCreateCategoryOpen] = useState(false);
    const [isQuickCreateSubcategoryOpen, setIsQuickCreateSubcategoryOpen] = useState(false);
    const [quickCreateContext, setQuickCreateContext] = useState<'edit' | 'create'>('create');
    const [quickCategoryData, setQuickCategoryData] = useState({ label: '', icon_name: 'Folder', color: '#3b82f6' });
    const [quickSubcategoryData, setQuickSubcategoryData] = useState({ label: '', icon_name: 'FolderOpen', categoryId: '' });
    // Split view toggle for Template Content
    const [showPreview, setShowPreview] = useState(false);

    // Toast notifications
    const { toast } = useToast();

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

    // Collapsible helper functions
    const toggleCategoryExpanded = (categoryId: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
                // Also collapse all subcategories in this category
                setExpandedSubcategories(prevSub => {
                    const newSubSet = new Set(prevSub);
                    Object.keys(groupedBlocks[categoryId] || {}).forEach(subcatId => {
                        if (subcatId !== 'none') {
                            newSubSet.delete(`${categoryId}-${subcatId}`);
                        }
                    });
                    return newSubSet;
                });
            } else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };

    const toggleSubcategoryExpanded = (categoryId: string, subcategoryId: string) => {
        const key = `${categoryId}-${subcategoryId}`;
        setExpandedSubcategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    const isCategoryExpanded = (categoryId: string) => expandedCategories.has(categoryId);
    const isSubcategoryExpanded = (categoryId: string, subcategoryId: string) => 
        expandedSubcategories.has(`${categoryId}-${subcategoryId}`);

    // Category management handlers
    const handleCreateCategory = async (label: string, iconName: string = 'Folder', color: string = '#3b82f6') => {
        if (!label.trim()) return null;
        
        try {
            const supabase = getBrowserSupabaseClient();
            
            // Generate base ID from label
            let baseId = label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
            
            // Ensure we have a valid ID
            if (!baseId) {
                toast({
                    title: "Invalid Name",
                    description: "Please enter a valid category name with letters or numbers.",
                    variant: "destructive"
                });
                return null;
            }
            
            // Check if ID already exists and make it unique if needed
            let categoryId = baseId;
            let counter = 1;
            const existingIds = categories.map(c => c.category_id);
            
            while (existingIds.includes(categoryId)) {
                categoryId = `${baseId}-${counter}`;
                counter++;
            }
            
            const maxSortOrder = Math.max(0, ...categories.map(c => c.sort_order || 0));
            
            const { error } = await supabase
                .from('category_configs')
                .insert([{
                    category_id: categoryId,
                    label: label,
                    icon_name: iconName,
                    color: color,
                    sort_order: maxSortOrder + 1,
                    is_active: true
                }]);

            if (error) {
                console.error('Supabase error details:', error);
                
                let title = "Error Creating Category";
                let description = "";
                
                // Check for specific error types
                if (error.code === '23505') {
                    // Unique constraint violation
                    title = "Duplicate ID";
                    description = `Category ID "${categoryId}" already exists in the database.`;
                } else if (error.code === '23502') {
                    // NOT NULL constraint violation
                    const match = error.message.match(/column "([^"]+)"/);
                    const column = match ? match[1] : 'unknown';
                    title = "Missing Required Field";
                    description = `Database requires field "${column}" but it wasn't provided. This is a bug - please report it.`;
                } else {
                    // Generic error
                    description = `${error.message}\n\nError Code: ${error.code || 'unknown'}`;
                }
                
                toast({
                    title,
                    description,
                    variant: "destructive"
                });
                
                throw error;
            }
            
            toast({
                title: "Success",
                description: `Category "${label}" created successfully.`,
                variant: "success"
            });
            
            await loadData();
            return categoryId;
        } catch (error: any) {
            console.error('Error creating category - full error:', error);
            return null;
        }
    };

    const handleUpdateCategory = async (categoryId: string, updates: Partial<CategoryConfigDB>) => {
        try {
            const supabase = getBrowserSupabaseClient();
            const { error } = await supabase
                .from('category_configs')
                .update(updates)
                .eq('category_id', categoryId);

            if (error) throw error;
            
            loadData();
        } catch (error) {
            console.error('Error updating category:', error);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        // Check if category is in use
        const blocksInCategory = contentBlocks.filter(b => b.category === categoryId);
        if (blocksInCategory.length > 0) {
            if (!confirm(`This category has ${blocksInCategory.length} content blocks. Are you sure you want to deactivate it?`)) {
                return;
            }
            // Deactivate instead of delete
            await handleUpdateCategory(categoryId, { is_active: false });
        } else {
            if (!confirm('Are you sure you want to delete this category?')) return;
            
            try {
                const supabase = getBrowserSupabaseClient();
                const { error } = await supabase
                    .from('category_configs')
                    .delete()
                    .eq('category_id', categoryId);

                if (error) throw error;
                
                loadData();
            } catch (error) {
                console.error('Error deleting category:', error);
            }
        }
    };

    const handleCreateSubcategory = async (categoryId: string, label: string, iconName: string = 'FolderOpen') => {
        if (!label.trim()) return null;
        
        try {
            const supabase = getBrowserSupabaseClient();
            
            // Generate base ID from label
            let baseId = label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
            
            // Ensure we have a valid ID
            if (!baseId) {
                toast({
                    title: "Invalid Name",
                    description: "Please enter a valid subcategory name with letters or numbers.",
                    variant: "destructive"
                });
                return null;
            }
            
            // Check if ID already exists across ALL categories and make it unique if needed
            let subcategoryId = baseId;
            let counter = 1;
            const existingIds = categories.flatMap(c => 
                (c.subcategories || []).map(s => s.subcategory_id)
            );
            
            while (existingIds.includes(subcategoryId)) {
                subcategoryId = `${baseId}-${counter}`;
                counter++;
            }
            
            const category = categories.find(c => c.category_id === categoryId);
            const maxSortOrder = Math.max(0, ...(category?.subcategories || []).map(s => s.sort_order || 0));
            
            const { error } = await supabase
                .from('subcategory_configs')
                .insert([{
                    subcategory_id: subcategoryId,
                    category_id: categoryId,
                    label: label,
                    icon_name: iconName,
                    sort_order: maxSortOrder + 1,
                    is_active: true
                }]);

            if (error) {
                console.error('Supabase error details:', error);
                
                let title = "Error Creating Subcategory";
                let description = "";
                
                // Check for specific error types
                if (error.code === '23505') {
                    // Unique constraint violation
                    title = "Duplicate ID";
                    description = `Subcategory ID "${subcategoryId}" already exists in the database.`;
                } else if (error.code === '23502') {
                    // NOT NULL constraint violation
                    const match = error.message.match(/column "([^"]+)"/);
                    const column = match ? match[1] : 'unknown';
                    title = "Missing Required Field";
                    description = `Database requires field "${column}" but it wasn't provided. This is a bug - please report it.`;
                } else if (error.code === '23503') {
                    // Foreign key violation
                    title = "Invalid Reference";
                    description = `Category "${categoryId}" does not exist.`;
                } else {
                    // Generic error
                    description = `${error.message}\n\nError Code: ${error.code || 'unknown'}`;
                }
                
                toast({
                    title,
                    description,
                    variant: "destructive"
                });
                
                throw error;
            }
            
            toast({
                title: "Success",
                description: `Subcategory "${label}" created successfully.`,
                variant: "success"
            });
            
            setNewSubcategoryData(null);
            await loadData();
            return subcategoryId;
        } catch (error: any) {
            console.error('Error creating subcategory - full error:', error);
            return null;
        }
    };

    const handleUpdateSubcategory = async (subcategoryId: string, updates: Partial<SubcategoryConfigDB>) => {
        try {
            const supabase = getBrowserSupabaseClient();
            const { error } = await supabase
                .from('subcategory_configs')
                .update(updates)
                .eq('subcategory_id', subcategoryId);

            if (error) throw error;
            
            loadData();
        } catch (error) {
            console.error('Error updating subcategory:', error);
        }
    };

    const handleDeleteSubcategory = async (subcategoryId: string) => {
        // Check if subcategory is in use
        const blocksInSubcategory = contentBlocks.filter(b => b.subcategory === subcategoryId);
        if (blocksInSubcategory.length > 0) {
            if (!confirm(`This subcategory has ${blocksInSubcategory.length} content blocks. Are you sure you want to deactivate it?`)) {
                return;
            }
            // Deactivate instead of delete
            await handleUpdateSubcategory(subcategoryId, { is_active: false });
        } else {
            if (!confirm('Are you sure you want to delete this subcategory?')) return;
            
            try {
                const supabase = getBrowserSupabaseClient();
                const { error } = await supabase
                    .from('subcategory_configs')
                    .delete()
                    .eq('subcategory_id', subcategoryId);

                if (error) throw error;
                
                loadData();
            } catch (error) {
                console.error('Error deleting subcategory:', error);
            }
        }
    };

    // Quick create handlers
    const handleQuickCreateCategory = async () => {
        const categoryId = await handleCreateCategory(
            quickCategoryData.label, 
            quickCategoryData.icon_name, 
            quickCategoryData.color
        );
        
        if (categoryId) {
            // Set the newly created category in the form
            if (quickCreateContext === 'create') {
                setCreateFormData({ ...createFormData, category: categoryId as any, subcategory: undefined });
            } else {
                handleEditChange('category', categoryId);
                handleEditChange('subcategory', null);
            }
            
            // Reset and close
            setQuickCategoryData({ label: '', icon_name: 'Folder', color: '#3b82f6' });
            setIsQuickCreateCategoryOpen(false);
        }
    };

    const handleQuickCreateSubcategory = async () => {
        const categoryId = quickCreateContext === 'create' 
            ? createFormData.category 
            : editData.category;
            
        if (!categoryId) return;
        
        const subcategoryId = await handleCreateSubcategory(
            categoryId,
            quickSubcategoryData.label,
            quickSubcategoryData.icon_name
        );
        
        if (subcategoryId) {
            // Set the newly created subcategory in the form
            if (quickCreateContext === 'create') {
                setCreateFormData({ ...createFormData, subcategory: subcategoryId });
            } else {
                handleEditChange('subcategory', subcategoryId);
            }
            
            // Reset and close
            setQuickSubcategoryData({ label: '', icon_name: 'FolderOpen', categoryId: '' });
            setIsQuickCreateSubcategoryOpen(false);
        }
    };

    const selectedBlock = selectedBlockId ? contentBlocks.find(b => b.id === selectedBlockId) : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <MatrxMiniLoader />
            </div>
        );
    }

    return (
        <div className={`flex h-full w-full bg-textured overflow-hidden ${className}`}>
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Content Blocks
                        </h2>
                        <div className="flex gap-2">
                            <Button onClick={() => setIsCategoryManagementOpen(true)} size="sm" variant="outline">
                                <Settings className="w-4 h-4 mr-1" />
                                Manage
                            </Button>
                            <Button onClick={handleCreateNew} size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add
                            </Button>
                        </div>
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
                            <div key={categoryId} className="mb-2">
                                {/* Category Header - Collapsible */}
                                <div 
                                    className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                                    onClick={() => toggleCategoryExpanded(categoryId)}
                                >
                                    {isCategoryExpanded(categoryId) ? (
                                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                                    )}
                                    <Folder className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{getCategoryLabel(categoryId)}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                                        ({Object.values(subcategories).flat().length})
                                    </span>
                                </div>
                                
                                {/* Category Content - Show only if expanded */}
                                {isCategoryExpanded(categoryId) && (
                                    <div className="ml-4 mt-1">
                                        {Object.entries(subcategories).map(([subcategoryId, blocks]) => (
                                            <div key={subcategoryId} className="mb-2">
                                                {subcategoryId !== 'none' ? (
                                                    // Subcategory with collapsible functionality
                                                    <>
                                                        <div 
                                                            className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md cursor-pointer transition-colors"
                                                            onClick={() => toggleSubcategoryExpanded(categoryId, subcategoryId)}
                                                        >
                                                            {isSubcategoryExpanded(categoryId, subcategoryId) ? (
                                                                <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                                            ) : (
                                                                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                                                            )}
                                                            <FolderOpen className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{getSubcategoryLabel(categoryId, subcategoryId)}</span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                                                                ({blocks.length})
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Subcategory Content - Show only if expanded */}
                                                        {isSubcategoryExpanded(categoryId, subcategoryId) && (
                                                            <div className="ml-4 mt-1">
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
                                                        )}
                                                    </>
                                                ) : (
                                                    // Blocks without subcategory - show directly under category
                                                    <div className="mt-1">
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
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
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
            <div className="flex-1 flex flex-col overflow-hidden">
                {selectedBlock ? (
                    <>
                        {/* Header with Save/Discard buttons */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-textured">
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
                        <ScrollArea className="flex-1">
                            <div className="p-6 space-y-6">
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
                                                    onValueChange={(value) => {
                                                        if (value === '__new__') {
                                                            setQuickCreateContext('edit');
                                                            setIsQuickCreateCategoryOpen(true);
                                                        } else {
                                                            handleEditChange('category', value);
                                                        }
                                                    }}
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
                                                        <SelectItem value="__new__" className="text-blue-600 dark:text-blue-400 font-medium">
                                                            <Plus className="w-3 h-3 inline mr-1" />
                                                            New Category...
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="edit-subcategory">Subcategory</Label>
                                                <Select 
                                                    value={editData.subcategory || 'none'} 
                                                    onValueChange={(value) => {
                                                        if (value === '__new__') {
                                                            setQuickCreateContext('edit');
                                                            setIsQuickCreateSubcategoryOpen(true);
                                                        } else {
                                                            handleEditChange('subcategory', value === 'none' ? null : value);
                                                        }
                                                    }}
                                                    disabled={!editData.category}
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
                                                        {editData.category && (
                                                            <SelectItem value="__new__" className="text-blue-600 dark:text-blue-400 font-medium">
                                                                <Plus className="w-3 h-3 inline mr-1" />
                                                                New Subcategory...
                                                            </SelectItem>
                                                        )}
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
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle>Template Content</CardTitle>
                                                <CardDescription>
                                                    This is the content that will be inserted when users select this block from context menus.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowPreview(!showPreview)}
                                                className="flex items-center gap-2"
                                            >
                                                {showPreview ? (
                                                    <>
                                                        <PanelLeft className="w-4 h-4" />
                                                        Editor Only
                                                    </>
                                                ) : (
                                                    <>
                                                        <Columns2 className="w-4 h-4" />
                                                        Split View
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className={showPreview ? "flex flex-col lg:flex-row gap-4 items-stretch" : ""}>
                                            {/* Editor Section */}
                                            <div className={showPreview ? "flex-1 min-w-0" : ""}>
                                                <AutoResizeTextarea
                                                    value={editData.template || ''}
                                                    onChange={(e) => handleEditChange('template', e.target.value)}
                                                    placeholder="Enter the template content that will be inserted..."
                                                    className="font-mono text-sm h-full"
                                                    minHeight={300}
                                                />
                                            </div>
                                            
                                            {/* Preview Section */}
                                            {showPreview && (
                                                <div className="flex-1 min-w-0 min-h-[300px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-textured overflow-auto">
                                                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                                                        PREVIEW
                                                    </div>
                                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                                        <EnhancedChatMarkdown content={editData.template || ''} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>
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
                                    onValueChange={(value) => {
                                        if (value === '__new__') {
                                            setQuickCreateContext('create');
                                            setIsQuickCreateCategoryOpen(true);
                                        } else {
                                            setCreateFormData({ ...createFormData, category: value as any, subcategory: undefined });
                                        }
                                    }}
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
                                        <SelectItem value="__new__" className="text-blue-600 dark:text-blue-400 font-medium">
                                            <Plus className="w-3 h-3 inline mr-1" />
                                            New Category...
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="create-subcategory">Subcategory</Label>
                                <Select 
                                    value={createFormData.subcategory || 'none'} 
                                    onValueChange={(value) => {
                                        if (value === '__new__') {
                                            setQuickCreateContext('create');
                                            setIsQuickCreateSubcategoryOpen(true);
                                        } else {
                                            setCreateFormData({ ...createFormData, subcategory: value === 'none' ? undefined : value });
                                        }
                                    }}
                                    disabled={!createFormData.category}
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
                                        {createFormData.category && (
                                            <SelectItem value="__new__" className="text-blue-600 dark:text-blue-400 font-medium">
                                                <Plus className="w-3 h-3 inline mr-1" />
                                                New Subcategory...
                                            </SelectItem>
                                        )}
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

            {/* Category Management Dialog */}
            <Dialog open={isCategoryManagementOpen} onOpenChange={setIsCategoryManagementOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Manage Categories & Subcategories</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto pr-4" style={{ maxHeight: 'calc(90vh - 180px)' }}>
                        <div className="space-y-6 pb-6">
                            {/* Create New Category */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Create New Category</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Input
                                                placeholder="Category name (e.g., 'Structure')"
                                                value={newCategoryLabel}
                                                onChange={(e) => setNewCategoryLabel(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && newCategoryLabel.trim() && handleCreateCategory(newCategoryLabel, quickCategoryData.icon_name, quickCategoryData.color).then(() => setNewCategoryLabel(''))}
                                                className="flex-1"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <Label className="text-xs">Icon</Label>
                                                <Input
                                                    placeholder="Icon name (e.g., Folder)"
                                                    value={quickCategoryData.icon_name}
                                                    onChange={(e) => setQuickCategoryData({ ...quickCategoryData, icon_name: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <Label className="text-xs">Color</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="color"
                                                        value={quickCategoryData.color}
                                                        onChange={(e) => setQuickCategoryData({ ...quickCategoryData, color: e.target.value })}
                                                        className="w-16 h-9"
                                                    />
                                                    <Input
                                                        type="text"
                                                        value={quickCategoryData.color}
                                                        onChange={(e) => setQuickCategoryData({ ...quickCategoryData, color: e.target.value })}
                                                        placeholder="#3b82f6"
                                                        className="flex-1"
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={() => handleCreateCategory(newCategoryLabel, quickCategoryData.icon_name, quickCategoryData.color).then(() => setNewCategoryLabel(''))} 
                                                disabled={!newCategoryLabel.trim()}
                                                className="mt-5"
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Create
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Existing Categories */}
                            <div className="space-y-3">
                                {categories.map(category => (
                                    <Card key={category.category_id} className={!category.is_active ? 'opacity-60' : ''}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" 
                                                    style={{ backgroundColor: category.color }}
                                                >
                                                    <Folder className="w-5 h-5 text-white" />
                                                </div>
                                                {editingCategoryId === category.category_id ? (
                                                    <div className="flex-1 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                value={category.label}
                                                                onChange={(e) => {
                                                                    const updatedCategories = categories.map(c =>
                                                                        c.category_id === category.category_id
                                                                            ? { ...c, label: e.target.value }
                                                                            : c
                                                                    );
                                                                    setCategories(updatedCategories);
                                                                }}
                                                                placeholder="Label"
                                                                className="flex-1"
                                                            />
                                                            <Input
                                                                value={category.icon_name}
                                                                onChange={(e) => {
                                                                    const updatedCategories = categories.map(c =>
                                                                        c.category_id === category.category_id
                                                                            ? { ...c, icon_name: e.target.value }
                                                                            : c
                                                                    );
                                                                    setCategories(updatedCategories);
                                                                }}
                                                                placeholder="Icon"
                                                                className="w-32"
                                                            />
                                                            <Input
                                                                type="color"
                                                                value={category.color}
                                                                onChange={(e) => {
                                                                    const updatedCategories = categories.map(c =>
                                                                        c.category_id === category.category_id
                                                                            ? { ...c, color: e.target.value }
                                                                            : c
                                                                    );
                                                                    setCategories(updatedCategories);
                                                                }}
                                                                className="w-16 h-9"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                onClick={() => {
                                                                    handleUpdateCategory(category.category_id, { 
                                                                        label: category.label,
                                                                        icon_name: category.icon_name,
                                                                        color: category.color
                                                                    });
                                                                    setEditingCategoryId(null);
                                                                }}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setEditingCategoryId(null);
                                                                    loadData();
                                                                }}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-900 dark:text-gray-100">
                                                                {category.label}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                                ID: {category.category_id} • Icon: {category.icon_name} • Color: {category.color} • Sort: {category.sort_order}
                                                            </div>
                                                        </div>
                                                        {!category.is_active && (
                                                            <Badge variant="outline" className="text-orange-600 border-orange-600">
                                                                Inactive
                                                            </Badge>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setEditingCategoryId(category.category_id)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteCategory(category.category_id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            {/* Subcategories */}
                                            <div className="space-y-2 ml-8">
                                                {category.subcategories.map(subcat => (
                                                    <div
                                                        key={subcat.subcategory_id}
                                                        className={`flex items-center gap-2 p-2 rounded-md border border-gray-200 dark:border-gray-700 ${!subcat.is_active ? 'opacity-60' : ''}`}
                                                    >
                                                        <FolderOpen className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                                                        {editingSubcategoryId === subcat.subcategory_id ? (
                                                            <div className="flex-1 flex items-center gap-2">
                                                                <Input
                                                                    value={subcat.label}
                                                                    onChange={(e) => {
                                                                        const updatedCategories = categories.map(c =>
                                                                            c.category_id === category.category_id
                                                                                ? {
                                                                                    ...c,
                                                                                    subcategories: c.subcategories.map(s =>
                                                                                        s.subcategory_id === subcat.subcategory_id
                                                                                            ? { ...s, label: e.target.value }
                                                                                            : s
                                                                                    )
                                                                                }
                                                                                : c
                                                                        );
                                                                        setCategories(updatedCategories);
                                                                    }}
                                                                    placeholder="Label"
                                                                    className="text-sm flex-1"
                                                                />
                                                                <Input
                                                                    value={subcat.icon_name}
                                                                    onChange={(e) => {
                                                                        const updatedCategories = categories.map(c =>
                                                                            c.category_id === category.category_id
                                                                                ? {
                                                                                    ...c,
                                                                                    subcategories: c.subcategories.map(s =>
                                                                                        s.subcategory_id === subcat.subcategory_id
                                                                                            ? { ...s, icon_name: e.target.value }
                                                                                            : s
                                                                                    )
                                                                                }
                                                                                : c
                                                                        );
                                                                        setCategories(updatedCategories);
                                                                    }}
                                                                    placeholder="Icon"
                                                                    className="text-sm w-32"
                                                                />
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        handleUpdateSubcategory(subcat.subcategory_id, { 
                                                                            label: subcat.label,
                                                                            icon_name: subcat.icon_name
                                                                        });
                                                                        setEditingSubcategoryId(null);
                                                                    }}
                                                                >
                                                                    <Check className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setEditingSubcategoryId(null);
                                                                        loadData();
                                                                    }}
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex-1 text-sm">
                                                                    <span className="text-gray-900 dark:text-gray-100">{subcat.label}</span>
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                                        ({subcat.subcategory_id} • Icon: {subcat.icon_name})
                                                                    </span>
                                                                </div>
                                                                {!subcat.is_active && (
                                                                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-600">
                                                                        Inactive
                                                                    </Badge>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => setEditingSubcategoryId(subcat.subcategory_id)}
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleDeleteSubcategory(subcat.subcategory_id)}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                                
                                                {/* Add Subcategory */}
                                                {newSubcategoryData?.categoryId === category.category_id ? (
                                                    <div className="flex items-center gap-2 p-2">
                                                        <Input
                                                            placeholder="Subcategory name"
                                                            value={newSubcategoryData.label}
                                                            onChange={(e) => setNewSubcategoryData({ ...newSubcategoryData, label: e.target.value })}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    handleCreateSubcategory(category.category_id, newSubcategoryData.label);
                                                                }
                                                            }}
                                                            className="text-sm"
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleCreateSubcategory(category.category_id, newSubcategoryData.label)}
                                                            disabled={!newSubcategoryData.label.trim()}
                                                        >
                                                            <Check className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setNewSubcategoryData(null)}
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full"
                                                        onClick={() => setNewSubcategoryData({ categoryId: category.category_id, label: '' })}
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Add Subcategory
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button onClick={() => setIsCategoryManagementOpen(false)}>
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Create Category Modal */}
            <Dialog open={isQuickCreateCategoryOpen} onOpenChange={setIsQuickCreateCategoryOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Category</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="quick-category-label">Category Name</Label>
                            <Input
                                id="quick-category-label"
                                value={quickCategoryData.label}
                                onChange={(e) => setQuickCategoryData({ ...quickCategoryData, label: e.target.value })}
                                placeholder="e.g., Structure"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && quickCategoryData.label.trim()) {
                                        handleQuickCreateCategory();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="quick-category-icon">Icon Name</Label>
                            <Input
                                id="quick-category-icon"
                                value={quickCategoryData.icon_name}
                                onChange={(e) => setQuickCategoryData({ ...quickCategoryData, icon_name: e.target.value })}
                                placeholder="e.g., Folder"
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="quick-category-color">Color</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={quickCategoryData.color}
                                    onChange={(e) => setQuickCategoryData({ ...quickCategoryData, color: e.target.value })}
                                    className="w-16 h-9"
                                />
                                <Input
                                    type="text"
                                    value={quickCategoryData.color}
                                    onChange={(e) => setQuickCategoryData({ ...quickCategoryData, color: e.target.value })}
                                    placeholder="#3b82f6"
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setIsQuickCreateCategoryOpen(false);
                                    setQuickCategoryData({ label: '', icon_name: 'Folder', color: '#3b82f6' });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleQuickCreateCategory}
                                disabled={!quickCategoryData.label.trim()}
                            >
                                Create & Select
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Quick Create Subcategory Modal */}
            <Dialog open={isQuickCreateSubcategoryOpen} onOpenChange={setIsQuickCreateSubcategoryOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Subcategory</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="quick-subcategory-label">Subcategory Name</Label>
                            <Input
                                id="quick-subcategory-label"
                                value={quickSubcategoryData.label}
                                onChange={(e) => setQuickSubcategoryData({ ...quickSubcategoryData, label: e.target.value })}
                                placeholder="e.g., Headers"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && quickSubcategoryData.label.trim()) {
                                        handleQuickCreateSubcategory();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                        
                        <div>
                            <Label htmlFor="quick-subcategory-icon">Icon Name</Label>
                            <Input
                                id="quick-subcategory-icon"
                                value={quickSubcategoryData.icon_name}
                                onChange={(e) => setQuickSubcategoryData({ ...quickSubcategoryData, icon_name: e.target.value })}
                                placeholder="e.g., FolderOpen"
                            />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setIsQuickCreateSubcategoryOpen(false);
                                    setQuickSubcategoryData({ label: '', icon_name: 'FolderOpen', categoryId: '' });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleQuickCreateSubcategory}
                                disabled={!quickSubcategoryData.label.trim()}
                            >
                                Create & Select
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}