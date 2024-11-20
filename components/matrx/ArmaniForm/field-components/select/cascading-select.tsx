// File Location: '@/components/ui/select/cascading-select.tsx'
"use client"

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { CascadingProps, HierarchicalOption } from './types'

interface CascadingState {
    expandedPaths: Set<string>
    loadingPaths: Set<string>
    error: string | null
}

export const MatrxCascadingSelect = React.forwardRef<HTMLButtonElement, CascadingProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        cascade,
        behavior,
        visual,
        validation,
        className,
        ...rest
    } = props

    const [state, setState] = React.useState<CascadingState>({
        expandedPaths: new Set(cascade?.expandedPaths || []),
        loadingPaths: new Set(),
        error: null
    })

    // Update expandedPaths when prop changes
    React.useEffect(() => {
        if (cascade?.expandedPaths) {
            setState(prev => ({
                ...prev,
                expandedPaths: new Set(cascade.expandedPaths)
            }))
        }
    }, [cascade?.expandedPaths])

    const getOptionPath = (option: HierarchicalOption): string => {
        return option.path?.join(cascade?.pathDelimiter || '/') || String(option.value)
    }

    const isExpanded = (option: HierarchicalOption): boolean => {
        return state.expandedPaths.has(getOptionPath(option))
    }

    const isLoading = (option: HierarchicalOption): boolean => {
        return state.loadingPaths.has(getOptionPath(option))
    }

    const handleExpand = async (option: HierarchicalOption, event?: React.MouseEvent) => {
        event?.preventDefault()
        event?.stopPropagation()

        const path = getOptionPath(option)

        if (isLoading(option)) return

        if (option.children) {
            // Toggle expansion for existing children
            setState(prev => {
                const newExpanded = new Set(prev.expandedPaths)
                if (newExpanded.has(path)) {
                    newExpanded.delete(path)
                } else {
                    newExpanded.add(path)
                }
                cascade?.onPathChange?.(Array.from(newExpanded))
                return { ...prev, expandedPaths: newExpanded }
            })
            return
        }

        // Load children if they don't exist
        if (cascade?.loadData) {
            setState(prev => {
                const newLoading = new Set(prev.loadingPaths)
                newLoading.add(path)
                return { ...prev, loadingPaths: newLoading, error: null }
            })

            try {
                const children = await cascade.loadData(option)
                option.children = children
                setState(prev => {
                    const newExpanded = new Set(prev.expandedPaths)
                    newExpanded.add(path)
                    const newLoading = new Set(prev.loadingPaths)
                    newLoading.delete(path)
                    cascade?.onPathChange?.(Array.from(newExpanded))
                    return { ...prev, expandedPaths: newExpanded, loadingPaths: newLoading }
                })
            } catch (error) {
                setState(prev => {
                    const newLoading = new Set(prev.loadingPaths)
                    newLoading.delete(path)
                    return {
                        ...prev,
                        loadingPaths: newLoading,
                        error: 'Failed to load options'
                    }
                })
            }
        }
    }

    const handleMouseEnter = (option: HierarchicalOption) => {
        if (cascade?.expandTrigger === 'hover') {
            handleExpand(option)
        }
    }

    const handleSelect = (optionValue: string) => {
        onChange(optionValue)
        if (!cascade?.changeOnSelect) {
            // If changeOnSelect is false, only change value when leaf node is selected
            const option = findOption(options as HierarchicalOption[], optionValue)
            if (option && !option.children) {
                onChange(optionValue)
            }
        }
    }

    const findOption = (opts: HierarchicalOption[], value: string): HierarchicalOption | null => {
        for (const opt of opts) {
            if (String(opt.value) === value) return opt
            if (opt.children) {
                const found = findOption(opt.children, value)
                if (found) return found
            }
        }
        return null
    }

    const getAnimationClasses = () => {
        switch (visual?.animation) {
            case 'none':
                return ''
            case 'basic':
                return 'transition-colors duration-200'
            case 'moderate':
                return 'transition-all duration-300'
            case 'enhanced':
                return 'transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-md'
            default:
                return 'transition-colors duration-200'
        }
    }

    const getSizeClasses = () => {
        switch (visual?.size) {
            case 'xs':
                return 'h-7 text-xs'
            case 'sm':
                return 'h-8 text-sm'
            case 'lg':
                return 'h-12 text-lg'
            case 'xl':
                return 'h-14 text-xl'
            default:
                return 'h-10 text-base'
        }
    }

    const renderOption = (option: HierarchicalOption, level: number = 0) => {
        const hasChildren = option.children?.length || props.cascade?.loadData
        const expanded = isExpanded(option)
        const loading = isLoading(option)

        return (
            <React.Fragment key={option.value}>
                <SelectPrimitive.Item
                    value={String(option.value)}
                    className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                        getAnimationClasses(),
                        { "pl-[calc(0.5rem*var(--level))]": level > 0 }
                    )}
                    style={{ '--level': level } as React.CSSProperties}
                    disabled={option.disabled}
                >
                    <div className="flex items-center flex-1">
                        {hasChildren && (
                            <button
                                onClick={(e) => handleExpand(option, e)}
                                className={cn(
                                    "mr-1 h-4 w-4 shrink-0 transition-transform",
                                    expanded && "rotate-90"
                                )}
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                     <ChevronRight className="h-4 w-4" />
                                 )}
                            </button>
                        )}

                        {visual?.showIcons && option.icon && (
                            <span className="mr-2">{option.icon}</span>
                        )}

                        <SelectPrimitive.ItemText>
                            {visual?.truncate ? (
                                <span className="truncate">{option.label}</span>
                            ) : option.label}
                        </SelectPrimitive.ItemText>

                        {option.description && (
                            <span className="ml-2 text-sm text-muted-foreground">
                                {option.description}
                            </span>
                        )}
                    </div>
                </SelectPrimitive.Item>

                {expanded && option.children && (
                    <div className="ml-4">
                        {option.children.map(child => renderOption(child, level + 1))}
                    </div>
                )}
            </React.Fragment>
        )
    }

    return (
        <SelectPrimitive.Root
            value={value as string}
            onValueChange={onChange}
            disabled={behavior?.disabled}
        >
            <SelectPrimitive.Trigger
                ref={ref}
                className={cn(
                    "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    getSizeClasses(),
                    getAnimationClasses(),
                    validation?.errorMessage && "border-destructive focus:ring-destructive",
                    validation?.required && "required",
                    className
                )}
                {...rest}
            >
                <SelectPrimitive.Value placeholder={visual?.placeholder} />
                <SelectPrimitive.Icon>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    className={cn(
                        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-80",
                        visual?.maxHeight && `max-h-[${visual.maxHeight}]`,
                        visual?.width && `w-[${visual.width}]`
                    )}
                >
                    <SelectPrimitive.Viewport className="p-1">
                        {state.error && (
                            <div className="p-2 text-sm text-destructive">
                                {state.error}
                            </div>
                        )}

                        {(options as HierarchicalOption[]).map(option => renderOption(option))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
})

MatrxCascadingSelect.displayName = 'MatrxCascadingSelect'

export default MatrxCascadingSelect
