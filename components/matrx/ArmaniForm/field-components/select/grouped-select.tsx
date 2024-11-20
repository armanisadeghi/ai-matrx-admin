// File Location: '@/components/ui/select/grouped-select.tsx'
"use client"

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { GroupedProps, OptionGroup } from './types'

export const MatrxGroupedSelect = React.forwardRef<HTMLButtonElement, GroupedProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        behavior,
        visual,
        validation,
        grouped,
        className,
        ...rest
    } = props

    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
        new Set(grouped?.expandedGroups || (options as OptionGroup[]).map(group => group.label))
    )

    const toggleGroup = (groupLabel: string) => {
        if (!grouped?.collapsible) return

        setExpandedGroups(prev => {
            const next = new Set(prev)
            if (next.has(groupLabel)) {
                next.delete(groupLabel)
            } else {
                next.add(groupLabel)
            }
            grouped?.onGroupToggle?.(groupLabel)
            return next
        })
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
                        {(options as OptionGroup[]).map((group) => (
                            <div
                                key={group.label}
                                className={cn(
                                    "px-2 py-1.5",
                                    grouped?.groupClassName
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex items-center text-sm font-semibold text-muted-foreground",
                                        grouped?.collapsible && "cursor-pointer hover:text-foreground",
                                        grouped?.groupHeaderClassName
                                    )}
                                    onClick={() => toggleGroup(group.label)}
                                >
                                    {grouped?.collapsible && (
                                        <ChevronRight
                                            className={cn(
                                                "mr-1 h-4 w-4 transition-transform",
                                                expandedGroups.has(group.label) && "rotate-90"
                                            )}
                                        />
                                    )}
                                    {group.label}
                                    {grouped?.showGroupCounts && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            ({group.options.length})
                                        </span>
                                    )}
                                </div>

                                {expandedGroups.has(group.label) && (
                                    <div className={cn(
                                        "mt-1 space-y-1",
                                        grouped?.groupContentClassName
                                    )}>
                                        {group.options.map((option) => (
                                            <SelectPrimitive.Item
                                                key={option.value}
                                                value={String(option.value)}
                                                disabled={option.disabled || group.disabled}
                                                className={cn(
                                                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                                    getAnimationClasses(),
                                                    visual?.optionClassName
                                                )}
                                            >
                                                {visual?.showCheckmarks && (
                                                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                                        <SelectPrimitive.ItemIndicator>
                                                            <Check className="h-4 w-4" />
                                                        </SelectPrimitive.ItemIndicator>
                                                    </span>
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
                                            </SelectPrimitive.Item>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    )
})

MatrxGroupedSelect.displayName = 'MatrxGroupedSelect'

export default MatrxGroupedSelect
