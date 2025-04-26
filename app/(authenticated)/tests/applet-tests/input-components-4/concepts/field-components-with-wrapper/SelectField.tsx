import React, { useState, useEffect } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import SearchField from '@/features/applet/runner/components/search-bar/field/SearchField';
import { useValueBroker } from '@/hooks/applets/useValueBroker';
import { FieldProps, SelectFieldConfig, SelectOption } from './types';

const SelectField: React.FC<FieldProps<SelectFieldConfig>> = ({
    id,
    label,
    placeholder = "Select an option",
    isLast = false,
    actionButton = null,
    defaultValue,
    onValueChange,
    customConfig = {},
    customContent = null
  }) => {
    // Extract select config options with defaults
    const {
      options = [],
      inputPlaceholder = "Search...",
      emptyMessage = "None found.",
      width = "w-96",
      showGroups = true
    } = customConfig as SelectFieldConfig;
  
    // Use value broker for managing the selected value
    const { currentValue, setValue } = useValueBroker(id);
    
    // UI state
    const [isActive, setIsActive] = useState<boolean>(false);
    const [selectedLabel, setSelectedLabel] = useState<string>("");
  
    // Initialize with defaultValue if provided and no currentValue exists
    useEffect(() => {
      if (defaultValue !== undefined && currentValue === null) {
        setValue(defaultValue);
      }
    }, [defaultValue, currentValue, setValue]);
  
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
  
    // Display placeholder or selected value
    const displayPlaceholder = selectedLabel || placeholder;
  
    // Handle field click
    const handleClick = () => {
      setIsActive(true);
    };
    
    // Handle open state change
    const handleOpenChange = (open: boolean) => {
      setIsActive(open);
    };
    
    // Handle selection
    const handleSelect = (value: string, itemLabel: string) => {
      setValue(value);
      setSelectedLabel(itemLabel);
      setIsActive(false);
      if (onValueChange) {
        onValueChange(value);
      }
    };
  
    return (
      <SearchField
        id={id}
        label={label}
        placeholder={displayPlaceholder}
        isActive={isActive}
        onClick={() => handleClick()}
        onOpenChange={(open) => handleOpenChange(open)}
        isLast={isLast}
        actionButton={actionButton}
      >
        {customContent ? (
          customContent
        ) : (
          <Command className={`rounded-lg border-none ${width}`}>
            <CommandInput placeholder={inputPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              {groupedOptions.map((group, groupIndex) => (
                <CommandGroup 
                  key={`${id}-group-${groupIndex}`} 
                  heading={group.heading}
                  // Only show group heading if it exists and showGroups is true
                  className={!group.heading ? 'pt-0' : undefined}
                >
                  {group.items.map((item, itemIndex) => (
                    <CommandItem 
                      key={`${id}-item-${groupIndex}-${itemIndex}`} 
                      className="py-2"
                      onSelect={() => handleSelect(item.value, item.label)}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon && item.icon}
                        <span>{item.label}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        )}
      </SearchField>
    );
  };
  
  export default SelectField;
  