/**
 * HierarchicalCategorySelector
 * 
 * A tree-based category selector that groups categories by placement type
 * Can be used as a dropdown or as a full tree view
 */

'use client';

import React, { useMemo } from 'react';
import { ShortcutCategory } from '../types/core';
import { getPlacementTypeMeta } from '../constants';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface HierarchicalCategorySelectorProps {
  categories: ShortcutCategory[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface CategoryGroup {
  placementType: string;
  placementLabel: string;
  categories: ShortcutCategory[];
}

export function HierarchicalCategorySelector({
  categories,
  value,
  onValueChange,
  placeholder = 'Select category...',
  className,
}: HierarchicalCategorySelectorProps) {
  
  // Group categories by placement type
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, CategoryGroup>();

    categories.forEach(category => {
      const placementType = category.placement_type;
      const meta = getPlacementTypeMeta(placementType);

      if (!groups.has(placementType)) {
        groups.set(placementType, {
          placementType,
          placementLabel: meta.label,
          categories: [],
        });
      }

      groups.get(placementType)!.categories.push(category);
    });

    // Sort categories within each group
    groups.forEach(group => {
      group.categories.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.label.localeCompare(b.label);
      });
    });

    // Convert to array and sort by placement type label
    return Array.from(groups.values()).sort((a, b) => 
      a.placementLabel.localeCompare(b.placementLabel)
    );
  }, [categories]);

  // Get selected category for display
  const selectedCategory = categories.find(c => c.id === value);
  const selectedPlacementMeta = selectedCategory 
    ? getPlacementTypeMeta(selectedCategory.placement_type)
    : null;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedCategory && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {selectedPlacementMeta?.label}
              </Badge>
              <span>{selectedCategory.label}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {groupedCategories.map(group => (
          <SelectGroup key={group.placementType}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase">
              {group.placementLabel}
            </SelectLabel>
            {group.categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  <span>{category.label}</span>
                  {category.description && (
                    <span className="text-xs text-muted-foreground">
                      - {category.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

