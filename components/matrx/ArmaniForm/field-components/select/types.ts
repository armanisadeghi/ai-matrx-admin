// File Location: '@/components/ui/select/types.ts'
import * as React from 'react'

export type AnimationLevel = 'none' | 'basic' | 'moderate' | 'enhanced'
export type SelectSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type ExpandTrigger = 'hover' | 'click'
export type DisplayMode = 'breadcrumb' | 'complete'
export type MatchFrom = 'start' | 'any' | 'word'
export type SelectPlacement = 'top' | 'bottom'

// Core System Types
export type SelectSubComponentType =
// Basic Types
    | 'basic'          // Standard single select
    | 'multiple'       // Multiple selection
    | 'combobox'       // Searchable select

    // Advanced Selection Types
    | 'cascading'      // Hierarchical selection
    | 'grouped'        // Options with groups
    | 'virtualized'    // Performance-optimized for large lists
    | 'async'          // Async data loading

    // Specialized Types
    | 'tags'           // Tag-style multiple select with creation
    | 'split'          // Split button with default + options
    | 'tree'           // Tree-style hierarchical select
    | 'transfer'       // Two-column transfer selection

    // Command Types
    | 'command'        // Command palette style
    | 'contextual'     // Context-aware options
    | 'searchable'     // Enhanced search capabilities

// Add this to types.ts
export interface GroupedProps extends SelectBaseProps {
    grouped?: {
        groupClassName?: string
        showGroupCounts?: boolean
        collapsible?: boolean
        expandedGroups?: string[]
        onGroupToggle?: (group: string) => void
        groupHeaderClassName?: string
        groupContentClassName?: string
        indentLevel?: number
    }
}
// Base Option Types
export interface SelectOption {
    value: string | number
    label: string
    disabled?: boolean
    icon?: React.ReactNode
    description?: string
    meta?: Record<string, any>
}

export interface OptionGroup {
    label: string
    options: SelectOption[]
    disabled?: boolean
}

export interface HierarchicalOption extends SelectOption {
    children?: HierarchicalOption[]
    expanded?: boolean
    level?: number
    path?: string[]
}

// Behavior Configuration
export interface SelectBehavior {
    closeOnSelect?: boolean
    searchable?: boolean
    creatable?: boolean
    clearable?: boolean
    loading?: boolean
    virtualized?: boolean
    async?: boolean
    multiple?: boolean
    disabled?: boolean
    // Add these new properties
    openOnFocus?: boolean
    preserveSearch?: boolean
    selectOnEnter?: boolean
    clearOnSelect?: boolean
    allowEmpty?: boolean
    freeSolo?: boolean      // Allows custom values not in options
    autoHighlight?: boolean // Automatically highlight first option
    max?: number            // Maximum number of selections
}

// Search Configuration
export interface SearchConfig {
    debounce?: number
    minLength?: number
    placeholder?: string
    ignoreCase?: boolean
    matchFrom?: MatchFrom
    keys?: string[]
    loadOptions?: (query: string) => Promise<SelectOption[]>
    // Add these new properties
    filterOptions?: (options: SelectOption[], inputValue: string) => SelectOption[]
    noOptionsText?: string
    loadingText?: string
    searchKeys?: string[]    // Specific fields to search within options
    searchMode?: 'contains' | 'startsWith' | 'endsWith' | 'exact'
    highlightMatches?: boolean
    minQueryLength?: number
    maxResults?: number
    sortResults?: boolean
    sortFn?: (a: SelectOption, b: SelectOption) => number
}

// Visual Configuration
export interface VisualConfig {
    placement?: SelectPlacement
    maxHeight?: string
    width?: string | 'auto' | 'trigger'
    showCheckmarks?: boolean
    showIcons?: boolean
    truncate?: boolean
    animation?: AnimationLevel
    size?: SelectSize
    placeholder?: string
    // Add these new properties
    showSearchIcon?: boolean
    showClearButton?: boolean
    highlightStyle?: 'background' | 'text' | 'underline'
    dropdownClassName?: string
    inputClassName?: string
    optionClassName?: string
    loadingIndicatorClassName?: string
}

// Validation Configuration
export interface ValidationConfig {
    required?: boolean
    min?: number
    max?: number
    custom?: (value: any) => boolean | string
    errorMessage?: string
}

// Base Props Interface
export interface SelectBaseProps {
    value: any
    onChange: (value: any) => void
    options: SelectOption[] | OptionGroup[] | HierarchicalOption[]
    behavior?: SelectBehavior
    search?: SearchConfig
    visual?: VisualConfig
    validation?: ValidationConfig
    className?: string
    name?: string
    id?: string
    disabled?: boolean
    placeholder?: string
    tabIndex?: number
    autoFocus?: boolean
    'aria-label'?: string
    'aria-description'?: string
}

export interface InternalSelectProps extends SelectBaseProps {
    ref?: React.Ref<any>
}

// System Props (what gets passed to EntitySelect)
export interface EntitySelectProps {
    value: string | string[] | null
    onChange: (value: string | string[] | null) => void
    componentProps: {
        subComponent: SelectSubComponentType
        options: any[]
        // Add structured configuration
        visual?: VisualConfig
        search?: SearchConfig
        validation?: ValidationConfig
        // Keep the catch-all for backward compatibility
        [key: string]: any
    }
    name?: string
    displayName?: string
    description?: string
}

// Add to types.ts
export interface VirtualizedProps extends SelectBaseProps {
    virtualized?: {
        height?: number
        itemHeight?: number
        overscan?: number
        onEndReached?: () => void
        endReachedThreshold?: number
        loadingMore?: boolean
        scrollToIndex?: number
        initialScrollOffset?: number
        onScroll?: (scrollOffset: number) => void
    }
}
// Specialized Component Props
export interface ComboboxProps extends SelectBaseProps {
    creatable?: {
        formatCreate?: (query: string) => string
        validate?: (value: string) => boolean
        onCreate?: (value: string) => void
        allowDuplicates?: boolean
    }
}

export interface CascadingProps extends SelectBaseProps {
    cascade?: {
        separator?: string
        expandTrigger?: ExpandTrigger
        changeOnSelect?: boolean
        loadData?: (option: HierarchicalOption) => Promise<HierarchicalOption[]>
        displayMode?: DisplayMode
        expandedPaths?: string[]
        onPathChange?: (paths: string[]) => void
        pathDelimiter?: string
    }
}


export interface TransferProps extends SelectBaseProps {
    transfer?: {
        titles?: [string, string]
        operations?: string[]
        filterable?: boolean
        pagination?: boolean
        itemsPerPage?: number
        sourceOptions?: SelectOption[]
        targetOptions?: SelectOption[]
    }
}

export interface CommandProps extends SelectBaseProps {
    command?: {
        shortcut?: string
        category?: string
        keywords?: string[]
        action?: () => void
        groups?: {
            [key: string]: SelectOption[]
        }
    }
}

export interface TagProps extends SelectBaseProps {
    tags?: {
        createTag?: boolean
        maxTags?: number
        validateTag?: (tag: string) => boolean | string
        transformTag?: (tag: string) => string
        allowDuplicates?: boolean
        delimiter?: string | RegExp
        pasteSeparator?: string | RegExp
    }
}

export interface SplitProps extends SelectBaseProps {
    split?: {
        defaultOption: SelectOption
        showDefaultInList?: boolean
        onDefaultOptionClick?: (option: SelectOption) => void
        dropdownIcon?: React.ReactNode
        splitButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
        dropdownButtonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>
    }
}


// Internal Props (used by individual components)
export interface InternalSelectProps extends SelectBaseProps {
    'aria-label'?: string
    'aria-description'?: string
    ref?: React.Ref<any>
}


export function isSelectOption(option: SelectOption | OptionGroup | HierarchicalOption): option is SelectOption {
    return 'value' in option && !('children' in option) && !('options' in option)
}

export function isOptionGroup(option: SelectOption | OptionGroup | HierarchicalOption): option is OptionGroup {
    return 'options' in option
}

export function isHierarchicalOption(option: SelectOption | OptionGroup | HierarchicalOption): option is HierarchicalOption {
    return 'children' in option
}
