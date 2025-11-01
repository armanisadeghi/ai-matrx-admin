import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SelectInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  variableName: string;
  allowOther?: boolean;
}

/**
 * Select Input - Dropdown single select that returns selected option as text
 */
export function SelectInput({ 
  value, 
  onChange, 
  options,
  variableName,
  allowOther = false
}: SelectInputProps) {
  const isValueInOptions = options.includes(value);
  const isOtherValue = value.startsWith('Other: ');
  const otherText = isOtherValue ? value.substring(7) : '';
  
  const [selectedOption, setSelectedOption] = useState<string>(() => {
    if (isValueInOptions) return value;
    if (isOtherValue) return 'Other';
    return value;
  });
  
  const [customText, setCustomText] = useState<string>(otherText);
  
  // Update when value changes externally
  useEffect(() => {
    if (isValueInOptions) {
      setSelectedOption(value);
      setCustomText('');
    } else if (isOtherValue) {
      setSelectedOption('Other');
      setCustomText(value.substring(7));
    }
  }, [value, isValueInOptions, isOtherValue]);
  
  const handleSelectChange = (newValue: string) => {
    setSelectedOption(newValue);
    if (newValue === 'Other') {
      // When "Other" is selected, send the current custom text
      onChange(customText ? `Other: ${customText}` : 'Other: ');
    } else {
      onChange(newValue);
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
            {value}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
            Select an option below to replace
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Select an option
        </Label>
        <Select value={selectedOption} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose an option..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
            {allowOther && (
              <SelectItem value="Other">
                Other
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* Custom text input when "Other" is selected */}
        {selectedOption === 'Other' && (
          <div className="pt-2">
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
    </div>
  );
}

