// File Location: '@/components/ui/select/virtualized-select.tsx'
"use client"

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { VirtualizedProps, SelectOption, isSelectOption } from './types'

export const MatrxVirtualizedSelect = React.forwardRef<HTMLButtonElement, VirtualizedProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        behavior,
        visual,
        validation,
        virtualized,
        className,
        ...rest
    } = props

    // Ensure we're working with SelectOption[]
    const selectOptions = options.filter(isSelectOption)
    const parentRef = React.useRef<HTMLDivElement>(null)

    const rowVirtualizer = useVirtualizer({
        count: selectOptions.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => virtualized?.itemHeight ?? 35,
        overscan: virtualized?.overscan ?? 5,
    })

    React.useEffect(() => {
        if (!virtualized?.onEndReached) return

        const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse()
        if (
            lastItem &&
            !behavior?.loading &&
            !virtualized.loadingMore &&
            lastItem.index >= selectOptions.length * (virtualized.endReachedThreshold ?? 0.8)
        ) {
            virtualized.onEndReached()
        }
    }, [
        rowVirtualizer.getVirtualItems(),
        behavior?.loading,
        virtualized?.loadingMore,
        selectOptions.length,
        virtualized?.endReachedThreshold,
        virtualized?.onEndReached,
    ])

    const getAnimationClasses = () => {
        switch (visual?.animation) {
            case 'none':
                return ''
            case 'basic':
                return 'transition-colors duration-200'
            case 'moderate':
                return 'transition-all duration-300 hover:border-primary'
            case 'enhanced':
                return 'transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-lg'
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
                        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        visual?.dropdownClassName
                    )}
                >
                    <div
                        ref={parentRef}
                        className="overflow-auto"
                        style={{ height: virtualized?.height ?? 300 }}
                    >
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                const option = selectOptions[virtualRow.index]
                                return (
                                    <SelectPrimitive.Item
                                        key={option.value}
                                        value={String(option.value)}
                                        disabled={option.disabled}
                                        className={cn(
                                            "absolute top-0 left-0 w-full",
                                            "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                            getAnimationClasses(),
                                            visual?.optionClassName
                                        )}
                                        style={{
                                            transform: `translateY(${virtualRow.start}px)`,
                                            height: virtualized?.itemHeight ?? 35
                                        }}
                                    >
                                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                            <SelectPrimitive.ItemIndicator>
                                                {visual?.showCheckmarks && (
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </SelectPrimitive.ItemIndicator>
                                        </span>

                                        {visual?.showIcons && option.icon && (
                                            <span className="mr-2">{option.icon}</span>
                                        )}

                                        <SelectPrimitive.ItemText>
                                            <span className={cn(visual?.truncate && "truncate")}>
                                                {option.label}
                                            </span>
                                        </SelectPrimitive.ItemText>

                                        {option.description && (
                                            <span className="ml-2 text-sm text-muted-foreground">
                                                {option.description}
                                            </span>
                                        )}
                                    </SelectPrimitive.Item>
                                )
                            })}
                        </div>
                    </div>
                    {virtualized?.loadingMore && (
                        <div className="flex items-center justify-center p-2 border-t">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="ml-2 text-sm">Loading more...</span>
                        </div>
                    )}
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
})

MatrxVirtualizedSelect.displayName = 'MatrxVirtualizedSelect'

export default MatrxVirtualizedSelect
