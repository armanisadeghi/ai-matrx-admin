/**
 * DuplicateShortcutModal
 * 
 * Two-step modal for duplicating shortcuts to a new category:
 * 1. Select placement type
 * 2. Select category within that placement
 * 
 * Duplicates all shortcut properties except id and timestamps
 */

'use client';

import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Copy, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { CategorySelector } from './CategorySelector';
import { getPlacementTypeMeta, PLACEMENT_TYPES } from '../constants';
import { getIconComponent } from '@/components/official/IconResolver';
import type { PromptShortcut, ShortcutCategory } from '../types/core';
import { duplicatePromptShortcut } from '../services/admin-service';
import { getUserFriendlyError } from '../utils/error-handler';

interface DuplicateShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shortcut: PromptShortcut & { category?: ShortcutCategory };
  categories: ShortcutCategory[];
}

export function DuplicateShortcutModal({
  isOpen,
  onClose,
  onSuccess,
  shortcut,
  categories,
}: DuplicateShortcutModalProps) {
  const [selectedPlacement, setSelectedPlacement] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedPlacement('');
      setSelectedCategory('');
      setError('');
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Reset category when placement changes
  React.useEffect(() => {
    setSelectedCategory('');
  }, [selectedPlacement]);

  const handleDuplicate = async () => {
    if (!selectedPlacement) {
      setError('Please select a placement type');
      return;
    }

    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      await duplicatePromptShortcut(shortcut.id, selectedCategory);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error duplicating shortcut:', err);
      const errorMsg = err.message || String(err);
      
      // Handle the unique constraint error specifically
      if (errorMsg.includes('prompt_shortcuts_unique_category_prompt') || errorMsg.includes('23505')) {
        const targetCategory = categories.find(c => c.id === selectedCategory);
        setError(
          `Cannot duplicate: The category "${targetCategory?.label || 'selected'}" already has a shortcut connected to this prompt builtin. ` +
          `Each category can only have one shortcut per prompt builtin. Please choose a different category or disconnect the existing shortcut first.`
        );
      } else {
        setError(getUserFriendlyError(err));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const sourcePlacementMeta = shortcut.category 
    ? getPlacementTypeMeta(shortcut.category.placement_type)
    : null;
  const selectedPlacementMeta = selectedPlacement 
    ? getPlacementTypeMeta(selectedPlacement) 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Shortcut
          </DialogTitle>
          <DialogDescription>
            Create a copy of &quot;{shortcut.label}&quot; in a new category
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source Info */}
          <div className="p-3 bg-muted rounded-md">
            <div className="text-sm font-medium mb-1">Duplicating from:</div>
            <div className="flex items-center gap-2">
              {sourcePlacementMeta && (
                <Badge variant="secondary" className="text-xs">
                  {sourcePlacementMeta.label}
                </Badge>
              )}
              {shortcut.category && (
                <>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <span className="text-sm">{shortcut.category.label}</span>
                </>
              )}
            </div>
          </div>

          {/* Step 1: Select Placement Type */}
          <div className="space-y-2">
            <Label htmlFor="placement-select">
              Placement Type <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
              <SelectTrigger id="placement-select">
                <SelectValue placeholder="Choose where to place the duplicate...">
                  {selectedPlacementMeta && (
                    <div className="flex items-center gap-2">
                      {(() => {
                        const IconComponent = getIconComponent(selectedPlacementMeta.icon as any);
                        return <IconComponent className="h-4 w-4" />;
                      })()}
                      {selectedPlacementMeta.label}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PLACEMENT_TYPES).map(([key, value]) => {
                  const meta = getPlacementTypeMeta(value);
                  const IconComponent = getIconComponent(meta.icon as any);
                  const categoriesCount = categories.filter(c => c.placement_type === value).length;
                  
                  return (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {meta.label}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {categoriesCount}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Select Category */}
          <div className="space-y-2">
            <Label htmlFor="category-select" className={!selectedPlacement ? 'text-muted-foreground' : ''}>
              Category <span className="text-destructive">*</span>
              {!selectedPlacement && <span className="text-xs ml-2">(select placement first)</span>}
            </Label>
            <CategorySelector
              categories={categories}
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              placeholder={selectedPlacement ? "Choose a category..." : "Select placement type first"}
              allowedPlacementTypes={selectedPlacement ? [selectedPlacement] : undefined}
              disabled={!selectedPlacement}
            />
            {selectedPlacement && categories.filter(c => c.placement_type === selectedPlacement).length === 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">
                No categories found for this placement type.
              </p>
            )}
          </div>

          {/* Info note */}
          {selectedCategory && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                The duplicate will have the same name, description, prompt configuration, scope mappings, and all other settings as the original.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleDuplicate}
            disabled={isProcessing || !selectedPlacement || !selectedCategory}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


