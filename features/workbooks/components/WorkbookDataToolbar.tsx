"use client";

/**
 * Filter and Sort, directly visible in the workbook header (Google-Sheets
 * place for them). Univer's own ribbon tucks both into its overflow menu at
 * ordinary widths, so they are mirrored here and run the same commands.
 */

import type { RefObject } from "react";
import { ArrowDownAZ, ArrowDownZA, Filter, ListOrdered } from "lucide-react";
import type { FUniver } from "@univerjs/presets";
import { Button } from "@ai-matrx/design-system";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const run = (apiRef: RefObject<FUniver | null>, id: string) => {
  void apiRef.current?.executeCommand(id);
};

export function WorkbookDataToolbar({
  apiRef,
  editable,
}: {
  apiRef: RefObject<FUniver | null>;
  editable: boolean;
}) {
  if (!editable) return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 px-2 text-xs"
        title="Turn the header-row filter on or off for the selection"
        onClick={() => run(apiRef, "sheet.command.smart-toggle-filter")}
      >
        <Filter className="size-3" />
        <span className="hidden sm:inline">Filter</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            title="Sort the selected range"
          >
            <ArrowDownAZ className="size-3" />
            <span className="hidden sm:inline">Sort</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => run(apiRef, "sheet.command.sort-range-asc-ext")}>
            <ArrowDownAZ className="size-3.5" /> A to Z
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(apiRef, "sheet.command.sort-range-desc-ext")}>
            <ArrowDownZA className="size-3.5" /> Z to A
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run(apiRef, "sheet.command.sort-range-custom")}>
            <ListOrdered className="size-3.5" /> Custom sort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
