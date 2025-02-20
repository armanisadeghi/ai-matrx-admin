import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';

// Define types for options and groups
type SelectOption = {
  label: string;
  value: string;
  group?: string;
  icon?: React.ReactNode;
};

type OptionGroup = {
  heading: string;
  items: SelectOption[];
};

type CustomStyles = {
  container?: string;
  trigger?: string;
  dropdown?: string;
  option?: string;
  optionSelected?: string;
  groupHeading?: string;
  searchInput?: string;
  emptyMessage?: string;
  floatingLabel?: string;
};

interface SearchableSelectProps {
  id: string;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  width?: string;
  showGroups?: boolean;
  emptyMessage?: string;
  customTrigger?: React.ReactNode;
  className?: string;
  customStyles?: CustomStyles;
  floatingLabel?: boolean;
  required?: boolean;
  error?: boolean;
}

/**
 * PortalDropdownSelect - Select with dropdown rendered in portal for better positioning
 */
const PortalDropdownSelect: React.FC<SearchableSelectProps> = ({
  id,
  label,
  placeholder = "Select an option",
  options = [],
  value,
  onChange,
  showSearch = true,
  searchPlaceholder = "Search...",
  disabled = false,
  width = "w-full",
  showGroups = true,
  emptyMessage = "No options found",
  customTrigger = null,
  className = "",
  customStyles = {},
  floatingLabel = false,
  required = false,
  error = false,
}) => {
  // State
  const [open, setOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number}>({
    top: 0, left: 0, width: 0
  });
  
  // State related to focus/value for floating label
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const hasValue = Boolean(value);
  
  // Refs
  const triggerRef = useRef<HTMLButtonElement>(null);
  
  // Find and update selected label when value changes
  useEffect(() => {
    if (value) {
      const option = options.find(opt => opt.value === value);
      if (option) {
        setSelectedLabel(option.label);
      }
    } else {
      setSelectedLabel('');
    }
  }, [value, options]);
  
  // Filter options based on search query
  const filteredOptions = searchQuery
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;
  
  // Group options if needed
  const groupedOptions = React.useMemo(() => {
    if (!showGroups) {
      return [{ heading: '', items: filteredOptions }];
    }
    
    const groups: Record<string, SelectOption[]> = {};
    
    filteredOptions.forEach(option => {
      const groupName = option.group || '';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(option);
    });
    
    return Object.entries(groups).map(([heading, items]) => ({
      heading,
      items
    }));
  }, [filteredOptions, showGroups]);
  
  // Handle selecting an option
  const handleSelect = (selectedValue: string) => {
    onChange?.(selectedValue);
    setOpen(false);
    setSearchQuery('');
  };
  
  // Update dropdown position when it opens
  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: Math.min(rect.bottom, window.innerHeight - 250) + window.scrollY + 5,
        left: rect.left,
        width: rect.width
      });
    }
  }, [open]);
  
  // Handle dropdown toggling
  const toggleDropdown = () => {
    if (!disabled) {
      setOpen(!open);
      if (!open) {
        setIsFocused(true);
        setSearchQuery('');
      } else {
        setIsFocused(false);
      }
    }
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // Only close if click is outside both trigger and dropdown
      const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(e.target as Node);
      const isOutsideDropdown = !document.querySelector('.portal-dropdown')?.contains(e.target as Node);
      
      if (isOutsideTrigger && isOutsideDropdown) {
        setOpen(false);
        setIsFocused(false);
      }
    };
    
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  // Default styles
  const defaultStyles = {
    container: "",
    trigger: `flex items-center justify-between w-full p-2 text-left rounded-md outline-none 
      bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 
      hover:bg-gray-50 dark:hover:bg-gray-750 focus:bg-white dark:focus:bg-gray-800 
      focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500`,
    dropdown: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
    option: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
    optionSelected: "bg-blue-50 dark:bg-blue-900/20",
    groupHeading: "text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-750",
    searchInput: "bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200",
    emptyMessage: "text-gray-500 dark:text-gray-400",
    floatingLabel: "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-20 text-sm",
  };

  // Merge default styles with custom styles
  const styles = {
    container: `${defaultStyles.container} ${customStyles.container || ""}`,
    trigger: `${defaultStyles.trigger} ${customStyles.trigger || ""}`,
    dropdown: `${defaultStyles.dropdown} ${customStyles.dropdown || ""}`,
    option: `${defaultStyles.option} ${customStyles.option || ""}`,
    optionSelected: `${defaultStyles.optionSelected} ${customStyles.optionSelected || ""}`,
    groupHeading: `${defaultStyles.groupHeading} ${customStyles.groupHeading || ""}`,
    searchInput: `${defaultStyles.searchInput} ${customStyles.searchInput || ""}`,
    emptyMessage: `${defaultStyles.emptyMessage} ${customStyles.emptyMessage || ""}`,
    floatingLabel: `${defaultStyles.floatingLabel} ${customStyles.floatingLabel || ""}`
  };

  // Display value (selected item or placeholder)
  const displayValue = selectedLabel || (floatingLabel && !isFocused ? '' : placeholder);

  // Render floating label
  const renderFloatingLabel = () => {
    if (!floatingLabel || !label) return null;
    
    const labelClass = `
      ${styles.floatingLabel}
      ${(isFocused || hasValue) ? 'text-sm -top-2.5' : 'text-base top-2 text-blue-500'}
      ${isFocused ? 'text-blue-500' : ''}
      ${disabled ? 'text-blue-400' : ''}
      ${error ? 'text-destructive' : ''}
      transition-all duration-200
    `;
    
    return (
      <label 
        htmlFor={`select-trigger-${id}`}
        className={labelClass}
      >
        {label}
        {required && !disabled && <span className="text-red-500 ml-1">*</span>}
      </label>
    );
  };

  // The dropdown rendered in a portal
  const renderDropdown = () => {
    if (!open) return null;
    
    return createPortal(
      <div 
        className={`fixed z-[9999] rounded-md shadow-lg overflow-auto portal-dropdown ${styles.dropdown}`}
        style={{
          width: dropdownPosition.width,
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          maxHeight: '250px',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        {showSearch && (
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className={`w-full py-2 pl-8 pr-3 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${styles.searchInput}`}
                autoFocus
              />
            </div>
          </div>
        )}
        
        {/* Options */}
        <div>
          {groupedOptions.length === 0 || 
           (groupedOptions.length === 1 && groupedOptions[0].items.length === 0) ? (
            <div className={`px-4 py-2 text-sm ${styles.emptyMessage}`}>{emptyMessage}</div>
          ) : (
            groupedOptions.map((group, groupIndex) => (
              <div key={`${id}-group-${groupIndex}`}>
                {showGroups && group.heading && (
                  <div className={`px-3 py-1 text-xs font-semibold ${styles.groupHeading}`}>
                    {group.heading}
                  </div>
                )}
                {group.items.map((option, optIndex) => (
                  <div
                    key={`${id}-option-${groupIndex}-${optIndex}`}
                    onClick={() => handleSelect(option.value)}
                    className={`px-3 py-2 flex items-center gap-3 cursor-pointer
                      ${styles.option}
                      ${value === option.value ? styles.optionSelected : ''}`}
                  >
                    {option.icon && (
                      <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
                        {option.icon}
                      </span>
                    )}
                    <span className="flex-grow truncate">{option.label}</span>
                    {value === option.value && (
                      <Check className="w-4 h-4 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={`relative ${width} ${className} ${styles.container}`}>
      {!floatingLabel && label && (
        <label htmlFor={`select-trigger-${id}`} className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && !disabled && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Trigger button */}
      <div className="relative">
        {renderFloatingLabel()}
        {customTrigger ? (
          <div onClick={toggleDropdown}>{customTrigger}</div>
        ) : (
          <button
            ref={triggerRef}
            id={`select-trigger-${id}`}
            type="button"
            onClick={toggleDropdown}
            disabled={disabled}
            className={`${styles.trigger} ${open ? 'ring-2 ring-blue-500 border-blue-500' : ''}
              ${error ? 'border-red-500' : ''}
              ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronDown className={`w-4 h-4 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`} />
          </button>
        )}
      </div>
      
      {/* Render dropdown in portal */}
      {renderDropdown()}
    </div>
  );
};

export default PortalDropdownSelect;