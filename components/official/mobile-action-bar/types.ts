/**
 * Shared TypeScript types for the Mobile Action Bar component system
 * 
 * These types enable reusable search, filter, and action components
 * that can work with any data type across the entire application.
 */

import { ReactNode } from "react";

/**
 * Configuration for a single filter option
 */
export interface FilterOption {
    value: string;
    label: string;
}

/**
 * Configuration for a filter field
 */
export interface FilterField {
    id: string;
    label: string;
    type: "select" | "multiselect" | "toggle" | "radio";
    options?: FilterOption[];
    placeholder?: string;
    description?: string;
}

/**
 * Complete filter configuration
 */
export interface FilterConfig {
    fields: FilterField[];
    /** Label for the entity being filtered (e.g., "prompts", "notes", "tasks") */
    entityLabel?: string;
    /** Singular form of entity label (e.g., "prompt", "note", "task") */
    entityLabelSingular?: string;
}

/**
 * Current state of active filters
 * Key is the filter field id, value is the selected value(s)
 */
export type FilterState = Record<string, string | string[] | boolean>;

/**
 * Props for the MobileActionBar component
 */
export interface MobileActionBarProps {
    // Search
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;

    // Filtering
    filterConfig?: FilterConfig;
    activeFilters?: FilterState;
    onFiltersChange?: (filters: FilterState) => void;

    // Results count (for filter drawer feedback)
    totalCount: number;
    filteredCount: number;

    // Primary action button
    onPrimaryAction?: () => void;
    primaryActionLabel?: string;
    primaryActionIcon?: ReactNode;

    // Customization
    showFilterButton?: boolean;
    showVoiceSearch?: boolean;
    
    // Additional props for modal/dialog states
    isFilterModalOpen?: boolean;
    setIsFilterModalOpen?: (open: boolean) => void;
}

/**
 * Props for the MobileFilterDrawer component
 */
export interface MobileFilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    
    // Filter configuration and state
    filterConfig: FilterConfig;
    activeFilters: FilterState;
    onFiltersChange: (filters: FilterState) => void;
    
    // Results count for live feedback
    totalCount: number;
    filteredCount: number;
    
    // Customization
    className?: string;
}

/**
 * Internal state for managing filter changes before applying
 */
export interface LocalFilterState {
    filters: FilterState;
    hasChanges: boolean;
}

