'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ChipProps {
  label: string;
  id?: string;
  onRemove?: () => void;
  className?: string;
}

export const SimpleChip = ({ label, onRemove, className }: ChipProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full",
        "bg-primary/10 text-primary text-sm",
        className
      )}
    >
      {label}
      {onRemove && (
        <button 
          onClick={onRemove}
          className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
          aria-label="Remove chip"
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
};

