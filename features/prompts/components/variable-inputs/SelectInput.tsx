import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  variableName: string;
}

/**
 * Select Input - Dropdown single select that returns selected option as text
 */
export function SelectInput({ 
  value, 
  onChange, 
  options,
  variableName 
}: SelectInputProps) {
  const isValueInOptions = options.includes(value);
  
  return (
    <div className="space-y-4">
      {/* Show current value if it doesn't match any option */}
      {value && !isValueInOptions && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
            Current value:
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {value}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Select an option below to replace
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Select an option
        </Label>
        <Select value={isValueInOptions ? value : undefined} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose an option..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

