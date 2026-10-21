'use client';

import { useState } from 'react';
import { Check, ChevronDown, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ai-matrx/design-system';
import { Button } from '@ai-matrx/design-system/controls';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

export interface FilterOption {
  id: string;
  label: string;
  sublabel?: string;
  count?: number;
}

interface HierarchyFilterPillProps {
  label: string;
  allLabel: string;
  options: FilterOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onNew?: () => void;
  newLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function HierarchyFilterPill({
  label,
  allLabel,
  options,
  selectedId,
  onSelect,
  onNew,
  newLabel,
  disabled,
  loading,
  className,
}: HierarchyFilterPillProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === selectedId);

  const handleSelect = (id: string) => {
    if (id === '__all__') {
      onSelect(null);
    } else {
      onSelect(id === selectedId ? null : id);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          variant="outline"
          tone={selected ? 'primary' : undefined}
          iconEnd={
            selected ? (
              <X
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(null);
                }}
              />
            ) : (
              <ChevronDown />
            )
          }
          className={className}
        >
          {selected ? selected.label : allLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent sizing="content" className="p-0 rounded-xl border-border/50 shadow-xl" align="start" sideOffset={6}>
        <Command>
          {options.length > 5 && (
            <CommandInput placeholder={`Search...`} className="text-base h-8 text-xs" style={{ fontSize: '16px' }} />
          )}
          <CommandList className="max-h-[240px]">
            <CommandEmpty className="py-4 text-xs">None found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => handleSelect('__all__')}
                className="gap-2 text-xs py-1.5"
              >
                <div className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
                  !selectedId ? 'border-primary bg-primary text-primary-foreground' : 'border-border/60',
                )}>
                  {!selectedId && <Check className="h-2.5 w-2.5" />}
                </div>
                <span className="font-medium">{allLabel}</span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                  {options.length}
                </span>
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => handleSelect(option.id)}
                  className="gap-2 text-xs py-1.5"
                >
                  <div className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center rounded-sm border',
                    selectedId === option.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border/60',
                  )}>
                    {selectedId === option.id && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <span className="truncate">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-[9px] text-muted-foreground">{option.sublabel}</span>
                  )}
                  {option.count !== undefined && (
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums shrink-0">
                      {option.count}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            {onNew && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`__new_${label}__`}
                    onSelect={() => { setOpen(false); onNew(); }}
                    className="gap-2 text-xs py-1.5 text-primary"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="font-medium">{newLabel ?? `New ${label}`}</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
