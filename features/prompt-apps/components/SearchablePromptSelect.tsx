'use client';

import { useState, useMemo } from 'react';
import { Check, Search, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Prompt {
  id: string;
  name: string;
  description?: string;
}

interface SearchablePromptSelectProps {
  prompts: Prompt[];
  value?: string;
  onChange: (promptId: string, prompt: Prompt) => void;
  placeholder?: string;
  /** Use smaller font sizes for compact layouts (e.g. demo/test pages) */
  compact?: boolean;
}

export function SearchablePromptSelect({
  prompts,
  value,
  onChange,
  placeholder = 'Select a prompt...',
  compact = false,
}: SearchablePromptSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedPrompt = prompts.find((p) => p.id === value);

  // Filter prompts based on search
  const filteredPrompts = useMemo(() => {
    if (!search.trim()) return prompts;
    
    const searchLower = search.toLowerCase().trim();
    return prompts.filter(
      (prompt) =>
        prompt.name.toLowerCase().includes(searchLower) ||
        prompt.description?.toLowerCase().includes(searchLower)
    );
  }, [prompts, search]);

  const handleSelect = (prompt: Prompt) => {
    onChange(prompt.id, prompt);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-auto text-left',
            compact ? 'min-h-7 text-xs' : 'min-h-[2.5rem]'
          )}
        >
          <div className="flex-1 min-w-0">
            {selectedPrompt ? (
              <div className={compact ? 'text-xs font-medium' : 'font-medium'}>{selectedPrompt.name}</div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={cn('ml-2 shrink-0 opacity-50', compact ? 'h-3 w-3' : 'h-4 w-4')} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className={cn('flex items-center border-b px-3', compact && 'px-2')}>
          <Search className={cn('mr-2 shrink-0 opacity-50', compact ? 'h-3 w-3' : 'h-4 w-4')} />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              'border-0 focus-visible:ring-0 focus-visible:ring-offset-0',
              compact ? 'h-8 text-xs' : 'h-10'
            )}
            style={compact ? undefined : { fontSize: '16px' }}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredPrompts.length === 0 ? (
            <div className={cn('py-6 text-center text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
              No prompts found
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleSelect(prompt)}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-start rounded-sm px-2 py-2 outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                  compact ? 'text-xs py-1.5' : 'text-sm py-2',
                  value === prompt.id && 'bg-accent/50'
                )}
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium">{prompt.name}</div>
                  {prompt.description && (
                    <div className={cn(
                      'text-muted-foreground line-clamp-2 mt-0.5',
                      compact ? 'text-[10px]' : 'text-xs'
                    )}>
                      {prompt.description}
                    </div>
                  )}
                </div>
                {value === prompt.id && (
                  <Check className={cn('ml-2 shrink-0 text-primary', compact ? 'h-3 w-3' : 'h-4 w-4')} />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

