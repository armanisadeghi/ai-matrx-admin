// File Location: '@/components/ui/select/entity-select.tsx'
"use client"

import * as React from 'react'
import {MatrxBasicSelect} from './basic-select'
import {MatrxMultipleSelect} from './multiple-select'
import {MatrxCombobox} from './combobox'
import {MatrxCascadingSelect} from './cascading-select'
import {MatrxGroupedSelect} from './grouped-select'
import {MatrxVirtualizedSelect} from './virtualized-select'
import {MatrxAsyncSelect} from './async-select'
import {MatrxTagSelect} from './tag-select'
import {MatrxSplitSelect} from './split-select'
import {
    EntitySelectProps,
    SelectOption,
    OptionGroup,
    HierarchicalOption,
    SelectBaseProps,
    VisualConfig,
    ValidationConfig,
    SearchConfig,
    SelectBehavior,
    SplitProps,
    isSelectOption
} from './types'
import {cn} from "@/utils/cn";

export const MatrxEntitySelect: React.FC<EntitySelectProps> = (
    {
        value,
        onChange,
        componentProps,
        name,
        displayName,
        description
    }) => {
    // Transform any option format to our internal format
    const normalizeOptions = (options: any[]): SelectOption[] | OptionGroup[] | HierarchicalOption[] => {
        if (!Array.isArray(options)) return []

        // Detect option type based on structure
        const firstOption = options[0]
        if (!firstOption) return []

        if ('options' in firstOption) {
            // Group format
            return options.map(group => ({
                label: group.label,
                options: group.options.map(opt => normalizeOption(opt)),
                disabled: group.disabled
            }))
        }

        if ('children' in firstOption) {
            // Hierarchical format
            return options.map(opt => ({
                ...normalizeOption(opt),
                children: opt.children ? normalizeOptions(opt.children) as HierarchicalOption[] : undefined,
                expanded: opt.expanded,
                level: opt.level,
                path: opt.path
            }))
        }

        // Standard format
        return options.map(normalizeOption)
    }

    const normalizeOption = (opt: any): SelectOption => {
        if (typeof opt === 'string' || typeof opt === 'number') {
            return {value: opt, label: String(opt)}
        }
        return {
            value: opt.value ?? opt.id ?? opt,
            label: opt.label ?? opt.name ?? String(opt),
            disabled: opt.disabled,
            icon: opt.icon,
            description: opt.description,
            meta: opt.meta
        }
    }

    // Create standardized configuration objects
    const createBaseProps = (): SelectBaseProps => ({
        value,
        onChange,
        options: normalizeOptions(componentProps.options),
        behavior: createBehaviorConfig(),
        visual: createVisualConfig(),
        validation: createValidationConfig(),
        search: createSearchConfig(),
        className: componentProps.className,
        name,
        id: componentProps.id
    })

    const createBehaviorConfig = (): SelectBehavior => ({
        closeOnSelect: componentProps.closeOnSelect ?? true,
        searchable: componentProps.searchable ?? false,
        creatable: componentProps.creatable ?? false,
        clearable: componentProps.clearable ?? true,
        loading: componentProps.loading ?? false,
        virtualized: componentProps.subComponent === 'virtualized',
        async: componentProps.subComponent === 'async',
        multiple: componentProps.subComponent === 'multiple',
        disabled: componentProps.disabled ?? false,
        openOnFocus: componentProps.openOnFocus ?? true,
        preserveSearch: componentProps.preserveSearch ?? false,
        selectOnEnter: componentProps.selectOnEnter ?? true,
        clearOnSelect: componentProps.clearOnSelect ?? false,
        allowEmpty: componentProps.allowEmpty ?? true,
        freeSolo: componentProps.freeSolo ?? false,
        autoHighlight: componentProps.autoHighlight ?? true
    })

    const createVisualConfig = (): VisualConfig => ({
        placement: componentProps.placement ?? 'bottom',
        maxHeight: componentProps.maxHeight ?? '300px',
        width: componentProps.width ?? 'trigger',
        showCheckmarks: componentProps.showCheckmarks ?? true,
        showIcons: componentProps.showIcons ?? true,
        truncate: componentProps.truncate ?? false,
        animation: componentProps.animation || 'basic',
        size: componentProps.size || 'md',
        showSearchIcon: componentProps.showSearchIcon ?? true,
        showClearButton: componentProps.showClearButton ?? true,
        highlightStyle: componentProps.highlightStyle ?? 'background',
        dropdownClassName: componentProps.dropdownClassName,
        inputClassName: componentProps.inputClassName,
        optionClassName: componentProps.optionClassName,
        loadingIndicatorClassName: componentProps.loadingIndicatorClassName
    })

    const createValidationConfig = (): ValidationConfig => ({
        required: componentProps.required,
        min: componentProps.min,
        max: componentProps.max,
        custom: componentProps.validate,
        errorMessage: componentProps.error
    })

    const createSearchConfig = (): SearchConfig => ({
        debounce: componentProps.debounceMs ?? 300,
        minLength: componentProps.minLength ?? 0,
        placeholder: componentProps.searchPlaceholder ?? 'Search...',
        ignoreCase: componentProps.ignoreCase ?? true,
        matchFrom: componentProps.matchFrom ?? 'any',
        keys: componentProps.searchKeys ?? ['label'],
        loadOptions: componentProps.loadOptions,
        filterOptions: componentProps.filterOptions,
        noOptionsText: componentProps.noOptionsText ?? 'No options found',
        loadingText: componentProps.loadingText ?? 'Loading...',
        searchKeys: componentProps.searchKeys ?? ['label', 'description'],
        searchMode: componentProps.searchMode ?? 'contains',
        highlightMatches: componentProps.highlightMatches ?? true,
        minQueryLength: componentProps.minQueryLength ?? 1,
        maxResults: componentProps.maxResults,
        sortResults: componentProps.sortResults ?? false,
        sortFn: componentProps.sortFn
    })

    // Create component-specific props
    const createComponentProps = () => {
        const baseProps = createBaseProps()

        switch (componentProps.subComponent) {
            case 'combobox':
                return {
                    ...baseProps,
                    behavior: {
                        ...baseProps.behavior,
                        searchable: true,
                        creatable: componentProps.creatable ?? false,
                        closeOnSelect: componentProps.closeOnSelect ?? true,
                        openOnFocus: componentProps.openOnFocus ?? true,
                        preserveSearch: componentProps.preserveSearch ?? false,
                        selectOnEnter: componentProps.selectOnEnter ?? true,
                        clearOnSelect: componentProps.clearOnSelect ?? false,
                        freeSolo: componentProps.freeSolo ?? false,
                        autoHighlight: componentProps.autoHighlight ?? true
                    },
                    search: {
                        ...baseProps.search,
                        debounce: componentProps.debounceMs ?? 300,
                        minLength: componentProps.minLength ?? 0,
                        placeholder: componentProps.searchPlaceholder ?? 'Search...',
                        ignoreCase: componentProps.ignoreCase ?? true,
                        matchFrom: componentProps.matchFrom ?? 'any',
                        filterOptions: componentProps.filterOptions,
                        noOptionsText: componentProps.noOptionsText ?? 'No options found',
                        loadingText: componentProps.loadingText ?? 'Loading...',
                        searchKeys: componentProps.searchKeys ?? ['label', 'description'],
                        searchMode: componentProps.searchMode ?? 'contains',
                        highlightMatches: componentProps.highlightMatches ?? true,
                        minQueryLength: componentProps.minQueryLength ?? 1,
                        maxResults: componentProps.maxResults,
                        sortResults: componentProps.sortResults ?? false,
                        sortFn: componentProps.sortFn
                    },
                    visual: {
                        ...baseProps.visual,
                        maxHeight: componentProps.maxHeight ?? '300px',
                        showCheckmarks: componentProps.showCheckmarks ?? true,
                        showIcons: componentProps.showIcons ?? true,
                        showSearchIcon: componentProps.showSearchIcon ?? true,
                        showClearButton: componentProps.showClearButton ?? true,
                        highlightStyle: componentProps.highlightStyle ?? 'background',
                        dropdownClassName: componentProps.dropdownClassName,
                        inputClassName: componentProps.inputClassName,
                        optionClassName: componentProps.optionClassName
                    }
                }

            case 'cascading':
                return {
                    ...baseProps,
                    options: normalizeOptions(componentProps.options) as HierarchicalOption[],
                    behavior: {
                        ...baseProps.behavior,
                        closeOnSelect: componentProps.closeOnSelect ?? false,
                        searchable: componentProps.searchable ?? false,
                        clearable: componentProps.clearable ?? true,
                        disabled: componentProps.disabled ?? false,
                        openOnFocus: componentProps.openOnFocus ?? true,
                        preserveSearch: false, // Cascading doesn't need search preservation
                        selectOnEnter: true,   // Always allow enter to select in cascading
                        allowEmpty: componentProps.allowEmpty ?? true,
                        autoHighlight: componentProps.autoHighlight ?? true
                    },
                    visual: {
                        ...baseProps.visual,
                        showIcons: componentProps.showIcons ?? true,
                        showCheckmarks: false, // Cascading doesn't use checkmarks
                        maxHeight: componentProps.maxHeight ?? '400px',
                        width: componentProps.width ?? 'trigger',
                        truncate: componentProps.truncate ?? true,
                        animation: componentProps.animation ?? 'moderate', // Default to moderate animation
                        showClearButton: componentProps.showClearButton ?? true,
                        highlightStyle: componentProps.highlightStyle ?? 'background',
                        dropdownClassName: cn(
                            componentProps.dropdownClassName,
                            'cascading-dropdown'
                        ),
                        optionClassName: cn(
                            componentProps.optionClassName,
                            'cascading-option'
                        )
                    },
                    cascade: {
                        separator: componentProps.separator ?? '/',
                        expandTrigger: componentProps.expandTrigger ?? 'click',
                        changeOnSelect: componentProps.changeOnSelect ?? true,
                        loadData: componentProps.loadChildren,
                        displayMode: componentProps.displayMode ?? 'complete',
                        pathDelimiter: componentProps.pathDelimiter ?? '/',
                        expandedPaths: componentProps.expandedPaths ?? [],
                        onPathChange: componentProps.onPathChange
                    },
                    validation: {
                        ...baseProps.validation,
                        min: undefined, // Cascading doesn't use min/max
                        max: undefined,
                        custom: componentProps.validate,
                        errorMessage: componentProps.error
                    },
                    search: componentProps.searchable ? {
                        ...baseProps.search,
                        debounce: componentProps.debounceMs ?? 300,
                        minLength: componentProps.minLength ?? 0,
                        placeholder: componentProps.searchPlaceholder ?? 'Search...',
                        ignoreCase: true, // Always ignore case for cascading search
                        matchFrom: componentProps.matchFrom ?? 'any',
                        searchKeys: ['label', 'path'], // Search in both label and path
                        searchMode: componentProps.searchMode ?? 'contains',
                        highlightMatches: componentProps.highlightMatches ?? true
                    } : undefined
                }

            case 'tags':
                return {
                    ...baseProps,
                    tags: {
                        createTag: componentProps.createTag ?? true,
                        maxTags: componentProps.maxTags,
                        validateTag: componentProps.validateTag,
                        transformTag: componentProps.transformTag,
                        allowDuplicates: componentProps.allowDuplicates ?? false,
                        delimiter: componentProps.delimiter ?? ',',
                        pasteSeparator: componentProps.pasteSeparator ?? /[,;\n]/
                    },
                    visual: {
                        ...baseProps.visual,
                        animation: componentProps.animation ?? 'basic',
                        placeholder: componentProps.placeholder ?? 'Add tags...',
                        inputClassName: cn(
                            componentProps.inputClassName,
                            'tag-input'
                        ),
                        optionClassName: cn(
                            componentProps.optionClassName,
                            'tag-item'
                        )
                    },
                    behavior: {
                        ...baseProps.behavior,
                        disabled: componentProps.disabled ?? false,
                        clearable: componentProps.clearable ?? true
                    },
                    validation: {
                        ...baseProps.validation,
                        errorMessage: componentProps.error
                    }
                }

            case 'split':
                const normalizedSplitOptions = normalizeOptions(componentProps.options).filter(isSelectOption)
                return {
                    ...baseProps,
                    options: normalizedSplitOptions,
                    split: {
                        defaultOption: componentProps.defaultOption,
                        showDefaultInList: componentProps.showDefaultInList ?? false,
                        onDefaultOptionClick: componentProps.onDefaultOptionClick,
                        dropdownIcon: componentProps.dropdownIcon,
                        splitButtonProps: {
                            className: componentProps.splitButtonClassName,
                            ...componentProps.splitButtonProps
                        },
                        dropdownButtonProps: {
                            className: componentProps.dropdownButtonClassName,
                            ...componentProps.dropdownButtonProps
                        }
                    },
                    visual: {
                        ...baseProps.visual,
                        animation: componentProps.animation ?? 'basic',
                        size: componentProps.size ?? 'md',
                        showIcons: componentProps.showIcons ?? true,
                        showCheckmarks: componentProps.showCheckmarks ?? true,
                        truncate: componentProps.truncate ?? false,
                        dropdownClassName: cn(
                            componentProps.dropdownClassName,
                            'split-select-dropdown'
                        ),
                        optionClassName: cn(
                            componentProps.optionClassName,
                            'split-select-option'
                        )
                    },
                    behavior: {
                        ...baseProps.behavior,
                        disabled: componentProps.disabled ?? false,
                        closeOnSelect: componentProps.closeOnSelect ?? true
                    },
                    validation: {
                        ...baseProps.validation,
                        errorMessage: componentProps.error
                    }
                } as SplitProps // Type assertion here is safe because we've normalized the options

            case 'grouped':
                return {
                    ...baseProps,
                    grouped: {
                        groupClassName: componentProps.groupClassName,
                        showGroupCounts: componentProps.showGroupCounts ?? true,
                        collapsible: componentProps.collapsible ?? true,
                        expandedGroups: componentProps.expandedGroups,
                        onGroupToggle: componentProps.onGroupToggle,
                        groupHeaderClassName: componentProps.groupHeaderClassName,
                        groupContentClassName: componentProps.groupContentClassName,
                        indentLevel: componentProps.indentLevel ?? 1
                    }
                }
            case 'virtualized':
                return {
                    ...baseProps,
                    options: normalizeOptions(componentProps.options) as SelectOption[],
                    behavior: {
                        ...baseProps.behavior,
                        virtualized: true,
                        closeOnSelect: componentProps.closeOnSelect ?? true,
                        searchable: componentProps.searchable ?? false,
                        clearable: componentProps.clearable ?? true,
                        disabled: componentProps.disabled ?? false
                    },
                    visual: {
                        ...baseProps.visual,
                        showCheckmarks: componentProps.showCheckmarks ?? false,
                        showIcons: componentProps.showIcons ?? true,
                        maxHeight: componentProps.maxHeight ?? '300px',
                        width: componentProps.width ?? 'trigger',
                        truncate: componentProps.truncate ?? true,
                        animation: componentProps.animation ?? 'basic',
                        showClearButton: componentProps.showClearButton ?? true,
                        dropdownClassName: cn(
                            componentProps.dropdownClassName,
                            'virtualized-dropdown'
                        ),
                        optionClassName: cn(
                            componentProps.optionClassName,
                            'virtualized-option'
                        )
                    },
                    virtualized: {
                        height: componentProps.height ?? 300,
                        itemHeight: componentProps.itemHeight ?? 35,
                        overscan: componentProps.overscan ?? 5,
                        onEndReached: componentProps.onEndReached,
                        endReachedThreshold: componentProps.endReachedThreshold ?? 0.8,
                        loadingMore: componentProps.loadingMore ?? false,
                        scrollToIndex: componentProps.scrollToIndex,
                        initialScrollOffset: componentProps.initialScrollOffset,
                        onScroll: componentProps.onScroll
                    },
                    validation: {
                        ...baseProps.validation,
                        required: componentProps.required ?? false,
                        custom: componentProps.validate,
                        errorMessage: componentProps.error
                    }
                }

            default:
                return {
                    ...baseProps,
                    behavior: {
                        ...baseProps.behavior,
                        closeOnSelect: componentProps.closeOnSelect ?? true,
                        searchable: componentProps.searchable ?? false,
                        clearable: componentProps.clearable ?? true,
                        disabled: componentProps.disabled ?? false,
                        max: componentProps.max,
                        min: componentProps.min,
                        allowEmpty: componentProps.allowEmpty ?? true,
                        autoHighlight: componentProps.autoHighlight ?? true
                    },
                    visual: {
                        ...baseProps.visual,
                        showCheckmarks: componentProps.showCheckmarks ?? true,
                        showIcons: componentProps.showIcons ?? true,
                        maxHeight: componentProps.maxHeight ?? '300px',
                        width: componentProps.width ?? 'trigger',
                        truncate: componentProps.truncate ?? false,
                        animation: componentProps.animation ?? 'basic',
                        showClearButton: componentProps.showClearButton ?? true,
                        highlightStyle: componentProps.highlightStyle ?? 'background',
                        dropdownClassName: componentProps.dropdownClassName,
                        optionClassName: componentProps.optionClassName
                    },
                    validation: {
                        ...baseProps.validation,
                        required: componentProps.required ?? false,
                        min: componentProps.min,
                        max: componentProps.max,
                        custom: componentProps.validate,
                        errorMessage: componentProps.error
                    }
                }
        }
    }

    const finalProps = {
        ...createComponentProps(),
    }

    // Render appropriate component
    switch (componentProps.subComponent) {
        case 'basic':
            return <MatrxBasicSelect {...finalProps} />
        case 'multiple':
            return <MatrxMultipleSelect {...finalProps} />
        case 'combobox':
            return <MatrxCombobox {...finalProps} />
        case 'cascading':
            return <MatrxCascadingSelect {...finalProps} />
        case 'grouped':
            return <MatrxGroupedSelect {...finalProps} />
        case 'virtualized':
            return <MatrxVirtualizedSelect {...finalProps} />
        case 'async':
            return <MatrxAsyncSelect {...finalProps} />
        case 'tags':
            return <MatrxTagSelect {...finalProps} />
        case 'split':
            return <MatrxSplitSelect {...finalProps} />
        default:
            return <MatrxBasicSelect {...finalProps} />
    }
}

MatrxEntitySelect.displayName = 'MatrxEntitySelect'

export default MatrxEntitySelect
