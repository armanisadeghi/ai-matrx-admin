import React, { useState, useEffect } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import SearchField from '../SearchField';
import { useValueBroker } from '@/hooks/applets/useValueBroker';

// Types for command items
type CommandItemConfig = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

export type CommandGroupConfig = {
  brokerId: string;
  heading: string;
  items: any[];
};

// Main component props
interface SearchCommandFieldProps {
  id: string;
  label: string;
  placeholder?: string;
  inputPlaceholder?: string;
  emptyMessage?: string;
  groups?: CommandGroupConfig[];
  defaultSelected?: string;
  onSelect?: (value: string, groupHeading?: string) => void;
  isLast?: boolean;
  actionButton?: React.ReactNode;
  width?: string;
  customContent?: React.ReactNode;
}

const SearchCommandField: React.FC<SearchCommandFieldProps> = ({
  id,
  label,
  placeholder = "Select an option",
  inputPlaceholder = "Search...",
  emptyMessage = "None found.",
  groups = [],
  defaultSelected,
  onSelect,
  isLast = false,
  actionButton = null,
  width = "w-96",
  customContent = null
}) => {
  // Use value broker for managing the selected value
  const { currentValue, setValue } = useValueBroker(id);
  
  // UI state (not related to the persisted value)
  const [isActive, setIsActive] = useState<boolean>(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");

  // Initialize with defaultSelected if provided and no currentValue exists
  useEffect(() => {
    if (defaultSelected && currentValue === null) {
      setValue(defaultSelected);
    }
  }, [defaultSelected, currentValue, setValue]);

  // Find and set the selected label whenever currentValue changes
  useEffect(() => {
    if (currentValue) {
      for (const group of groups) {
        const item = group.items.find(item => item.value === currentValue);
        if (item) {
          setSelectedLabel(item.label);
          break;
        }
      }
    } else {
      setSelectedLabel("");
    }
  }, [currentValue, groups]);

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
  const handleSelect = (value: string, itemLabel: string, groupHeading?: string) => {
    setValue(value);
    setSelectedLabel(itemLabel);
    setIsActive(false);
    if (onSelect) {
      onSelect(value, groupHeading);
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
            {groups.map((group, groupIndex) => (
              <CommandGroup key={`${id}-group-${groupIndex}`} heading={group.heading}>
                {group.items.map((item, itemIndex) => (
                  <CommandItem 
                    key={`${id}-item-${groupIndex}-${itemIndex}`} 
                    className="py-2"
                    onSelect={() => handleSelect(item.value, item.label, group.heading)}
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

export default SearchCommandField;