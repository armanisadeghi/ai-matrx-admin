"use client";

import { type ReactNode, useState } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, ControlRow, SearchField } from "@ai-matrx/design-system/controls";
import {
  HierarchyFilterPill,
  type FilterOption,
} from "@/components/hierarchy-filter/HierarchyFilterPill";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { UntrustedCount, type CountRead } from "@ai-matrx/design-system";

export interface FilterDef {
  key: string;
  label: string;
  allLabel: string;
  options: FilterOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

interface ResearchFilterBarProps {
  title: string;
  count?: string;
  /**
   * The read behind `count` (`{ status, error }` — a table's `read=` fits). A
   * failed read shows "—" with an "unavailable" label instead of the count.
   */
  read?: CountRead | null;
  filters: FilterDef[];
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  trailing?: ReactNode;
  className?: string;
}

function FilterDrawerContent({
  filters,
  onClose,
}: {
  filters: FilterDef[];
  onClose: () => void;
}) {
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const hasActiveFilters = filters.some((f) => f.selectedId !== null);
  const activeFilter = activeFilterKey
    ? filters.find((f) => f.key === activeFilterKey)
    : null;

  const resetAll = () => {
    for (const f of filters) f.onSelect(null);
  };

  const filteredOptions = activeFilter
    ? searchQuery
      ? activeFilter.options.filter((o) =>
          o.label.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : activeFilter.options
    : [];

  const headerTitle = activeFilter ? activeFilter.label : "Filters";

  return (
    <div className="flex flex-col h-full">
      {/* Stable header — back button space always reserved */}
      <div className="flex items-center px-2 pt-2 pb-1 min-h-[44px]">
        <button
          onClick={() => {
            activeFilterKey
              ? (setActiveFilterKey(null), setSearchQuery(""))
              : onClose();
          }}
          className={cn(
            "flex items-center gap-0.5 min-h-[44px] min-w-[72px] px-1 active:opacity-70 transition-opacity",
            activeFilterKey
              ? "text-primary"
              : "text-transparent pointer-events-none",
          )}
          aria-hidden={!activeFilterKey}
          tabIndex={activeFilterKey ? 0 : -1}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-[15px]">Back</span>
        </button>
        <span className="text-[17px] font-semibold flex-1 text-center">
          {headerTitle}
        </span>
        <div className="min-w-[72px] flex justify-end px-1">
          {!activeFilter && hasActiveFilters && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-primary active:opacity-70 min-h-[44px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="text-[15px]">Reset</span>
            </button>
          )}
          {!activeFilter && !hasActiveFilters && (
            <button
              onClick={onClose}
              className="text-primary active:opacity-70 min-h-[44px] text-[15px]"
            >
              Done
            </button>
          )}
        </div>
      </div>

      {/* Search bar for detail view with many options */}
      {activeFilter && activeFilter.options.length > 6 && (
        <div className="px-4 pb-2">
          <SearchField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            end={
              searchQuery ? (
                <Button
                  variant="quiet"
                  removes
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  icon={<X />}
                />
              ) : undefined
            }
          />
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto pb-safe">
        {activeFilter ? (
          <>
            <button
              onClick={() => {
                activeFilter.onSelect(null);
                setActiveFilterKey(null);
                setSearchQuery("");
              }}
              className="flex items-center w-full px-5 min-h-[44px] active:bg-glass-active transition-colors border-b border-glass-edge"
            >
              <span
                className={cn(
                  "text-[15px] flex-1 text-left",
                  !activeFilter.selectedId && "font-medium",
                )}
              >
                {activeFilter.allLabel}
              </span>
              {!activeFilter.selectedId && (
                <Check className="h-5 w-5 text-primary shrink-0" />
              )}
            </button>

            {filteredOptions.map((option, idx) => (
              <button
                key={option.id}
                onClick={() => {
                  activeFilter.onSelect(
                    option.id === activeFilter.selectedId ? null : option.id,
                  );
                  setActiveFilterKey(null);
                  setSearchQuery("");
                }}
                className={cn(
                  "flex items-center w-full px-5 min-h-[44px] active:bg-glass-active transition-colors",
                  idx < filteredOptions.length - 1 &&
                    "border-b border-glass-edge",
                )}
              >
                <span
                  className={cn(
                    "text-[15px] flex-1 text-left truncate",
                    activeFilter.selectedId === option.id && "font-medium",
                  )}
                >
                  {option.label}
                </span>
                {option.count !== undefined && (
                  <span className="type-body text-muted-foreground tabular-nums mr-3 shrink-0">
                    {option.count}
                  </span>
                )}
                {activeFilter.selectedId === option.id && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            ))}

            {filteredOptions.length === 0 && searchQuery && (
              <div className="flex items-center justify-center py-8 text-muted-foreground type-body">
                No matches found
              </div>
            )}
          </>
        ) : (
          <>
            {filters.map((f, idx) => {
              const selected = f.options.find((o) => o.id === f.selectedId);
              return (
                <button
                  key={f.key}
                  onClick={() => setActiveFilterKey(f.key)}
                  className={cn(
                    "flex items-center w-full px-5 min-h-[52px] active:bg-glass-active transition-colors",
                    idx < filters.length - 1 && "border-b border-glass-edge",
                  )}
                >
                  <span className="text-[15px] font-medium flex-1 text-left">
                    {f.label}
                  </span>
                  <span
                    className={cn(
                      "text-[15px] mr-1.5 truncate max-w-[180px]",
                      selected ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {selected ? selected.label : f.allLabel}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                </button>
              );
            })}

            {hasActiveFilters && (
              <div className="pt-4 pb-2">
                <p className="type-body text-muted-foreground text-center">
                  {filters.filter((f) => f.selectedId !== null).length} active{" "}
                  {filters.filter((f) => f.selectedId !== null).length === 1
                    ? "filter"
                    : "filters"}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ResearchFilterBar({
  title,
  count,
  read,
  filters,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  trailing,
  className,
}: ResearchFilterBarProps) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showSearch = onSearchChange !== undefined;
  const hasActiveFilters = filters.some((f) => f.selectedId !== null);

  const resetAll = () => {
    for (const f of filters) f.onSelect(null);
  };

  const pills = filters.map((f) => (
    <HierarchyFilterPill
      key={f.key}
      label={f.label}
      allLabel={f.allLabel}
      options={f.options}
      selectedId={f.selectedId}
      onSelect={f.onSelect}
    />
  ));

  return (
    <>
      <div className={cn("rounded-lg border border-border bg-card", className)}>
        {/* Wraps (never clips): at tablet widths the facets + actions need a second line. */}
        <ControlRow>
          <span className="type-meta font-medium text-foreground/80 pl-1.5 shrink-0">
            {title}
          </span>
          {count && (
            <span className="type-meta text-muted-foreground tabular-nums shrink-0">
              {read ? <UntrustedCount value={count} read={read} label={title} /> : count}
            </span>
          )}

          {!isMobile && pills}

          {hasActiveFilters && !isMobile && (
            <Button
              variant="quiet"
              onClick={resetAll}
              aria-label="Reset filters"
              icon={<RotateCcw />}
            />
          )}

          {showSearch && (
            <>
              <div className="w-px h-4 bg-border/30 mx-0.5 hidden sm:block" />
              <SearchField
                className="flex-1 min-w-[9rem]"
                value={search ?? ""}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                end={
                  search ? (
                    <Button
                      variant="quiet"
                      removes
                      onClick={() => onSearchChange?.("")}
                      aria-label="Clear search"
                      icon={<X />}
                    />
                  ) : undefined
                }
              />
            </>
          )}

          {isMobile && filters.length > 0 && (
            <Button
              variant="quiet"
              onClick={() => setDrawerOpen(true)}
              aria-label="Filters"
              icon={<SlidersHorizontal />}
              badge={hasActiveFilters}
            />
          )}

          {trailing}
        </ControlRow>
      </div>

      {isMobile && filters.length > 0 && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="h-[85dvh] bg-background">
            <DrawerTitle className="sr-only">Filters</DrawerTitle>
            <FilterDrawerContent
              filters={filters}
              onClose={() => setDrawerOpen(false)}
            />
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
