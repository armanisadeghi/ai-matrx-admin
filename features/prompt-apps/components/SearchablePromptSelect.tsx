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
}

export function SearchablePromptSelect({
  prompts,
  value,
  onChange,
  placeholder = 'Select a prompt...',
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
          className="w-full justify-between h-auto min-h-[2.5rem] text-left"
        >
          <div className="flex-1 min-w-0">
            {selectedPrompt ? (
              <div className="space-y-0.5">
                <div className="font-medium">{selectedPrompt.name}</div>
                {selectedPrompt.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {selectedPrompt.description}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ fontSize: '16px' }}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredPrompts.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No prompts found
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => handleSelect(prompt)}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-start rounded-sm px-2 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
                  value === prompt.id && 'bg-accent/50'
                )}
              >
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium">{prompt.name}</div>
                  {prompt.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {prompt.description}
                    </div>
                  )}
                </div>
                {value === prompt.id && (
                  <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

