// MultiSelectField.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, SelectOption } from './types';
import { X, ChevronDown, Plus } from 'lucide-react';

export interface MultiSelectFieldConfig {
  options: SelectOption[];
  maxItems?: number;
  showSearch?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  createNewOption?: boolean;
  createNewMessage?: string;
  width?: string;
  maxHeight?: string;
  chipClassName?: string;
  dropdownClassName?: string;
  showSelectAll?: boolean;
  allowClear?: boolean;
  customConfig?: any;
}

const MultiSelectField: React.FC<FieldProps<MultiSelectFieldConfig>> = ({
  id,
  label,
  placeholder = "Select options",
  defaultValue = [],
  onValueChange,
  customConfig,
  customContent = null,
  isMobile = false,
}) => {
  // Extract config options with defaults
  const {
    options = [],
    maxItems,
    showSearch = true,
    searchPlaceholder = "Search...",
    emptyMessage = "No options available",
    createNewOption = false,
    createNewMessage = "Create new option",
    width = "w-full",
    maxHeight = "max-h-60",
    chipClassName = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    dropdownClassName = "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-lg",
    showSelectAll = true,
    allowClear = true,
  } = customConfig;

  // Use value broker for managing the selected values
  const { currentValue, setValue } = useValueBroker(id);
  
  // Local state for UI management
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [filteredOptions, setFilteredOptions] = useState<SelectOption[]>(options);
  const [customOptions, setCustomOptions] = useState<SelectOption[]>([]);
  
  // Refs for dropdown and input
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize with default values
  useEffect(() => {
    if (defaultValue && defaultValue.length > 0 && currentValue === null) {
      const initialValues = Array.isArray(defaultValue) ? defaultValue : [defaultValue];
      setValue(initialValues);
      setSelectedValues(initialValues);
    } else if (currentValue !== null) {
      const values = Array.isArray(currentValue) ? currentValue : [currentValue];
      setSelectedValues(values);
    }
  }, [defaultValue, currentValue, setValue]);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions([...options, ...customOptions]);
      return;
    }
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    const filtered = [...options, ...customOptions].filter(option => 
      option.label.toLowerCase().includes(lowerSearchTerm) ||
      option.value.toLowerCase().includes(lowerSearchTerm)
    );
    
    setFilteredOptions(filtered);
  }, [searchTerm, options, customOptions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    
    // Focus search input when opening
    if (nextIsOpen && showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  };

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    let newSelectedValues: string[];
    
    if (selectedValues.includes(optionValue)) {
      // Remove option if already selected
      newSelectedValues = selectedValues.filter(value => value !== optionValue);
    } else {
      // Add option if not at max items
      if (maxItems && selectedValues.length >= maxItems) {
        return;
      }
      newSelectedValues = [...selectedValues, optionValue];
    }
    
    setSelectedValues(newSelectedValues);
    setValue(newSelectedValues);
    
    if (onValueChange) {
      onValueChange(newSelectedValues);
    }
  };

  // Handle "Select All" action
  const handleSelectAll = () => {
    if (maxItems && filteredOptions.length > maxItems) {
      // If we have a max items limit, only select up to that limit
      const newSelectedValues = filteredOptions.slice(0, maxItems).map(option => option.value);
      setSelectedValues(newSelectedValues);
      setValue(newSelectedValues);
      
      if (onValueChange) {
        onValueChange(newSelectedValues);
      }
      
      return;
    }
    
    // Otherwise select all filtered options
    const newSelectedValues = filteredOptions.map(option => option.value);
    setSelectedValues(newSelectedValues);
    setValue(newSelectedValues);
    
    if (onValueChange) {
      onValueChange(newSelectedValues);
    }
  };

  // Handle "Clear All" action
  const handleClearAll = () => {
    setSelectedValues([]);
    setValue([]);
    
    if (onValueChange) {
      onValueChange([]);
    }
  };

  // Create a new custom option
  const handleCreateOption = () => {
    if (!searchTerm) return;
    
    const newOptionValue = searchTerm.trim();
    const existingOption = [...options, ...customOptions].find(
      option => option.label.toLowerCase() === newOptionValue.toLowerCase() ||
                option.value.toLowerCase() === newOptionValue.toLowerCase()
    );
    
    if (existingOption) {
      // If option already exists but not selected, select it
      if (!selectedValues.includes(existingOption.value)) {
        handleOptionSelect(existingOption.value);
      }
      return;
    }
    
    // Create new option
    const newOption: SelectOption = {
      value: `custom-${newOptionValue.toLowerCase().replace(/\s+/g, '-')}`,
      label: newOptionValue,
    };
    
    // Add to custom options
    setCustomOptions(prevOptions => [...prevOptions, newOption]);
    
    // Select the new option
    handleOptionSelect(newOption.value);
    
    // Clear search term
    setSearchTerm('');
  };

  // Remove a selected option
  const handleRemoveOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from toggling
    handleOptionSelect(optionValue);
  };

  // Get label text for a value
  const getLabelForValue = (value: string): string => {
    const option = [...options, ...customOptions].find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Render selected option chips
  const renderSelectedChips = () => {
    if (selectedValues.length === 0) {
      return (
        <div className="text-gray-500 dark:text-gray-400">{placeholder}</div>
      );
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {selectedValues.map(value => (
          <div key={value} className={`px-2 py-1 rounded-full text-xs flex items-center ${chipClassName}`}>
            <span className="truncate max-w-[150px]">{getLabelForValue(value)}</span>
            <button
              type="button"
              className="ml-1 text-xs rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 h-4 w-4 inline-flex items-center justify-center"
              onClick={(e) => handleRemoveOption(value, e)}
              aria-label={`Remove ${getLabelForValue(value)}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  if (customContent) {
    return <>{customContent}</>;
  }

  return (
    <div className={width}>
      {label && (
        <div className="mb-2 font-medium text-gray-800 dark:text-gray-200">{label}</div>
      )}
      
      <div className="relative" ref={dropdownRef}>
        {/* Selected options display */}
        <div
          className="w-full p-2 min-h-[42px] border rounded-md cursor-pointer flex items-center flex-wrap gap-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-none"
          onClick={toggleDropdown}
        >
          {renderSelectedChips()}
          
          {/* Dropdown indicator */}
          <div className="ml-auto pl-2">
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        
        {/* Dropdown content */}
        {isOpen && (
          <div className={`absolute z-10 w-full mt-1 overflow-auto ${maxHeight} ${dropdownClassName}`}>
            <div className="p-2">
              {/* Search input */}
              {showSearch && (
                <div className="relative mb-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-none border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      onClick={() => setSearchTerm('')}
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
              
              {/* Select All/Clear All buttons */}
              {(showSelectAll || allowClear) && filteredOptions.length > 0 && (
                <div className="flex justify-between mb-2 text-xs">
                  {showSelectAll && (
                    <button
                      type="button"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={handleSelectAll}
                    >
                      Select All
                    </button>
                  )}
                  {allowClear && selectedValues.length > 0 && (
                    <button
                      type="button"
                      className="text-gray-600 dark:text-gray-400 hover:underline"
                      onClick={handleClearAll}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}
              
              {/* Options list */}
              <div className="space-y-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(option => (
                    <div
                      key={option.value}
                      className={`flex items-center p-2 rounded-md cursor-pointer text-sm ${
                        selectedValues.includes(option.value)
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}
                      onClick={() => handleOptionSelect(option.value)}
                    >
                      <div className="flex-shrink-0 mr-2">
                        <input
                          type="checkbox"
                          checked={selectedValues.includes(option.value)}
                          onChange={() => {}} // Handled by parent div
                          className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-none"
                        />
                      </div>
                      <div className="flex items-center">
                        {option.icon && <span className="mr-2">{option.icon}</span>}
                        <span>{option.label}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm && createNewOption ? (
                      <button
                        type="button"
                        className="w-full text-left text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                        onClick={handleCreateOption}
                      >
                        {createNewMessage}: "{searchTerm}"
                      </button>
                    ) : (
                      emptyMessage
                    )}
                  </div>
                )}
                
                {/* Create new option button */}
                {searchTerm && createNewOption && filteredOptions.length > 0 && (
                  <div
                    className="flex items-center p-2 rounded-md cursor-pointer text-sm border-t border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 mt-1"
                    onClick={handleCreateOption}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>{createNewMessage}: "{searchTerm}"</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectField;