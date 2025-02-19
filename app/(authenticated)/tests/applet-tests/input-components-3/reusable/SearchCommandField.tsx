import React, { useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import SearchField from '../SearchField';

// Types for command items
type CommandItemConfig = {
  label: string;
  value: string;
  icon?: React.ReactNode;
};

type CommandGroupConfig = {
  heading: string;
  items: CommandItemConfig[];
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
  // Internal state management
  const [isActive, setIsActive] = useState<boolean>(false);
  const [selectedValue, setSelectedValue] = useState<string | undefined>(defaultSelected);
  const [selectedLabel, setSelectedLabel] = useState<string>("");

  // When component mounts or defaultSelected changes, find and set the selected label
  React.useEffect(() => {
    if (defaultSelected) {
      for (const group of groups) {
        const item = group.items.find(item => item.value === defaultSelected);
        if (item) {
          setSelectedLabel(item.label);
          break;
        }
      }
    }
  }, [defaultSelected, groups]);

  // Display placeholder or selected value
  const displayPlaceholder = selectedLabel || placeholder;

  // Handle field click
  const handleClick = (id: string) => {
    setIsActive(true);
  };
  
  // Handle open state change
  const handleOpenChange = (open: string | null) => {
    setIsActive(Boolean(open));
  };
  
  // Handle selection
  const handleSelect = (value: string, itemLabel: string, groupHeading?: string) => {
    setSelectedValue(value);
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
      onClick={handleClick}
      onOpenChange={handleOpenChange}
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