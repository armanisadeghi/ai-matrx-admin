import React, { useEffect, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, SelectFieldConfig, SelectOption } from './types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const SelectField: React.FC<FieldProps<SelectFieldConfig>> = ({
  id,
  label,
  placeholder = "Select an option",
  defaultValue,
  onValueChange,
  customConfig = {},
  customContent = null,
  isMobile = false
}) => {
  // Extract select config options with defaults
  const {
    options = [],
    inputPlaceholder = "Search...",
    emptyMessage = "None found.",
    width = "w-full",
    showGroups = true
  } = customConfig as SelectFieldConfig;

  // Use value broker for managing the selected value
  const { currentValue, setValue } = useValueBroker(id);
  
  // UI state for popover open/close
  const [open, setOpen] = useState<boolean>(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  
  // Find and set the selected label whenever currentValue changes
  useEffect(() => {
    if (currentValue) {
      const option = options.find(opt => opt.value === currentValue);
      if (option) {
        setSelectedLabel(option.label);
      }
    } else {
      setSelectedLabel("");
    }
  }, [currentValue, options]);
  
  // Initialize with defaultValue if provided and no currentValue exists
  useEffect(() => {
    if (defaultValue !== undefined && currentValue === null) {
      setValue(defaultValue);
    }
  }, [defaultValue, currentValue]);

  // Group options by their group property
  const groupedOptions = React.useMemo(() => {
    if (!showGroups) {
      return [{ heading: '', items: options }];
    }
    
    const groups: Record<string, SelectOption[]> = {};
    
    options.forEach(option => {
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
  }, [options, showGroups]);
  
  // Handle selection
  const handleSelect = (value: string) => {
    setValue(value);
    setOpen(false);
    if (onValueChange) {
      onValueChange(value);
    }
  };

  if (customContent) {
    return <>{customContent}</>;
  }

  const displayValue = selectedLabel || placeholder;

  return (
    <div className={width}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`flex items-center justify-between w-full p-2 text-left rounded-md outline-none 
              bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 
              hover:bg-gray-50 dark:hover:bg-gray-750 focus:bg-white dark:focus:bg-gray-800 
              focus:border-gray-200 dark:focus:border-gray-700 focus:ring-none`}
            aria-expanded={open}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronDown 
              className={`w-4 h-4 opacity-70 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md" 
          align="start"
        >
          <Command className="w-full rounded-lg">
            <CommandInput 
              placeholder={inputPlaceholder} 
              className="border-0 focus:ring-0 text-gray-700 dark:text-gray-300 bg-transparent"
            />
            <CommandList className="max-h-52 overflow-auto">
              <CommandEmpty className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">
                {emptyMessage}
              </CommandEmpty>
              {groupedOptions.map((group, groupIndex) => (
                <CommandGroup 
                  key={`${id}-group-${groupIndex}`} 
                  heading={group.heading}
                  className={!group.heading ? 'pt-0' : undefined}
                >
                  {group.items.map((item, itemIndex) => (
                    <CommandItem 
                      key={`${id}-item-${groupIndex}-${itemIndex}`} 
                      className="py-2 px-3 cursor-pointer focus:bg-gray-100 dark:focus:bg-gray-700 aria-selected:bg-gray-100 dark:aria-selected:bg-gray-700 text-gray-700 dark:text-gray-300"
                      onSelect={() => handleSelect(item.value)}
                      value={item.value}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon && (
                          <span className="flex items-center justify-center text-gray-600 dark:text-gray-400">
                            {item.icon}
                          </span>
                        )}
                        <span>{item.label}</span>
                        {currentValue === item.value && (
                          <Check className="w-4 h-4 ml-auto text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SelectField;