// File Location: '@/components/ui/select/split-select.tsx'
"use client"

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { SplitProps, SelectOption, isSelectOption } from './types'

export const MatrxSplitSelect = React.forwardRef<HTMLDivElement, SplitProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        behavior,
        visual,
        validation,
        split,
        className,
        ...rest
    } = props

    if (!split?.defaultOption) {
        console.error('MatrxSplitSelect: defaultOption is required')
        return null
    }

    // Ensure we're working with SelectOption[]
    const selectOptions = options.filter(isSelectOption)
    const filteredOptions = split.showDefaultInList
                            ? selectOptions
                            : selectOptions.filter(opt => opt.value !== split.defaultOption.value)

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
    const handleDefaultClick = React.useCallback(() => {
        split.onDefaultOptionClick?.(split.defaultOption)
        onChange(split.defaultOption.value.toString())
    }, [split.onDefaultOptionClick, split.defaultOption, onChange])

    return (
        <div
            ref={ref}
            className={cn(
                "inline-flex rounded-md shadow-sm",
                getAnimationClasses(),
                className
            )}
        >
            <button
                type="button"
                onClick={handleDefaultClick}
                disabled={behavior?.disabled}
                className={cn(
                    "relative inline-flex items-center rounded-l-md border border-r-0 bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    getSizeClasses(),
                    validation?.errorMessage && "border-destructive",
                    split.splitButtonProps?.className
                )}
                {...split.splitButtonProps}
            >
                {visual?.showIcons && split.defaultOption.icon && (
                    <span className="mr-2">{split.defaultOption.icon}</span>
                )}
                <span className={cn(visual?.truncate && "truncate")}>
                    {split.defaultOption.label}
                </span>
            </button>

            <SelectPrimitive.Root
                value={value as string}
                onValueChange={onChange}
                disabled={behavior?.disabled}
            >
                <SelectPrimitive.Trigger
                    className={cn(
                        "inline-flex items-center justify-center rounded-r-md border bg-background px-2 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                        getSizeClasses(),
                        validation?.errorMessage && "border-destructive",
                        split.dropdownButtonProps?.className
                    )}
                    {...split.dropdownButtonProps}
                >
                    {split.dropdownIcon || <ChevronDown className="h-4 w-4" />}
                </SelectPrimitive.Trigger>

                <SelectPrimitive.Portal>
                    <SelectPrimitive.Content
                        className={cn(
                            "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                            visual?.maxHeight && `max-h-[${visual.maxHeight}]`,
                            visual?.width && `w-[${visual.width}]`,
                            visual?.dropdownClassName
                        )}
                    >
                        <SelectPrimitive.Viewport className="p-1">
                            {filteredOptions.map((option) => (
                                <SelectPrimitive.Item
                                    key={option.value}
                                    value={String(option.value)}
                                    disabled={option.disabled}
                                    className={cn(
                                        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        getAnimationClasses(),
                                        visual?.optionClassName
                                    )}
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
                            ))}
                        </SelectPrimitive.Viewport>
                    </SelectPrimitive.Content>
                </SelectPrimitive.Portal>
            </SelectPrimitive.Root>
        </div>
    )
})

MatrxSplitSelect.displayName = 'MatrxSplitSelect'

export default MatrxSplitSelect
