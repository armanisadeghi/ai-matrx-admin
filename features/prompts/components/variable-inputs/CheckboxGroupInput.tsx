import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface CheckboxGroupInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  variableName: string;
}

/**
 * Checkbox Group Input - Multi-select that returns selected options as newline-separated text
 */
export function CheckboxGroupInput({ 
  value, 
  onChange, 
  options,
  variableName 
}: CheckboxGroupInputProps) {
  // Parse current value into array of selected items
  const selectedItems = value ? value.split('\n').filter(Boolean) : [];
  
  // Check if all selected items are in options
  const hasNonOptionValues = selectedItems.some(item => !options.includes(item));
  
  const handleToggle = (option: string, checked: boolean) => {
    let newSelected: string[];
    
    if (checked) {
      // Add option if not already selected
      newSelected = [...selectedItems.filter(item => item !== option), option];
    } else {
      // Remove option
      newSelected = selectedItems.filter(item => item !== option);
    }
    
    // Convert back to newline-separated string
    onChange(newSelected.join('\n'));
  };
  
  return (
    <div className="space-y-4">
      {/* Show current value if it contains non-option values */}
      {value && hasNonOptionValues && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
            Current values:
          </p>
          <div className="text-sm text-amber-900 dark:text-amber-200 space-y-0.5">
            {selectedItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {!options.includes(item) && (
                  <span className="text-xs bg-amber-200 dark:bg-amber-800 px-1 rounded">Custom</span>
                )}
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Select options below to replace
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        {options.map((option) => {
          const isChecked = selectedItems.includes(option);
          
          return (
            <div 
              key={option}
              className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => handleToggle(option, !isChecked)}
            >
              <Checkbox 
                checked={isChecked}
                onCheckedChange={(checked) => handleToggle(option, checked as boolean)}
                id={`${variableName}-${option}`}
              />
              <Label 
                htmlFor={`${variableName}-${option}`}
                className="flex-1 text-sm cursor-pointer"
              >
                {option}
              </Label>
            </div>
          );
        })}
      </div>
      
      {selectedItems.length > 0 && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Selected: {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

