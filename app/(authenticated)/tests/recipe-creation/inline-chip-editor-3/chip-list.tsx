'use client';

import React from 'react';
import { ContentItem } from './types';
import { ShimmerChip, GlowBorderChip } from './ChipVariants';


interface ChipListProps {
  chips: ContentItem[];
  onRemoveChip: (id: string) => void;
}

export const ChipList = ({ chips, onRemoveChip }: ChipListProps) => {
  if (chips.length === 0) return null;

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <h3 className="text-sm font-medium text-foreground mb-2">
        Referenced Chips:
      </h3>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <GlowBorderChip
            key={chip.id}
            label={chip.content}
            onRemove={() => onRemoveChip(chip.id!)}
          />
        ))}
      </div>
    </div>
  );
};