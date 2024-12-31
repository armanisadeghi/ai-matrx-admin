"use client";

import React, { useState } from "react";
import { MatrxRecordId } from "@/lib/redux/entity/types/stateTypes";
import { useFetchQuickRef } from "../hooks/useFetchQuickRef";
import { useSelectQuickRef } from "../hooks/useSelectQuickRef";
import { FetchMode } from "@/lib/redux/entity/actions";
import { EntityKeys } from "@/types";
import { selectEntityPrettyName, selectEntitySelectText, useAppSelector } from "@/lib/redux";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type QuickReferenceRecord = {
  recordKey: MatrxRecordId;
  displayValue: string;
};

interface QuickRefSearchableSelectProps {
  entityKey?: EntityKeys;
  initialSelectedRecord?: QuickReferenceRecord;
  onRecordChange: (record: QuickReferenceRecord) => void;
  fetchMode?: FetchMode;
}

export const QuickRefSearchableSelect: React.FC<QuickRefSearchableSelectProps> = ({
  entityKey,
  initialSelectedRecord,
  onRecordChange,
  fetchMode = "fkIfk",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const selectText = useAppSelector((state) =>
    selectEntitySelectText(state, entityKey)
  );
  
  const entityPrettyName = useAppSelector((state) =>
    selectEntityPrettyName(state, entityKey)
  );

  // Fetch quick references
  useFetchQuickRef(entityKey);

  const { handleRecordSelect, quickReferenceRecords, setFetchMode } =
    useSelectQuickRef(entityKey);

  const [selectedRecordKey, setSelectedRecordKey] = useState<MatrxRecordId>(
    initialSelectedRecord?.recordKey || ""
  );

  React.useEffect(() => {
    setFetchMode(fetchMode);
  }, [entityKey, setFetchMode, fetchMode]);

  React.useEffect(() => {
    if (initialSelectedRecord) {
      setSelectedRecordKey(initialSelectedRecord.recordKey);
      onRecordChange(initialSelectedRecord);
    }
  }, [initialSelectedRecord, onRecordChange]);

  const selectedRecord = quickReferenceRecords?.find(
    (record) => record.recordKey === selectedRecordKey
  );

  const filteredRecords = React.useMemo(() => {
    if (!search.trim() || !quickReferenceRecords) return quickReferenceRecords;
    
    const searchLower = search.toLowerCase().trim();
    return quickReferenceRecords.filter(record => 
      record.displayValue.toLowerCase().includes(searchLower)
    );
  }, [quickReferenceRecords, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 bg-elevation1 rounded-md p-2 text-sm flex items-center justify-between border border-elevation3"
        >
          <span className="truncate text-sm">
            {selectedRecord ? selectedRecord.displayValue : selectText}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-elevation1 rounded-md" 
        align="start"
      >
        <Command className="bg-elevation1" shouldFilter={false}>
          <CommandInput 
            placeholder={`Search ${entityPrettyName?.toLowerCase()}...`}
            value={search}
            onValueChange={setSearch}
            className="text-sm"
          />
          <CommandEmpty className="text-sm py-2 px-2">No results found.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-auto">
            {filteredRecords?.map((record) => (
                <CommandItem
                  key={record.recordKey}
                  value={record.recordKey}
                  onSelect={() => {
                    setSelectedRecordKey(record.recordKey);
                    onRecordChange(record);
                    handleRecordSelect(record.recordKey);
                    setOpen(false);
                  }}
                  className="text-ellipsis overflow-hidden"
                >
                  <span className="truncate">{record.displayValue}</span>
                </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default QuickRefSearchableSelect;