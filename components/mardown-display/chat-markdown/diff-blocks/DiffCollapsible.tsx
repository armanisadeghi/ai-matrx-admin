/**
 * Minimal VS Code-style Collapsible for Diffs
 * 
 * Ultra-tight, professional collapsible component designed specifically
 * for code diffs. Much smaller and more compact than ChatCollapsibleWrapper.
 */

'use client';

import React, { useState, ReactNode } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffCollapsibleProps {
  icon: ReactNode;
  title: string;
  initialOpen?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Minimal, VS Code-inspired collapsible for diff blocks
 */
export const DiffCollapsible: React.FC<DiffCollapsibleProps> = ({
  icon,
  title,
  initialOpen = true,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden my-2', className)}
    >
      {/* Ultra-minimal header - VS Code style */}
      <CollapsibleTrigger className="flex items-center gap-1.5 w-full px-2 py-1 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
        {/* Chevron - rotates on open */}
        <ChevronRight
          className={cn(
            'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
        
        {/* Icon */}
        <div className="shrink-0">
          {icon}
        </div>
        
        {/* Title - very small, VS Code style */}
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </CollapsibleTrigger>

      {/* Content - minimal padding */}
      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

