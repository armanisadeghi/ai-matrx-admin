'use client';

import React from 'react';
import { useSelectedImages, ImageSource } from '../context/SelectedImagesProvider';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface SelectableImageCardProps {
  children: React.ReactNode;
  imageData: ImageSource;
  className?: string;
  onClick?: () => void;
}

export function SelectableImageCard({
  children,
  imageData,
  className,
  onClick
}: SelectableImageCardProps) {
  const { isSelected, toggleImage, selectionMode } = useSelectedImages();
  const selected = isSelected(imageData.id);

  const handleClick = (e: React.MouseEvent) => {
    if (selectionMode !== 'none') {
      e.stopPropagation();
      e.preventDefault();
      toggleImage(imageData);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className={cn(
        "relative group",
        selectionMode !== 'none' && "cursor-pointer",
        className
      )}
      onClick={handleClick}
    >
      {children}
      
      {selectionMode !== 'none' && (
        <div 
          className={cn(
            "absolute inset-0 transition-colors",
            selected ? "bg-blue-500/20 border-2 border-blue-500" : "group-hover:bg-black/5 dark:group-hover:bg-white/5"
          )}
        />
      )}
      
      {selectionMode !== 'none' && (
        <div className={cn(
          "absolute top-2 right-2 rounded-full transition-all",
          selected 
            ? "bg-blue-500 text-white" 
            : "bg-white/70 dark:bg-gray-800/70 border border-gray-300 dark:border-gray-600 text-transparent"
        )}>
          <Check className={cn(
            "h-5 w-5 p-1",
            selected ? "text-white" : "text-transparent dark:text-transparent"
          )} />
        </div>
      )}
    </div>
  );
} 