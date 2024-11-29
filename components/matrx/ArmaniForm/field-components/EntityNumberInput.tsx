'use client';

import React, {useEffect, useState} from 'react';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {MinusCircle, PlusCircle} from 'lucide-react';
import {Label} from '@/components/ui/label';
import {EntityBaseFieldProps} from "../EntityBaseField";
import {MatrxVariant} from './types';

type NumberType =
    'default'
    | 'smallint'
    | 'integer'
    | 'bigint'
    | 'decimal'
    | 'real'
    | 'double'
    | 'serial'
    | 'bigserial';

interface NumberTypeConfig {
    min: number;
    max: number;
    step: number;
    decimals?: number;
}

interface EntityNumberInputProps extends EntityBaseFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'value'> {
    value: number | null;
}

const NUMBER_TYPE_CONFIGS: Record<NumberType, NumberTypeConfig> = {
    default: {
        min: -2147483648,
        max: 2147483647,
        step: 1
    },
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
    },
    real: {
        min: -3.4E+38,
        max: 3.4E+38,
        step: 0.000001,
        decimals: 6
    },
    double: {
        min: -1.7E+308,
        max: 1.7E+308,
        step: 0.000001,
        decimals: 15
    },
    serial: {
        min: 1,
        max: 2147483647,
        step: 1
    },
    bigserial: {
        min: 1,
        max: Number.MAX_SAFE_INTEGER,
        step: 1
    }
};


const EntityNumberInput = React.forwardRef<HTMLInputElement, EntityNumberInputProps>((
    {
        entityKey,
        dynamicFieldInfo: field,
        value = field.defaultValue,
        onChange,
        density = 'normal',
        animationPreset = 'subtle',
        size = 'default',
        className,
        variant = 'default',
        disabled = false,
        floatingLabel = true,
        labelPosition = 'default',
        ...props
    }, ref) => {
    const customProps = field.componentProps as Record<string, any>;

    const numberType = (customProps?.numberType || 'default') as NumberType;
    const hideControls = customProps?.hideControls === true;
    const allowNull = customProps?.allowNull !== false;
    const buttonVariant = (customProps?.buttonVariant || 'outline') as MatrxVariant;

    const config = NUMBER_TYPE_CONFIGS[numberType];
    const min = customProps?.min === 'default' ? config.min : Number(customProps?.min) ?? config.min;
    const max = customProps?.max === 'default' ? config.max : Number(customProps?.max) ?? config.max;
    const step = customProps?.step === 'default' ? config.step : Number(customProps?.step) ?? config.step;
    const decimals = customProps?.decimals === 'default' ? config.decimals
                                                         : Number(customProps?.decimals) ?? config.decimals ?? 0;

    const [displayValue, setDisplayValue] = useState<string>('');
    const [error, setError] = useState<string>('');

    const formatNumber = (num: number | null): string => {
        if (num === null) return '';
        return numberType === 'decimal' || numberType === 'real' || numberType === 'double'
               ? num.toFixed(decimals)
               : num.toString();
    };

    useEffect(() => {
        setDisplayValue(formatNumber(value));
    }, [value]);

    const validateAndSetValue = (value: string) => {
        if (!value) {
            if (allowNull) {
                onChange(null);
                setError('');
            } else {
                setError('This field is required');
            }
            return;
        }

        const numValue = ['decimal', 'real', 'double'].includes(numberType)
                         ? parseFloat(value)
                         : parseInt(value);

        if (isNaN(numValue)) {
            setError('Please enter a valid number');
            return;
        }

        if (numValue < min) {
            setError(`Minimum value is ${min}`);
            return;
        }

        if (numValue > max) {
            setError(`Maximum value is ${max}`);
            return;
        }

        if (['decimal', 'real', 'double'].includes(numberType)) {
            const decimalPlaces = value.includes('.')
                                  ? value.split('.')[1].length
                                  : 0;
            if (decimalPlaces > decimals) {
                setError(`Maximum ${decimals} decimal places allowed`);
                return;
            }
        }

        setError('');
        onChange(numValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDisplayValue(value);
        validateAndSetValue(value);
    };

    const handleIncrement = () => {
        const currentValue = value ?? 0;
        const newValue = Math.min(currentValue + step, max);
        onChange(newValue);
        setDisplayValue(formatNumber(newValue));
    };

    const handleDecrement = () => {
        const currentValue = value ?? 0;
        const newValue = Math.max(currentValue - step, min);
        onChange(newValue);
        setDisplayValue(formatNumber(newValue));
    };

    const densityClasses = {
        compact: "h-8 text-sm",
        normal: "h-10 text-base",
        comfortable: "h-12 text-lg"
    }[density];

    return (
        <div className="w-full">
            {field.displayName && (
                <Label
                    htmlFor={`${entityKey}-${field.name}`}
                    className={cn(
                        "block mb-1.5",
                        disabled && "text-muted-foreground"
                    )}
                >
                    {field.displayName}
                </Label>
            )}
            <div className="flex items-center gap-2">
                {!hideControls && (
                    <Button
                        type="button"
                        variant={buttonVariant}
                        size="icon"
                        onClick={handleDecrement}
                        disabled={disabled || value === null || value <= min}
                        className="flex-shrink-0"
                    >
                        <MinusCircle className="h-4 w-4"/>
                    </Button>
                )}
                <Input
                    ref={ref}
                    id={`${entityKey}-${field.name}`}
                    type="number"
                    value={displayValue}
                    onChange={handleChange}
                    disabled={disabled}
                    step={step}
                    min={min}
                    max={max}
                    className={cn(
                        "font-mono",
                        densityClasses,
                        error && "border-destructive",
                        className
                    )}
                    {...props}
                />
                {!hideControls && (
                    <Button
                        type="button"
                        variant={buttonVariant}
                        size="icon"
                        onClick={handleIncrement}
                        disabled={disabled || value === null || value >= max}
                        className="flex-shrink-0"
                    >
                        <PlusCircle className="h-4 w-4"/>
                    </Button>
                )}
            </div>
            {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
            )}
        </div>
    );
});

EntityNumberInput.displayName = "EntityNumberInput";

export default EntityNumberInput;
