'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Folder,
  FolderOpen,
  Search,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Edit2,
  Zap,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
  CreateShortcutCategoryInput,
  UpdateShortcutCategoryInput,
  CreatePromptShortcutInput,
  UpdatePromptShortcutInput,
} from '../types';
import {
  fetchShortcutCategories,
  createShortcutCategory,
  updateShortcutCategory,
  deleteShortcutCategory,
  fetchPromptShortcuts,
  createPromptShortcut,
  updatePromptShortcut,
  deletePromptShortcut,
  fetchPromptBuiltins,
  fetchShortcutsWithRelations,
} from '../services/admin-service';
import { PLACEMENT_TYPES, PLACEMENT_TYPE_META, COMMON_SCOPE_CONFIGURATIONS } from '../constants';
import MatrxMiniLoader from '@/components/loaders/MatrxMiniLoader';

interface PromptBuiltinsManagerProps {
  className?: string;
}

type SelectedItem = 
  | { type: 'category'; data: ShortcutCategory }
  | { type: 'shortcut'; data: PromptShortcut & { category?: ShortcutCategory; builtin?: PromptBuiltin } }
  | null;

export function PromptBuiltinsManager({ className }: PromptBuiltinsManagerProps) {
  // State
  const [categories, setCategories] = useState<ShortcutCategory[]>([]);
  const [shortcuts, setShortcuts] = useState<(PromptShortcut & { category?: ShortcutCategory; builtin?: PromptBuiltin })[]>([]);
  const [builtins, setBuiltins] = useState<PromptBuiltin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);
  const [selectedPlacement, setSelectedPlacement] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Edit data
  const [editCategoryData, setEditCategoryData] = useState<Partial<ShortcutCategory>>({});
  const [editShortcutData, setEditShortcutData] = useState<Partial<PromptShortcut>>({});
  
  // Tree expansion state
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Dialog state
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [isCreateShortcutOpen, setIsCreateShortcutOpen] = useState(false);
  const [createCategoryData, setCreateCategoryData] = useState<Partial<CreateShortcutCategoryInput>>({});
  const [createShortcutData, setCreateShortcutData] = useState<Partial<CreatePromptShortcutInput>>({});
  
  const { toast } = useToast();

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesData, shortcutsData, builtinsData] = await Promise.all([
        fetchShortcutCategories(),
        fetchShortcutsWithRelations(),
        fetchPromptBuiltins({ is_active: true }),
      ]);
      
      setCategories(categoriesData);
      setShortcuts(shortcutsData);
      setBuiltins(builtinsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Initialize edit data when item is selected
  useEffect(() => {
    if (selectedItem?.type === 'category') {
      setEditCategoryData(selectedItem.data);
      setHasUnsavedChanges(false);
    } else if (selectedItem?.type === 'shortcut') {
      setEditShortcutData(selectedItem.data);
      setHasUnsavedChanges(false);
    }
  }, [selectedItem]);

  // Filter categories and shortcuts
  const filteredCategories = categories.filter(cat => {
    const matchesPlacement = selectedPlacement === 'all' || cat.placement_type === selectedPlacement;
    const matchesSearch = searchTerm === '' || cat.label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPlacement && matchesSearch && cat.is_active;
  });

  // Build tree structure
  const buildTree = () => {
    const tree: any[] = [];
    const categoryMap = new Map(filteredCategories.map(c => [c.id, { ...c, children: [], shortcuts: [] }]));
    
    // Add shortcuts to categories
    shortcuts.forEach(shortcut => {
      const category = categoryMap.get(shortcut.category_id);
      if (category && shortcut.is_active) {
        category.shortcuts.push(shortcut);
      }
    });
    
    // Build hierarchy
    categoryMap.forEach(category => {
      if (category.parent_category_id) {
        const parent = categoryMap.get(category.parent_category_id);
        if (parent) {
          parent.children.push(category);
        } else {
          tree.push(category);
        }
      } else {
        tree.push(category);
      }
    });
    
    // Sort by sort_order
    const sortItems = (items: any[]) => {
      items.sort((a, b) => a.sort_order - b.sort_order);
      items.forEach(item => {
        if (item.children) sortItems(item.children);
        if (item.shortcuts) item.shortcuts.sort((a: any, b: any) => a.sort_order - b.sort_order);
      });
    };
    sortItems(tree);
    
    return tree;
  };

  const tree = buildTree();

  // Tree expansion helpers
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const isExpanded = (categoryId: string) => expandedCategories.has(categoryId);

  // CRUD handlers for categories
  const handleCategoryChange = (field: string, value: any) => {
    setEditCategoryData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveCategoryChanges = async () => {
    if (!editCategoryData.id) return;
    
    try {
      await updateShortcutCategory({
        id: editCategoryData.id,
        placement_type: editCategoryData.placement_type,
        parent_category_id: editCategoryData.parent_category_id,
        label: editCategoryData.label,
        description: editCategoryData.description,
        icon_name: editCategoryData.icon_name,
        color: editCategoryData.color,
        sort_order: editCategoryData.sort_order,
        is_active: editCategoryData.is_active,
        metadata: editCategoryData.metadata,
      });
      
      toast({ title: 'Success', description: 'Category updated successfully' });
      setHasUnsavedChanges(false);
      await loadData();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (category: ShortcutCategory) => {
    const shortcutsInCategory = shortcuts.filter(s => s.category_id === category.id);
    
    if (shortcutsInCategory.length > 0) {
      if (!confirm(`This category has ${shortcutsInCategory.length} shortcuts. Deleting it will also delete all shortcuts. Continue?`)) {
        return;
      }
    } else if (!confirm(`Delete category "${category.label}"?`)) {
      return;
    }
    
    try {
      await deleteShortcutCategory(category.id);
      toast({ title: 'Success', description: 'Category deleted successfully' });
      setSelectedItem(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  // CRUD handlers for shortcuts
  const handleShortcutChange = (field: string, value: any) => {
    setEditShortcutData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSaveShortcutChanges = async () => {
    if (!editShortcutData.id) return;
    
    try {
      await updatePromptShortcut({
        id: editShortcutData.id,
        prompt_builtin_id: editShortcutData.prompt_builtin_id,
        category_id: editShortcutData.category_id,
        label: editShortcutData.label,
        description: editShortcutData.description,
        icon_name: editShortcutData.icon_name,
        keyboard_shortcut: editShortcutData.keyboard_shortcut,
        sort_order: editShortcutData.sort_order,
        scope_mappings: editShortcutData.scope_mappings,
        available_scopes: editShortcutData.available_scopes,
        is_active: editShortcutData.is_active,
      });
      
      toast({ title: 'Success', description: 'Shortcut updated successfully' });
      setHasUnsavedChanges(false);
      await loadData();
    } catch (error) {
      console.error('Error updating shortcut:', error);
      toast({ title: 'Error', description: 'Failed to update shortcut', variant: 'destructive' });
    }
  };

  const handleDeleteShortcut = async (shortcut: PromptShortcut) => {
    if (!confirm(`Delete shortcut "${shortcut.label}"?`)) return;
    
    try {
      await deletePromptShortcut(shortcut.id);
      toast({ title: 'Success', description: 'Shortcut deleted successfully' });
      setSelectedItem(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting shortcut:', error);
      toast({ title: 'Error', description: 'Failed to delete shortcut', variant: 'destructive' });
    }
  };

  const handleDiscardChanges = () => {
    if (selectedItem?.type === 'category') {
      setEditCategoryData(selectedItem.data);
    } else if (selectedItem?.type === 'shortcut') {
      setEditShortcutData(selectedItem.data);
    }
    setHasUnsavedChanges(false);
  };

  // Create handlers
  const handleCreateCategory = async () => {
    if (!createCategoryData.placement_type || !createCategoryData.label) {
      toast({ title: 'Error', description: 'Placement type and label are required', variant: 'destructive' });
      return;
    }
    
    try {
      await createShortcutCategory(createCategoryData as CreateShortcutCategoryInput);
      toast({ title: 'Success', description: 'Category created successfully' });
      setIsCreateCategoryOpen(false);
      setCreateCategoryData({});
      await loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    }
  };

  const handleCreateShortcut = async () => {
    if (!createShortcutData.prompt_builtin_id || !createShortcutData.category_id || !createShortcutData.label) {
      toast({ title: 'Error', description: 'Prompt, category, and label are required', variant: 'destructive' });
      return;
    }
    
    try {
      await createPromptShortcut(createShortcutData as CreatePromptShortcutInput);
      toast({ title: 'Success', description: 'Shortcut created successfully' });
      setIsCreateShortcutOpen(false);
      setCreateShortcutData({});
      await loadData();
    } catch (error) {
      console.error('Error creating shortcut:', error);
      toast({ title: 'Error', description: 'Failed to create shortcut', variant: 'destructive' });
    }
  };

  // Render tree nodes recursively
  const renderTreeNode = (node: any, depth: number = 0): React.ReactNode => {
    const isSelected = selectedItem?.type === 'category' && selectedItem.data.id === node.id;
    const expanded = isExpanded(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const hasShortcuts = node.shortcuts && node.shortcuts.length > 0;
    
    return (
      <div key={node.id}>
        {/* Category Row */}
        <div
          className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors
            ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          <div onClick={() => toggleCategory(node.id)} className="flex items-center gap-1">
            {(hasChildren || hasShortcuts) ? (
              expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : <div className="w-4" />}
          </div>
          <div 
            className="flex-1 flex items-center gap-2 min-w-0"
            onClick={() => setSelectedItem({ type: 'category', data: node })}
          >
            <Folder className="w-4 h-4 flex-shrink-0" style={{ color: node.color || '#666' }} />
            <span className="text-sm font-medium truncate">{node.label}</span>
            <Badge variant="outline" className="text-xs">{node.placement_type}</Badge>
            {!node.is_active && <EyeOff className="w-3 h-3 text-gray-400" />}
          </div>
        </div>
        
        {/* Children and Shortcuts */}
        {expanded && (
          <div>
            {/* Child Categories */}
            {node.children?.map((child: any) => renderTreeNode(child, depth + 1))}
            
            {/* Shortcuts */}
            {node.shortcuts?.map((shortcut: any) => {
              const isShortcutSelected = selectedItem?.type === 'shortcut' && selectedItem.data.id === shortcut.id;
              return (
                <div
                  key={shortcut.id}
                  className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors
                    ${isShortcutSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                  onClick={() => setSelectedItem({ type: 'shortcut', data: shortcut })}
                >
                  <Zap className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="text-sm truncate">{shortcut.label}</span>
                  {!shortcut.is_active && <EyeOff className="w-3 h-3 text-gray-400" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

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
            <h2 className="text-lg font-semibold">Prompt Builtins</h2>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateCategoryOpen(true)} size="sm" variant="outline">
                <Folder className="w-4 h-4 mr-1" />
                Category
              </Button>
              <Button onClick={() => setIsCreateShortcutOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Shortcut
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Placement Filter */}
          <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Placements</SelectItem>
              {Object.entries(PLACEMENT_TYPES).map(([key, value]) => (
                <SelectItem key={value} value={value}>
                  {PLACEMENT_TYPE_META[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tree View */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {tree.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No categories found</p>
              </div>
            ) : (
              tree.map(node => renderTreeNode(node))
            )}
          </div>
        </ScrollArea>

        {/* Stats */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {categories.length} categories • {shortcuts.length} shortcuts
          </div>
        </div>
      </div>

      {/* Main Content Area - Will continue in next message */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedItem ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-textured">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">
                    {selectedItem.type === 'category' ? 'Edit Category' : 'Edit Shortcut'}
                  </h1>
                  {hasUnsavedChanges && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Unsaved Changes
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <Button variant="outline" size="sm" onClick={handleDiscardChanges}>
                      <X className="w-4 h-4 mr-1" />
                      Discard
                    </Button>
                  )}
                  <Button 
                    size="sm"
                    onClick={selectedItem.type === 'category' ? handleSaveCategoryChanges : handleSaveShortcutChanges}
                    disabled={!hasUnsavedChanges}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => selectedItem.type === 'category' ? handleDeleteCategory(selectedItem.data) : handleDeleteShortcut(selectedItem.data)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {selectedItem.type === 'category' ? (
                  /* Category Edit Form */
                  <>
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
                              onChange={(e) => handleCategoryChange('label', e.target.value)}
                              placeholder="Category name"
                            />
                          </div>
                          <div>
                            <Label>Placement Type</Label>
                            <Select
                              value={editCategoryData.placement_type}
                              onValueChange={(value) => handleCategoryChange('placement_type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PLACEMENT_TYPES).map(([key, value]) => (
                                  <SelectItem key={value} value={value}>
                                    {PLACEMENT_TYPE_META[value].label}
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
                            onChange={(e) => handleCategoryChange('description', e.target.value)}
                            placeholder="Optional description"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Icon Name</Label>
                            <Input
                              value={editCategoryData.icon_name || ''}
                              onChange={(e) => handleCategoryChange('icon_name', e.target.value)}
                              placeholder="Folder"
                            />
                            <p className="text-xs text-gray-500 mt-1">Lucide icon name</p>
                          </div>
                          <div>
                            <Label>Color</Label>
                            <Input
                              value={editCategoryData.color || ''}
                              onChange={(e) => handleCategoryChange('color', e.target.value)}
                              placeholder="Color or code (e.g. #3b82f6 or blue)"
                            />
                          </div>
                          <div>
                            <Label>Sort Order</Label>
                            <Input
                              type="number"
                              value={editCategoryData.sort_order || 0}
                              onChange={(e) => handleCategoryChange('sort_order', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Parent Category</Label>
                          <Select
                            value={editCategoryData.parent_category_id || 'none'}
                            onValueChange={(value) => handleCategoryChange('parent_category_id', value === 'none' ? null : value)}
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

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={editCategoryData.is_active}
                            onCheckedChange={(checked) => handleCategoryChange('is_active', checked)}
                          />
                          <Label>Active (visible in menus)</Label>
                        </div>
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
                              handleCategoryChange('metadata', parsed);
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
                  </>
                ) : (
                  /* Shortcut Edit Form */
                  <>
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
                              onChange={(e) => handleShortcutChange('label', e.target.value)}
                              placeholder="Shortcut name"
                            />
                          </div>
                          <div>
                            <Label>Keyboard Shortcut</Label>
                            <Input
                              value={editShortcutData.keyboard_shortcut || ''}
                              onChange={(e) => handleShortcutChange('keyboard_shortcut', e.target.value)}
                              placeholder="Ctrl+Shift+K"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={editShortcutData.description || ''}
                            onChange={(e) => handleShortcutChange('description', e.target.value)}
                            placeholder="Optional description"
                            rows={3}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Icon Name</Label>
                            <Input
                              value={editShortcutData.icon_name || ''}
                              onChange={(e) => handleShortcutChange('icon_name', e.target.value)}
                              placeholder="Zap"
                            />
                            <p className="text-xs text-gray-500 mt-1">Lucide icon name</p>
                          </div>
                          <div>
                            <Label>Category</Label>
                            <Select
                              value={editShortcutData.category_id}
                              onValueChange={(value) => handleShortcutChange('category_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(cat => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.label}
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
                              onChange={(e) => handleShortcutChange('sort_order', parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Prompt Builtin</Label>
                          <Select
                            value={editShortcutData.prompt_builtin_id}
                            onValueChange={(value) => handleShortcutChange('prompt_builtin_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select prompt..." />
                            </SelectTrigger>
                            <SelectContent>
                              {builtins.map(builtin => (
                                <SelectItem key={builtin.id} value={builtin.id}>
                                  {builtin.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={editShortcutData.is_active}
                            onCheckedChange={(checked) => handleShortcutChange('is_active', checked)}
                          />
                          <Label>Active (visible in menus)</Label>
                        </div>
                      </CardContent>
                    </Card>

                    {/* CRITICAL: Scope Mapping Configuration */}
                    <Card className="border-purple-200 dark:border-purple-800">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-purple-600" />
                          <CardTitle>Scope Mapping (CRITICAL)</CardTitle>
                        </div>
                        <CardDescription>
                          Maps the application's scope keys to this prompt's variable names.
                          The scope keys available depend on where this shortcut is used (button, card, menu, etc.).
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Available Scopes */}
                        <div>
                          <Label className="text-sm font-semibold">Available Scope Keys</Label>
                          <p className="text-xs text-gray-500 mb-2">
                            Define which scope keys are available for this shortcut (comma-separated)
                          </p>
                          <Input
                            value={(editShortcutData.available_scopes || []).join(', ')}
                            onChange={(e) => {
                              const scopes = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              handleShortcutChange('available_scopes', scopes);
                            }}
                            placeholder="selection, content, context"
                          />
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.values(COMMON_SCOPE_CONFIGURATIONS).slice(0, 3).map((config, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() => handleShortcutChange('available_scopes', [...config])}
                              >
                                Preset: {config.join(', ')}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Scope Mappings */}
                        <div>
                          <Label className="text-sm font-semibold">Scope Mappings (JSON)</Label>
                          <p className="text-xs text-gray-500 mb-2">
                            Map each available scope to a variable name from the selected prompt
                          </p>
                          <Textarea
                            value={JSON.stringify(editShortcutData.scope_mappings || {}, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                handleShortcutChange('scope_mappings', parsed);
                              } catch {
                                // Invalid JSON
                              }
                            }}
                            placeholder='{\n  "selection": "variable_name",\n  "content": "another_variable"\n}'
                            rows={6}
                            className="font-mono text-sm"
                          />
                        </div>

                        {/* Show prompt variables if builtin selected */}
                        {editShortcutData.prompt_builtin_id && (() => {
                          const selectedBuiltin = builtins.find(b => b.id === editShortcutData.prompt_builtin_id);
                          if (selectedBuiltin && selectedBuiltin.variableDefaults) {
                            return (
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                                  Available Variables in "{selectedBuiltin.name}":
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {selectedBuiltin.variableDefaults.map((v: any) => (
                                    <Badge key={v.name} variant="secondary">
                                      {v.name}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Item Selected</h3>
              <p>Select a category or shortcut from the sidebar</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Label *</Label>
                <Input
                  value={createCategoryData.label || ''}
                  onChange={(e) => setCreateCategoryData({ ...createCategoryData, label: e.target.value })}
                  placeholder="Category name"
                />
              </div>
              <div>
                <Label>Placement Type *</Label>
                <Select
                  value={createCategoryData.placement_type}
                  onValueChange={(value) => setCreateCategoryData({ ...createCategoryData, placement_type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLACEMENT_TYPES).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {PLACEMENT_TYPE_META[value].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Icon Name</Label>
                <Input
                  value={createCategoryData.icon_name || ''}
                  onChange={(e) => setCreateCategoryData({ ...createCategoryData, icon_name: e.target.value })}
                  placeholder="Folder"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  value={createCategoryData.color || ''}
                  onChange={(e) => setCreateCategoryData({ ...createCategoryData, color: e.target.value })}
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCategory}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Shortcut Dialog */}
      <Dialog open={isCreateShortcutOpen} onOpenChange={setIsCreateShortcutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Shortcut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Label *</Label>
                <Input
                  value={createShortcutData.label || ''}
                  onChange={(e) => setCreateShortcutData({ ...createShortcutData, label: e.target.value })}
                  placeholder="Shortcut name"
                />
              </div>
              <div>
                <Label>Keyboard Shortcut</Label>
                <Input
                  value={createShortcutData.keyboard_shortcut || ''}
                  onChange={(e) => setCreateShortcutData({ ...createShortcutData, keyboard_shortcut: e.target.value })}
                  placeholder="Ctrl+Shift+K"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prompt Builtin *</Label>
                <Select
                  value={createShortcutData.prompt_builtin_id}
                  onValueChange={(value) => setCreateShortcutData({ ...createShortcutData, prompt_builtin_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select prompt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {builtins.map(builtin => (
                      <SelectItem key={builtin.id} value={builtin.id}>
                        {builtin.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category *</Label>
                <Select
                  value={createShortcutData.category_id}
                  onValueChange={(value) => setCreateShortcutData({ ...createShortcutData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateShortcutOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateShortcut}>
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

