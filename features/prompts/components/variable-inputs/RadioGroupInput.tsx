import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

interface RadioGroupInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  variableName: string;
  allowOther?: boolean;
}

// Placeholder for empty or whitespace-only values
const EMPTY_VALUE_PLACEHOLDER = '(empty)';

/**
 * Checks if a value is empty or contains only whitespace
 */
const isEmptyOrWhitespace = (value: string): boolean => {
  return !value || value.trim() === '';
};

/**
 * Converts empty/whitespace values to placeholder for display
 */
const toDisplayValue = (value: string): string => {
  return isEmptyOrWhitespace(value) ? EMPTY_VALUE_PLACEHOLDER : value;
};

/**
 * Converts display value back to original value (empty string if placeholder)
 */
const fromDisplayValue = (displayValue: string): string => {
  return displayValue === EMPTY_VALUE_PLACEHOLDER ? '' : displayValue;
};

/**
 * Radio Group Input - Single select that returns selected option as text
 */
export function RadioGroupInput({ 
  value, 
  onChange, 
  options,
  variableName,
  allowOther = false
}: RadioGroupInputProps) {
  // Convert options to display values for comparison
  const displayOptions = options.map(toDisplayValue);
  const displayValue = toDisplayValue(value);
  
  const isValueInOptions = displayOptions.includes(displayValue);
  const isOtherValue = value.startsWith('Other: ');
  const otherText = isOtherValue ? value.substring(7) : ''; // Remove "Other: " prefix
  
  const [selectedOption, setSelectedOption] = useState<string>(() => {
    if (isValueInOptions) return displayValue;
    if (isOtherValue) return 'Other';
    return '';
  });
  
  const [customText, setCustomText] = useState<string>(otherText);
  
  // Update when value changes externally
  useEffect(() => {
    const newDisplayValue = toDisplayValue(value);
    if (isValueInOptions) {
      setSelectedOption(newDisplayValue);
      setCustomText('');
    } else if (isOtherValue) {
      setSelectedOption('Other');
      setCustomText(value.substring(7));
    }
  }, [value, isValueInOptions, isOtherValue]);
  
  const handleOptionChange = (newDisplayValue: string) => {
    setSelectedOption(newDisplayValue);
    if (newDisplayValue === 'Other') {
      // When "Other" is selected, send the current custom text
      onChange(customText ? `Other: ${customText}` : 'Other: ');
    } else {
      // Convert display value back to actual value (empty string if placeholder)
      const actualValue = fromDisplayValue(newDisplayValue);
      onChange(actualValue);
      setCustomText('');
    }
  };
  
  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    onChange(`Other: ${text}`);
  };
  
  const showNonMatchingValue = value && !isValueInOptions && !isOtherValue;
  
  return (
    <div className="space-y-4">
      {/* Show current value if it doesn't match any option */}
      {showNonMatchingValue && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
            Current value:
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-200">
            {value || '(empty)'}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Select an option below to replace
          </p>
        </div>
      )}
      
      <RadioGroup value={selectedOption} onValueChange={handleOptionChange}>
        <div className="space-y-2">
          {options.map((option, index) => {
            // Convert empty/whitespace values to placeholder for RadioGroupItem
            const displayOption = toDisplayValue(option);
            // Use index in key to handle duplicate empty values
            const itemKey = isEmptyOrWhitespace(option) ? `empty-${index}` : option;
            
            return (
              <div 
                key={itemKey}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => handleOptionChange(displayOption)}
              >
                <RadioGroupItem value={displayOption} id={`${variableName}-${displayOption}-${index}`} />
                <Label 
                  htmlFor={`${variableName}-${displayOption}-${index}`}
                  className="flex-1 text-sm cursor-pointer"
                >
                  {displayOption}
                </Label>
              </div>
            );
          })}
          
          {/* "Other" option */}
          {allowOther && (
            <div className="space-y-2">
              <div 
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => handleOptionChange('Other')}
              >
                <RadioGroupItem value="Other" id={`${variableName}-other`} />
                <Label 
                  htmlFor={`${variableName}-other`}
                  className="flex-1 text-sm cursor-pointer"
                >
                  Other
                </Label>
              </div>
              
              {/* Custom text input when "Other" is selected */}
              {selectedOption === 'Other' && (
                <div className="ml-9 pl-3">
                  <Textarea
                    value={customText}
                    onChange={(e) => handleCustomTextChange(e.target.value)}
                    placeholder="Enter custom value..."
                    className="min-h-[80px] text-sm"
                    autoFocus
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </RadioGroup>
    </div>
  );
}

