'use client';

import React, { useState, useEffect } from 'react';
import { SearchBar } from '@/components/image/shared/SearchBar';
import { SortOrder, ImageOrientation, PremiumFilter } from '@/hooks/images/useUnsplashGallery';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Grid, Grid3X3 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export interface UnsplashSearchProps {
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
  viewMode?: 'grid' | 'natural';
  onViewModeChange?: (mode: 'grid' | 'natural') => void;
}

export function UnsplashSearch({
  initialSearchTerm = '',
  onSearch,
  loading = false,
  className,
  currentSortOrder = 'relevant',
  currentOrientation,
  currentPremiumFilter = 'none',
  sortOrderOptions = ['relevant', 'latest', 'popular', 'oldest'],
  orientationOptions = ['landscape', 'portrait', 'squarish'],
  premiumFilterOptions = ['mixed', 'only', 'none'],
  viewMode = 'grid',
  onViewModeChange
}: UnsplashSearchProps) {
  // Local state for search options
  const [query, setQuery] = useState(initialSearchTerm);
  const [sortOrder, setSortOrder] = useState<SortOrder>(currentSortOrder);
  const [orientation, setOrientation] = useState<ImageOrientation>(currentOrientation);
  const [premiumFilter, setPremiumFilter] = useState<PremiumFilter>(currentPremiumFilter);

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

  // Handle view mode change
  const handleViewModeChange = (value: string) => {
    if (onViewModeChange && (value === 'grid' || value === 'natural')) {
      onViewModeChange(value);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar
          onSearch={handleSearchChange}
          loading={loading}
          placeholder="Search Unsplash..."
          defaultValue={query}
          className="w-[260px]"
          debounceTime={300}
          showClearButton={true}
          autoFocus={false}
        />
        
        {/* Sort Order as Select */}
        <Select value={sortOrder} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOrderOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Orientation as Select */}
        <Select value={orientation || 'any'} onValueChange={handleOrientationChange}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Orientation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {orientationOptions.map((option) => (
              option && (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              )
            ))}
          </SelectContent>
        </Select>
        
        {/* Premium Filter as Select */}
        <Select value={premiumFilter} onValueChange={handlePremiumChange}>
          <SelectTrigger className="w-[120px] h-9">
            <SelectValue placeholder="Premium" />
          </SelectTrigger>
          <SelectContent>
            {premiumFilterOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option === 'none' ? 'Free' : option.charAt(0).toUpperCase() + option.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <ToggleGroup type="single" value={viewMode} onValueChange={handleViewModeChange} className="h-9">
            <ToggleGroupItem value="grid" aria-label="Grid view" className="px-3">
              <Grid3X3 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="natural" aria-label="Natural view" className="px-3">
              <Grid className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Natural</span>
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
    </div>
  );
} 