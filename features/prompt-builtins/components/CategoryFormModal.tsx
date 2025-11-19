'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, Loader2 } from 'lucide-react';
import { ShortcutCategory } from '../types';
import {
  CategoryFormFields,
  CategoryFormData,
  formDataToCreateInput,
  formDataToUpdateInput,
  validateCategoryFormData,
} from './CategoryFormFields';
import { createShortcutCategory, updateShortcutCategory } from '../services/admin-service';
import { getUserFriendlyError } from '../utils/error-handler';
import { PLACEMENT_TYPES } from '../constants';

interface CategoryFormModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** All categories for parent selection */
  allCategories: ShortcutCategory[];
  /** Category to edit (undefined = create mode) */
  editingCategory?: ShortcutCategory;
  /** Success callback with the created/updated category */
  onSuccess?: (category: ShortcutCategory) => void;
}

export function CategoryFormModal({
  isOpen,
  onClose,
  allCategories,
  editingCategory,
  onSuccess,
}: CategoryFormModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    label: '',
    placement_type: Object.values(PLACEMENT_TYPES)[0],
    parent_category_id: null,
    description: '',
    icon_name: 'Folder',
    color: '#666666',
    sort_order: 999,
    is_active: true,
    metadata: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isEditMode = !!editingCategory;

  // Reset form when modal opens/closes or editing category changes
  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        // Edit mode - populate from existing category
        setFormData({
          label: editingCategory.label,
          placement_type: editingCategory.placement_type,
          parent_category_id: editingCategory.parent_category_id,
          description: editingCategory.description || '',
          icon_name: editingCategory.icon_name,
          color: editingCategory.color,
          sort_order: editingCategory.sort_order,
          is_active: editingCategory.is_active,
          metadata: editingCategory.metadata || {},
        });
      } else {
        // Create mode - reset to defaults
        setFormData({
          label: '',
          placement_type: Object.values(PLACEMENT_TYPES)[0],
          parent_category_id: null,
          description: '',
          icon_name: 'Folder',
          color: '#666666',
          sort_order: 999,
          is_active: true,
          metadata: {},
        });
      }
      setErrors({});
    }
  }, [isOpen, editingCategory]);

  const handleSave = async () => {
    // Validate
    const validationErrors = validateCategoryFormData(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      let savedCategory: ShortcutCategory;

      if (isEditMode) {
        const updateInput = formDataToUpdateInput(editingCategory.id, formData);
        savedCategory = await updateShortcutCategory(updateInput);
        toast({
          title: 'Success',
          description: 'Category updated successfully',
        });
      } else {
        const createInput = formDataToCreateInput(formData);
        savedCategory = await createShortcutCategory(createInput);
        toast({
          title: 'Success',
          description: 'Category created successfully',
        });
      }

      onSuccess?.(savedCategory);
      onClose();
    } catch (error: any) {
      const errorMessage = getUserFriendlyError(error);
      toast({
        title: isEditMode ? 'Failed to Update Category' : 'Failed to Create Category',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return; // Prevent closing while saving
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {isEditMode ? 'Edit Category' : 'Create New Category'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isEditMode 
              ? 'Modify category properties and organization' 
              : 'Create a new category for organizing prompt shortcuts'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <CategoryFormFields
            initialData={editingCategory}
            allCategories={allCategories}
            formData={formData}
            onChange={setFormData}
            errors={errors}
            disabled={saving}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button 
            variant="outline" 
            onClick={handleClose} 
            disabled={saving}
            size="sm"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5" />
                {isEditMode ? 'Save Changes' : 'Create Category'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

