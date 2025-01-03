'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, History } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import QuickRefSearchableSelect from "@/app/entities/quick-reference/dynamic-quick-ref/QuickRefSearchableSelect";
import { QuickReferenceRecord } from "@/lib/redux/entity/types/stateTypes";
import PlaygroundHistoryDialog from "./PlaygroundHistoryDialog";
import PlaygroundNavContainer from "./PlaygroundNavContainer";

interface PlaygroundHeaderCenterProps {
  initialSettings?: {
    recipe?: QuickReferenceRecord;
    version?: number;
  };
  currentMode?: string;
  onModeChange?: (mode: string) => void;
  onVersionChange?: (version: number) => void;
}

const PlaygroundHeaderCenter = ({
  initialSettings = {},
  currentMode = "prompt",
  onModeChange = () => {},
  onVersionChange = () => {},
}: PlaygroundHeaderCenterProps) => {
  const [version, setVersion] = useState(initialSettings?.version ?? 1);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const [selectedRecipe, setSelectedRecipe] = useState<
    QuickReferenceRecord | undefined
  >(initialSettings?.recipe);

  const handleRecipeChange = (record: QuickReferenceRecord) => {
    setSelectedRecipe(record);
  };

  const handleVersionChange = (newVersion: number) => {
    setVersion(newVersion);
    onVersionChange(newVersion);
  };


  return (
    <div className="flex items-center w-full px-2 h-10 gap-2">
      <PlaygroundNavContainer
        currentMode={currentMode}
        onModeChange={onModeChange}
      />



      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="min-w-[160px] max-w-[320px] w-full">
          <QuickRefSearchableSelect
            entityKey="recipe"
            initialSelectedRecord={selectedRecipe}
            onRecordChange={handleRecipeChange}
          />
        </div>

        <Select
          value={version.toString()}
          onValueChange={(v) => handleVersionChange(Number(v))}
        >
          <SelectTrigger className="h-8 w-24">
            <div className="flex items-center">
              <span className="text-sm">
                Version {initialSettings?.version ?? 1}
              </span>
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

        <Button variant="ghost" size="md" className="h-8 w-8 p-0 shrink-0">
          <Plus size={16} />
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => setIsHistoryOpen(true)}
        >
          <History size={16} />
        </Button>
      </div>

      <PlaygroundHistoryDialog
        isOpen={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
      />
    </div>
  );
};

export default PlaygroundHeaderCenter;