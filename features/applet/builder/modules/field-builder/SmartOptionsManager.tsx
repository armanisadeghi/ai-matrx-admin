'use client';

import React, { useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { Trash2Icon, PlusCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { selectFieldOptions } from '@/lib/redux/app-builder/selectors/fieldSelectors';
import { updateOption, deleteOption, addOption } from '@/lib/redux/app-builder/slices/fieldBuilderSlice';
import { v4 as uuidv4 } from 'uuid';

interface SmartOptionsManagerProps {
  fieldId: string;
}

const SmartOptionsManager: React.FC<SmartOptionsManagerProps> = ({ fieldId }) => {
  const dispatch = useAppDispatch();
  const options = useAppSelector(state => selectFieldOptions(state, fieldId)) || [];

  // Check if the last option has any content - if it does or if there are no options, we need an empty row
  const needsEmptyRow = useMemo(() => {
    if (options.length === 0) return true;
    
    const lastOption = options[options.length - 1];
    return lastOption.label.trim() !== '' || (lastOption.description || '').trim() !== '';
  }, [options]);
  
  const handleOptionChange = (index: number, key: string, value: string) => {
    const option = options[index];
    if (option) {
      dispatch(updateOption({
        id: fieldId,
        optionId: option.id,
        changes: { [key]: value }
      }));
      
      // If this is the last row and user started typing, add a new empty row
      if (index === options.length - 1 && value.trim() !== '' && needsEmptyRow) {
        addEmptyOption();
      }
    }
  };

  const handleRemoveOption = (index: number) => {
    const option = options[index];
    if (option) {
      dispatch(deleteOption({
        id: fieldId,
        optionId: option.id
      }));
    }
  };
  
  const addEmptyOption = () => {
    dispatch(addOption({
      id: fieldId,
      option: {
        id: uuidv4(),
        label: '',
        description: ''
      }
    }));
  };
  
  // Focus handler to select all text when field is focused
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  }, []);
  
  // If we need an empty row and there are no options, add one
  React.useEffect(() => {
    if (options.length === 0) {
      addEmptyOption();
    }
  }, [options.length]);

  return (
    <div className="space-y-3 pt-2 w-full">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Component Options</h3>
      </div>
      
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-2 w-full">
            {/* Label field - fixed width */}
            <Input
              placeholder="Label"
              value={option.label}
              onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
              onFocus={handleFocus}
              className="h-8 text-sm border-gray-200 dark:border-gray-700 w-full"
              tabIndex={index * 2 + 1}
            />
            
            {/* Description field - flex grow to fill available space */}
            <Input
              placeholder="Description (optional)"
              value={option.description || ''}
              onChange={(e) => handleOptionChange(index, 'description', e.target.value)}
              onFocus={handleFocus}
              className="h-8 text-sm border-gray-200 dark:border-gray-700 w-full"
              tabIndex={index * 2 + 2}
            />
            
            {/* Delete button - positioned at far right with negative tab index to skip during tab navigation */}
            <Button
              onClick={() => handleRemoveOption(index)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 flex-shrink-0 ml-auto"
              title="Remove option"
              tabIndex={-1} // Skip in tab order
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        ))}
        
        {/* Always show the add option button */}
        <Button
          onClick={addEmptyOption}
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-center mt-1 border border-dashed border-gray-200 dark:border-gray-700 rounded-md text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 h-8"
        >
          <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
          Add option
        </Button>
      </div>
    </div>
  );
};

export default SmartOptionsManager; 