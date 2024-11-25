'use client'

import React, { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { Info, MinusCircle, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MatrxVariant } from './types'

// Type definitions
export type NumberType = 'smallint' | 'integer' | 'bigint' | 'decimal'

interface NumberTypeConfig {
    min: number
    max: number
    step: number
    decimals?: number
}

export interface EntityNumberInputProps {
    field: {
        value: number | null
        onChange: (value: number | null) => void
        onBlur?: () => void
        name: string
    }
    componentProps?: {
        numberType: NumberType
        label?: string
        placeholder?: string
        required?: boolean
        disabled?: boolean
        hideControls?: boolean
        allowNull?: boolean
        decimals?: number
        className?: string
        min?: number
        max?: number
        step?: number
        variant?: MatrxVariant // Added variant prop
        buttonVariant?: MatrxVariant // Added button variant prop
    }
}

const NUMBER_TYPE_CONFIGS: Record<NumberType, NumberTypeConfig> = {
    smallint: {
        min: -32768,
        max: 32767,
        step: 1
    },
    integer: {
        min: -2147483648,
        max: 2147483647,
        step: 1
    },
    bigint: {
        min: Number.MIN_SAFE_INTEGER,
        max: Number.MAX_SAFE_INTEGER,
        step: 1
    },
    decimal: {
        min: -999999999999.999999,
        max: 999999999999.999999,
        step: 0.000001,
        decimals: 6
    }
}

export function EntityNumberInput({ field, componentProps }: EntityNumberInputProps) {
    const {
        numberType = 'integer',
        label,
        placeholder,
        required = false,
        disabled = false,
        hideControls = false,
        allowNull = true,
        decimals,
        className,
        min: customMin,
        max: customMax,
        step: customStep,
        variant = 'default',
        buttonVariant = 'outline'
    } = componentProps || {}

    const config = NUMBER_TYPE_CONFIGS[numberType]
    const min = customMin ?? config.min
    const max = customMax ?? config.max
    const step = customStep ?? config.step
    const actualDecimals = decimals ?? config.decimals ?? 0

    const [displayValue, setDisplayValue] = useState<string>('')
    const [error, setError] = useState<string>('')

    const formatNumber = (num: number | null): string => {
        if (num === null) return ''
        return numberType === 'decimal'
               ? num.toFixed(actualDecimals)
               : num.toString()
    }

    useEffect(() => {
        setDisplayValue(formatNumber(field.value))
    }, [field.value])

    const validateAndSetValue = (value: string) => {
        if (!value) {
            if (allowNull) {
                field.onChange(null)
                setError('')
            } else {
                setError('This field is required')
            }
            return
        }

        const numValue = numberType === 'decimal'
                         ? parseFloat(value)
                         : parseInt(value)

        if (isNaN(numValue)) {
            setError('Please enter a valid number')
            return
        }

        if (numValue < min) {
            setError(`Minimum value is ${min}`)
            return
        }

        if (numValue > max) {
            setError(`Maximum value is ${max}`)
            return
        }

        if (numberType === 'decimal') {
            const decimalPlaces = value.includes('.')
                                  ? value.split('.')[1].length
                                  : 0
            if (decimalPlaces > actualDecimals) {
                setError(`Maximum ${actualDecimals} decimal places allowed`)
                return
            }
        }

        setError('')
        field.onChange(numValue)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setDisplayValue(value)
        validateAndSetValue(value)
    }

    const handleIncrement = () => {
        const currentValue = field.value ?? 0
        const newValue = Math.min(currentValue + step, max)
        field.onChange(newValue)
        setDisplayValue(formatNumber(newValue))
    }

    const handleDecrement = () => {
        const currentValue = field.value ?? 0
        const newValue = Math.max(currentValue - step, min)
        field.onChange(newValue)
        setDisplayValue(formatNumber(newValue))
    }

    const handleBlur = () => {
        if (field.value !== null) {
            setDisplayValue(formatNumber(field.value))
        }
        field.onBlur?.()
    }

    return (
        <div className="space-y-2">
            {label && (
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">
                        {label}
                        {required && <span className="text-destructive">*</span>}
                    </label>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Range: {min} to {max}</p>
                                {numberType === 'decimal' && (
                                    <p>Decimal places: {actualDecimals}</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            )}
            <div className="flex items-center space-x-2">
                {!hideControls && (
                    <Button
                        type="button"
                        variant={buttonVariant}
                        size="icon"
                        onClick={handleDecrement}
                        disabled={disabled || field.value === null || field.value <= min}
                    >
                        <MinusCircle className="h-4 w-4" />
                    </Button>
                )}
                <Input
                    type="number"
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    step={step}
                    min={min}
                    max={max}
                    variant={variant}
                    className={cn(
                        "font-mono",
                        error && "border-destructive",
                        className
                    )}
                />
                {!hideControls && (
                    <Button
                        type="button"
                        variant={buttonVariant}
                        size="icon"
                        onClick={handleIncrement}
                        disabled={disabled || field.value === null || field.value >= max}
                    >
                        <PlusCircle className="h-4 w-4" />
                    </Button>
                )}
            </div>
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
        </div>
    )
}

export default EntityNumberInput
