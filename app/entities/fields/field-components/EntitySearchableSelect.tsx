// app/entities/fields/EntitySearchableSelect.tsx

import React, { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { EntityComponentBaseProps } from '../types';

interface Option {
  value: string;
  label: string;
}

interface EntitySearchableSelectProps extends EntityComponentBaseProps {
  className?: string;
}

const EntitySearchableSelect = React.forwardRef<HTMLDivElement, EntitySearchableSelectProps>(({
  entityKey,
  dynamicFieldInfo,
  value = '',
  onChange,
  disabled = false,
  density = 'normal',
  variant = 'default',
  className,
  ...props
}, ref) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Extract options from componentProps
  const customProps = dynamicFieldInfo.componentProps as Record<string, unknown>;
  const rawOptions = customProps?.options ?? [];
  
  const options = useMemo(() => {
    if (Array.isArray(rawOptions)) {
      return rawOptions.every((opt: unknown) => typeof opt === 'string')
        ? (rawOptions as string[]).map(opt => ({
            value: opt,
            label: opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase().replace(/_/g, ' ')
          }))
        : rawOptions as Option[];
    }
    return [];
  }, [rawOptions]);

  // Extract additional customization props safely
  const placeholder = customProps?.placeholder as string ?? 'Select an option';
  const searchPlaceholder = customProps?.searchPlaceholder as string ?? 'Search...';
  const noResultsText = customProps?.noResultsText as string ?? 'No results found.';

  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    
    const searchLower = search.toLowerCase().trim();
    return options.filter(option => 
      option.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const handleOptionSelect = (option: Option) => {
    onChange(option.value);
    setOpen(false);
  };

  const variants = {
    destructive: "border-destructive",
    success: "border-success",
    outline: "border-2",
    secondary: "bg-secondary",
    ghost: "border-none bg-transparent",
    link: "border-primary",
    primary: "border-primary",
    default: "border-input",
  };

  const densityConfig = {
    compact: "py-1 text-sm",
    normal: "py-2",
    comfortable: "py-3 text-lg",
  };

  return (
    <div className="w-full" ref={ref}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full min-w-0 bg-background rounded-md p-2 text-sm inline-flex items-center justify-between border",
              variants[variant as keyof typeof variants],
              densityConfig[density as keyof typeof densityConfig],
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
          >
            <span className="truncate text-sm">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-background rounded-md border" 
          align="start"
        >
          <Command className="bg-background" shouldFilter={false}>
            <div className="relative">
              <Input 
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-sm pr-8"
              />
              <Search className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground pointer-events-none opacity-50" />
            </div>
            <CommandEmpty className="text-sm py-2 px-2">{noResultsText}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleOptionSelect(option)}
                  className="text-ellipsis overflow-hidden hover:bg-primary hover:text-primary-foreground"
                >
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});

EntitySearchableSelect.displayName = "EntitySearchableSelect";

export default React.memo(EntitySearchableSelect);