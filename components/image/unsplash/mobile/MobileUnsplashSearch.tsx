'use client';

import React, { useState, useEffect } from 'react';
import { SearchBar } from '@/components/image/shared/SearchBar';
import { SortOrder, ImageOrientation, PremiumFilter } from '@/hooks/images/useUnsplashGallery';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Sliders } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

export interface MobileUnsplashSearchProps {
  initialSearchTerm?: string;
  onSearch: (query: string, options?: {
    sortOrder?: SortOrder;
    orientation?: ImageOrientation;
    premiumFilter?: PremiumFilter;
  }) => void;
  loading?: boolean;
  className?: string;
  currentSortOrder?: SortOrder;
  currentOrientation?: ImageOrientation;
  currentPremiumFilter?: PremiumFilter;
  sortOrderOptions?: SortOrder[];
  orientationOptions?: ImageOrientation[];
  premiumFilterOptions?: PremiumFilter[];
}

export function MobileUnsplashSearch({
  initialSearchTerm = '',
  onSearch,
  loading = false,
  className,
  currentSortOrder = 'latest',
  currentOrientation,
  currentPremiumFilter = 'none',
  sortOrderOptions = ['latest', 'popular', 'relevant', 'oldest'],
  orientationOptions = ['landscape', 'portrait', 'squarish'],
  premiumFilterOptions = ['mixed', 'only', 'none']
}: MobileUnsplashSearchProps) {
  // Local state for search options
  const [query, setQuery] = useState(initialSearchTerm);
  const [sortOrder, setSortOrder] = useState<SortOrder>(currentSortOrder);
  const [orientation, setOrientation] = useState<ImageOrientation>(currentOrientation);
  const [premiumFilter, setPremiumFilter] = useState<PremiumFilter>(currentPremiumFilter);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Update our local state when props change
  useEffect(() => {
    setSortOrder(currentSortOrder);
    setOrientation(currentOrientation);
    setPremiumFilter(currentPremiumFilter);
  }, [currentSortOrder, currentOrientation, currentPremiumFilter]);

  // Handle search query changes
  const handleSearchChange = (newQuery: string) => {
    setQuery(newQuery);
    onSearch(newQuery, {
      sortOrder,
      orientation,
      premiumFilter
    });
  };

  // Handle sort order change with immediate feedback
  const handleSortChange = (value: string) => {
    const newSortOrder = value as SortOrder;
    setSortOrder(newSortOrder);
    onSearch(query, {
      sortOrder: newSortOrder,
      orientation,
      premiumFilter
    });
  };

  // Handle orientation change with immediate feedback
  const handleOrientationChange = (value: string) => {
    const newOrientation = value === 'any' ? undefined : value as ImageOrientation;
    setOrientation(newOrientation);
    onSearch(query, {
      sortOrder,
      orientation: newOrientation,
      premiumFilter
    });
  };

  // Handle premium filter change with immediate feedback
  const handlePremiumChange = (value: string) => {
    const newPremium = value as PremiumFilter;
    setPremiumFilter(newPremium);
    onSearch(query, {
      sortOrder,
      orientation,
      premiumFilter: newPremium
    });
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2">
        <SearchBar
          onSearch={handleSearchChange}
          loading={loading}
          placeholder="Search..."
          defaultValue={query}
          className="flex-1"
          debounceTime={300}
          showClearButton={true}
          autoFocus={false}
          buttonClassName="min-w-[50px]"
        />
        
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="flex-shrink-0 h-9 w-9">
              <Sliders className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-0">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-center">Filter Options</SheetTitle>
            </SheetHeader>
            
            <div className="space-y-6 pb-6">
              {/* Sort Order as Tabs */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-center mb-2">Sort By</p>
                <Tabs value={sortOrder} onValueChange={handleSortChange} className="w-full">
                  <TabsList className="grid grid-cols-4 w-full">
                    {sortOrderOptions.map((option) => (
                      <TabsTrigger key={option} value={option} className="text-xs">
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
              
              {/* Orientation as segmented control */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-center mb-2">Orientation</p>
                <SegmentedControl 
                  value={orientation || 'any'}
                  onValueChange={handleOrientationChange}
                  data={[
                    { value: 'any', label: 'Any' },
                    ...orientationOptions.filter(Boolean).map(option => ({
                      value: option as string,
                      label: option.charAt(0).toUpperCase() + option.slice(1)
                    }))
                  ]}
                  fullWidth
                />
              </div>
              
              {/* Premium filter as segmented control */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-center mb-2">Premium Content</p>
                <SegmentedControl 
                  value={premiumFilter}
                  onValueChange={handlePremiumChange}
                  data={premiumFilterOptions.map(option => ({
                    value: option,
                    label: option.charAt(0).toUpperCase() + option.slice(1)
                  }))}
                  fullWidth
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
} 