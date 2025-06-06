'use client';

import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface ChangesIndicatorProps {
  hasChanges: boolean;
  className?: string;
  variant?: 'badge' | 'text' | 'inline';
}

/**
 * Component to indicate unsaved changes
 */
const ChangesIndicator: React.FC<ChangesIndicatorProps> = ({ 
  hasChanges, 
  className = '', 
  variant = 'badge' 
}) => {
  if (!hasChanges) return null;

  if (variant === 'badge') {
    return (
      <Badge variant="secondary" className={`bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 ${className}`}>
        <AlertCircle className="h-3 w-3 mr-1" />
        Unsaved Changes
      </Badge>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1 ${className}`}>
        <AlertCircle className="h-4 w-4" />
        You have unsaved changes
      </div>
    );
  }

  // inline variant
  return (
    <span className={`text-xs text-orange-600 dark:text-orange-400 ${className}`}>
      (unsaved)
    </span>
  );
};

export default ChangesIndicator; 