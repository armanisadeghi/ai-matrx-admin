'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, X, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PromptBuiltinEditPanel } from './PromptBuiltinEditPanel';
import {
  ShortcutCategory,
  PromptBuiltin,
  PromptShortcut,
} from '../types';
import {
  fetchShortcutCategories,
  updateShortcutCategory,
  deleteShortcutCategory,
  updatePromptShortcut,
  deletePromptShortcut,
  fetchPromptBuiltins,
} from '../services/admin-service';
import { getUserFriendlyError } from '../utils/error-handler';
import { SelectPromptForBuiltinModal } from './SelectPromptForBuiltinModal';
import { PromptSettingsModal } from '@/features/prompts/components/PromptSettingsModal';

interface PromptBuiltinEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: 
    | { type: 'category'; data: ShortcutCategory }
    | { type: 'shortcut'; data: PromptShortcut & { category?: ShortcutCategory; builtin?: PromptBuiltin } };
  onUpdate?: () => void;
}

export function PromptBuiltinEditDialog({
  isOpen,
  onClose,
  item,
  onUpdate,
}: PromptBuiltinEditDialogProps) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ShortcutCategory[]>([]);
  const [builtins, setBuiltins] = useState<PromptBuiltin[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editCategoryData, setEditCategoryData] = useState<Partial<ShortcutCategory>>({});
  const [editShortcutData, setEditShortcutData] = useState<Partial<PromptShortcut>>({});
  const [isSelectPromptModalOpen, setIsSelectPromptModalOpen] = useState(false);
  const [isPromptSettingsOpen, setIsPromptSettingsOpen] = useState(false);
  const [editingBuiltinId, setEditingBuiltinId] = useState<string | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [availableTools, setAvailableTools] = useState<any[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [categoriesData, builtinsData, modelsResponse, toolsResponse] = await Promise.all([
        fetchShortcutCategories(),
        fetchPromptBuiltins({ is_active: true }),
        fetch('/api/ai-models').then(r => r.json()).catch(() => ({ models: [] })),
        fetch('/api/tools').then(r => r.json()).catch(() => ({ tools: [] })),
      ]);
      
      setCategories(categoriesData);
      setBuiltins(builtinsData);
      setModels(modelsResponse?.models || []);
      setAvailableTools(toolsResponse?.tools || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Initialize edit data when item changes
  useEffect(() => {
    if (item.type === 'category') {
      setEditCategoryData(item.data);
      setHasUnsavedChanges(false);
    } else if (item.type === 'shortcut') {
      setEditShortcutData(item.data);
      setHasUnsavedChanges(false);
    }
  }, [item]);

  const handleCategoryChange = (field: string, value: any) => {
    setEditCategoryData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleShortcutChange = (field: string, value: any) => {
    setEditShortcutData(prev => ({ ...prev, [field]: value }));
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
      onUpdate?.();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    }
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
      onUpdate?.();
    } catch (error) {
      console.error('Error updating shortcut:', error);
      toast({ title: 'Error', description: 'Failed to update shortcut', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async () => {
    if (!confirm(`Delete category "${editCategoryData.label}"?`)) return;
    
    try {
      await deleteShortcutCategory(editCategoryData.id!);
      toast({ title: 'Success', description: 'Category deleted successfully' });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: 'Error', description: 'Failed to delete category', variant: 'destructive' });
    }
  };

  const handleDeleteShortcut = async () => {
    if (!confirm(`Delete shortcut "${editShortcutData.label}"?`)) return;
    
    try {
      await deletePromptShortcut(editShortcutData.id!);
      toast({ title: 'Success', description: 'Shortcut deleted successfully' });
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error deleting shortcut:', error);
      toast({ title: 'Error', description: 'Failed to delete shortcut', variant: 'destructive' });
    }
  };

  const handleDiscardChanges = () => {
    if (item.type === 'category') {
      setEditCategoryData(item.data);
    } else if (item.type === 'shortcut') {
      setEditShortcutData(item.data);
    }
    setHasUnsavedChanges(false);
  };

  const handleOpenBuiltinEditor = (builtinId: string) => {
    setEditingBuiltinId(builtinId);
    setIsPromptSettingsOpen(true);
  };

  const handleUpdateBuiltin = async (id: string, data: {
    name: string;
    description?: string;
    variableDefaults: any[];
    messages?: any[];
    settings?: Record<string, any>;
  }) => {
    try {
      const response = await fetch(`/api/admin/prompt-builtins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          messages: data.messages,
          variable_defaults: data.variableDefaults,
          settings: data.settings,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update builtin');
      }

      toast({ title: 'Success', description: 'Prompt builtin updated successfully' });
      const builtinsData = await fetchPromptBuiltins({ is_active: true });
      setBuiltins(builtinsData);
    } catch (error: any) {
      const errorMessage = getUserFriendlyError(error);
      toast({ 
        title: 'Failed to Update Builtin', 
        description: errorMessage,
        variant: 'destructive' 
      });
      throw error;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DialogTitle>
                  {item.type === 'category' ? 'Edit Category' : 'Edit Shortcut'}
                </DialogTitle>
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
                  onClick={item.type === 'category' ? handleSaveCategoryChanges : handleSaveShortcutChanges}
                  disabled={!hasUnsavedChanges}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={item.type === 'category' ? handleDeleteCategory : handleDeleteShortcut}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            <div className="p-6">
              <PromptBuiltinEditPanel
                selectedItem={item}
                editCategoryData={editCategoryData}
                editShortcutData={editShortcutData}
                categories={categories}
                builtins={builtins}
                onCategoryChange={handleCategoryChange}
                onShortcutChange={handleShortcutChange}
                onOpenBuiltinEditor={handleOpenBuiltinEditor}
                onOpenSelectPromptModal={() => setIsSelectPromptModalOpen(true)}
                onToast={toast}
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Select/Generate Prompt for Builtin Modal */}
      {isSelectPromptModalOpen && item.type === 'shortcut' && (
        <SelectPromptForBuiltinModal
          isOpen={isSelectPromptModalOpen}
          onClose={() => setIsSelectPromptModalOpen(false)}
          shortcutId={item.data.id}
          shortcutData={{
            label: item.data.label || '',
            available_scopes: item.data.available_scopes || []
          }}
          onSuccess={async (builtinId) => {
            handleShortcutChange('prompt_builtin_id', builtinId);
            const builtinsData = await fetchPromptBuiltins({ is_active: true });
            setBuiltins(builtinsData);
            setIsSelectPromptModalOpen(false);
          }}
        />
      )}

      {/* Prompt Settings Modal for Editing Builtin */}
      {isPromptSettingsOpen && editingBuiltinId && (() => {
        const builtin = builtins.find(b => b.id === editingBuiltinId);
        if (!builtin) return null;
        
        return (
          <PromptSettingsModal
            isOpen={isPromptSettingsOpen}
            onClose={() => {
              setIsPromptSettingsOpen(false);
              setEditingBuiltinId(null);
            }}
            promptId={builtin.id}
            promptName={builtin.name}
            promptDescription={builtin.description || ''}
            variableDefaults={builtin.variableDefaults || []}
            messages={builtin.messages || []}
            settings={builtin.settings || {}}
            models={models}
            availableTools={availableTools}
            onUpdate={handleUpdateBuiltin}
            onLocalStateUpdate={() => {}}
          />
        );
      })()}
    </>
  );
}

