import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface RadioGroupInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  variableName: string;
}

/**
 * Radio Group Input - Single select that returns selected option as text
 */
export function RadioGroupInput({ 
  value, 
  onChange, 
  options,
  variableName 
}: RadioGroupInputProps) {
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
      
      <RadioGroup value={isValueInOptions ? value : undefined} onValueChange={onChange}>
        <div className="space-y-2">
          {options.map((option) => (
            <div 
              key={option}
              className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() => onChange(option)}
            >
              <RadioGroupItem value={option} id={`${variableName}-${option}`} />
              <Label 
                htmlFor={`${variableName}-${option}`}
                className="flex-1 text-sm cursor-pointer"
              >
                {option}
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}

