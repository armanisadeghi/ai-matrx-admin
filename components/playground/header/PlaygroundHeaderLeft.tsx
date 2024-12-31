import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { Plus, History, TrendingUpDown } from "lucide-react";
import QuickRefSearchableSelect from "@/app/(authenticated)/tests/forms/entity-final-test/dynamic-quick-ref/QuickRefSearchableSelect";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";

interface PlaygroundHeaderLeftProps {
  initialSettings?: {
    recipe?: QuickReferenceRecord;
    version?: number;
  };
  isLeftCollapsed?: boolean;
  onToggleBrokers?: () => void;
  onVersionChange?: (version: number) => void;
  onHistoryOpen?: () => void;
}

const PlaygroundHeaderLeft = ({
  initialSettings = {},
  isLeftCollapsed,
  onToggleBrokers = () => {},
  onVersionChange = () => {},
  onHistoryOpen = () => {},
}: PlaygroundHeaderLeftProps) => {
  const [selectedRecipe, setSelectedRecipe] = useState<QuickReferenceRecord | undefined>(
    initialSettings?.recipe
  );

  const handleRecipeChange = (record: QuickReferenceRecord) => {
    setSelectedRecipe(record);
  };

  return (
    <div className="flex items-center px-2 gap-1">
      <Button
        variant="ghost"
        size="md"
        onClick={onToggleBrokers}
        className="h-8 w-8 p-0"
        title={isLeftCollapsed ? "Open Brokers Panel" : "Close Brokers Panel"}
      >
        <TrendingUpDown size={18} />
      </Button>

      <div className="h-4 w-px bg-border mx-1" />

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="md" className="h-8 w-8 p-0">
          <Plus size={16} />
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="h-8 w-8 p-0"
          onClick={onHistoryOpen}
        >
          <History size={16} />
        </Button>
      </div>

      <QuickRefSearchableSelect
        entityKey="recipe"
        initialSelectedRecord={selectedRecipe}
        onRecordChange={handleRecipeChange}
      />

      <Select
        value={(initialSettings?.version ?? 1).toString()}
        onValueChange={(v) => onVersionChange(parseInt(v))}
      >
        <SelectTrigger className="h-8 w-24">
          <div className="flex items-center gap-2">
            <span className="text-sm">Version {initialSettings?.version ?? 1}</span>
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Select Version</SelectLabel>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((v) => (
              <SelectItem key={v} value={v.toString()}>
                Version {v}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default PlaygroundHeaderLeft;