'use client';

import React from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { SelectedOptionValue } from "../DirectMultiSelectField";

interface SelectionPillsProps {
  selectedOptions: SelectedOptionValue[];
  onRemove: (optionId: string) => void;
  onClearAll?: () => void;
  disabled?: boolean;
}

const SelectionPills: React.FC<SelectionPillsProps> = ({
  selectedOptions,
  onRemove,
  onClearAll,
  disabled = false,
}) => {
  if (selectedOptions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {selectedOptions.map((option) => (
        <Badge
          key={option.id}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 mr-1 mb-1"
          variant="secondary"
        >
          {option.label}
          {!disabled && (
            <X
              className="ml-1 h-3 w-3 text-gray-500 dark:text-gray-400 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(option.id);
              }}
            />
          )}
        </Badge>
      ))}
      
      {!disabled && onClearAll && selectedOptions.length > 1 && (
        <Badge
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 mr-1 mb-1 cursor-pointer"
          variant="secondary"
          onClick={onClearAll}
        >
          Clear All
          <X className="ml-1 h-3 w-3 text-gray-500 dark:text-gray-400" />
        </Badge>
      )}
    </div>
  );
};

export default SelectionPills;
