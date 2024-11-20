// File Location: '@/components/ui/select/basic-select.tsx'
"use client"

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { InternalSelectProps } from './types'

export const MatrxBasicSelect = React.forwardRef<HTMLButtonElement, InternalSelectProps>((props, ref) => {
    const {
        value,
        onChange,
        options,
        behavior,
        visual,
        validation,
        className,
        disabled,
        placeholder,
        ...rest
    } = props

    const isDisabled = behavior?.disabled || disabled
    const finalPlaceholder = visual?.placeholder || placeholder

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
            disabled={isDisabled}
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
                <SelectPrimitive.Value placeholder={finalPlaceholder} />
                <SelectPrimitive.Icon>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    className={cn(
                        "relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                        visual?.maxHeight && `max-h-[${visual.maxHeight}]`,
                        visual?.width && `w-[${visual.width}]`
                    )}
                    position={visual?.placement === 'top' ? 'popper' : 'item-aligned'}
                >
                    <SelectPrimitive.Viewport className="p-1">
                        {options.map((option) => (
                            <SelectPrimitive.Item
                                key={option.value}
                                value={String(option.value)}
                                disabled={option.disabled}
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
    )
})

MatrxBasicSelect.displayName = 'MatrxBasicSelect'

export default MatrxBasicSelect
