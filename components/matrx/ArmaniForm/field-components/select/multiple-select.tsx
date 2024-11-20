// File Location: '@/components/ui/select/multiple-select.tsx'
"use client"

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import {isSelectOption, SelectBaseProps, SelectOption } from './types'

export const MatrxMultipleSelect = React.forwardRef<HTMLButtonElement, SelectBaseProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        behavior,
        visual,
        validation,
        className,
        ...rest
    } = props

    // Filter options to ensure we only work with SelectOption type
    const selectOptions = React.useMemo(() =>
            options.filter(isSelectOption),
        [options]
    )

    const selectedValues = Array.isArray(value) ? value : []

    const handleSelect = (optionValue: string) => {
        const currentValues = [...selectedValues]
        const valueIndex = currentValues.indexOf(optionValue)

        if (valueIndex === -1) {
            if (!behavior?.max || currentValues.length < behavior.max) {
                currentValues.push(optionValue)
            }
        } else {
            currentValues.splice(valueIndex, 1)
        }

        onChange(currentValues)
    }

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const currentValues = selectedValues.filter(v => v !== optionValue)
        onChange(currentValues)
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

    const renderSelectedItems = () => {
        return selectedValues.map(val => {
            const option = selectOptions.find(opt => String(opt.value) === val)
            if (!option) return null

            return (
                <span
                    key={val}
                    className={cn(
                        "inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm",
                        getAnimationClasses()
                    )}
                >
                    {visual?.showIcons && option.icon && (
                        <span className="mr-1">{option.icon}</span>
                    )}
                    {option.label}
                    <button
                        type="button"
                        onClick={(e) => handleRemove(String(option.value), e)}
                        className="ml-1 rounded-full hover:bg-primary/20"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </span>
            )
        })
    }

    return (
        <div className="space-y-2">
            <SelectPrimitive.Root
                value={value as string}
                onValueChange={handleSelect}
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
                            {selectOptions.map((option) => (
                                <SelectPrimitive.Item
                                    key={option.value}
                                    value={String(option.value)}
                                    disabled={option.disabled || (behavior?.max && selectedValues.length >= behavior.max && !selectedValues.includes(String(option.value)))}
                                    className={cn(
                                        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        getAnimationClasses()
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
                        </SelectPrimitive.Viewport>
                    </SelectPrimitive.Content>
                </SelectPrimitive.Portal>
            </SelectPrimitive.Root>

            <div className="flex flex-wrap gap-2">
                {renderSelectedItems()}
            </div>
        </div>
    )
})

MatrxMultipleSelect.displayName = 'MatrxMultipleSelect'

export default MatrxMultipleSelect
