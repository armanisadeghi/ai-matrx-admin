import React, { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export type Option = {
  value: string;
  label: string;
};

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  onChange: (value: Option) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  noResultsText = 'No results found.',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = options.find(option => option.value === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    
    const searchLower = search.toLowerCase().trim();
    return options.filter(option => 
      option.label.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            className={`w-full min-w-0 bg-elevation1 rounded-md p-2 text-sm inline-flex items-center justify-between border-2 border-elevation3 ${className}`}
          >
            <span className="truncate text-sm">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-elevation1 rounded-md border border-elevation3" 
          align="start"
        >
          <Command className="bg-elevation1" shouldFilter={false}>
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
                  className="text-ellipsis overflow-hidden hover:bg-primary hover:text-primary-foreground"
                >
                  <div 
                    className="flex-1"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{option.label}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SearchableSelect;