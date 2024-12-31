import React from 'react';
import { MessageSquare, Bot } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const PlaygroundHistoryDialog = ({ isOpen, onOpenChange }) => {
  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search playground history..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Recent">
          <CommandItem className="flex items-center gap-2">
            <MessageSquare size={14} />
            <span>GPT-4 Temperature Analysis</span>
            <Badge variant="secondary" className="ml-auto">
              2h ago
            </Badge>
          </CommandItem>
          <CommandItem className="flex items-center gap-2">
            <Bot size={14} />
            <span>Claude Agent Experiment</span>
            <Badge variant="secondary" className="ml-auto">
              5h ago
            </Badge>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default PlaygroundHistoryDialog;