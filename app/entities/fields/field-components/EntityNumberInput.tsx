// app/entities/fields/EntityNumberInput.tsx

'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { EntityComponentBaseProps, FieldComponentProps } from '../types';
import { MatrxVariant } from '@/components/ui/types';
import { StandardFieldLabel } from './add-ons/FloatingFieldLabel';

type NumberType = 'default' | 'smallint' | 'integer' | 'bigint' | 'decimal' | 'real' | 'double' | 'serial' | 'bigserial';

interface NumberTypeConfig {
    min: number;
    max: number;
    step: number;
    decimals?: number;
}

type EntityNumberInputProps = FieldComponentProps<number>;

const NUMBER_TYPE_CONFIGS: Record<NumberType, NumberTypeConfig> = {
    default: { min: -2147483648, max: 2147483647, step: 1 },
    smallint: { min: -32768, max: 32767, step: 1 },
    integer: { min: -2147483648, max: 2147483647, step: 1 },
    bigint: { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER, step: 1 },
    decimal: { min: -999999999999.999999, max: 999999999999.999999, step: 0.000001, decimals: 6 },
    real: { min: -3.4e38, max: 3.4e38, step: 0.000001, decimals: 6 },
    double: { min: -1.7e308, max: 1.7e308, step: 0.000001, decimals: 15 },
    serial: { min: 1, max: 2147483647, step: 1 },
    bigserial: { min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 },
};

const EntityNumberInput = React.forwardRef<HTMLInputElement, EntityNumberInputProps>(
    (
        { entityKey, dynamicFieldInfo, value: valueProp, onChange, disabled, className, density, animationPreset, size, textSize, variant, floatingLabel },
        ref
    ) => {
        const customProps = (dynamicFieldInfo.componentProps as Record<string, unknown>) || {};

        console.log('----- Number INPUT -----', valueProp);
        const safeValue = (val: any): number => (isNaN(Number(val)) ? 0 : Number(val));
        const value = safeValue(valueProp);
        console.log('----- Number INPUT safeValue -----', value);

        const numberType = (customProps?.numberType as NumberType) || 'default';
        const hideControls = customProps?.hideControls === true;
        const allowNull = customProps?.allowNull !== false;
        const buttonVariant = (customProps?.buttonVariant as MatrxVariant) || 'outline';

        const config = NUMBER_TYPE_CONFIGS[numberType];
        const min = customProps?.min === 'default' ? config.min : Number(customProps?.min) ?? config.min;
        const max = customProps?.max === 'default' ? config.max : Number(customProps?.max) ?? config.max;
        const step = customProps?.step === 'default' ? config.step : Number(customProps?.step) ?? config.step;
        const decimals = customProps?.decimals === 'default' ? config.decimals : Number(customProps?.decimals) ?? config.decimals ?? 0;

        const [displayValue, setDisplayValue] = useState<string>('');
        const [error, setError] = useState<string>('');

        const formatNumber = (num: number | null): string => {
            if (num === null) return '';
            return numberType === 'decimal' || numberType === 'real' || numberType === 'double' ? num.toFixed(decimals) : num.toString();
        };

        useEffect(() => {
            setDisplayValue(formatNumber(value));
        }, [value, numberType, decimals]);

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

            const numValue = ['decimal', 'real', 'double'].includes(numberType) ? parseFloat(value) : parseInt(value);

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
                const decimalPlaces = value.includes('.') ? value.split('.')[1].length : 0;
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

        const densityClasses =
            {
                compact: 'h-8 text-sm',
                normal: 'h-10 text-base',
                comfortable: 'h-12 text-lg',
            }[density] || 'h-10 text-base';

        return (
            <div className='w-full'>
                <StandardFieldLabel
                    htmlFor={`${entityKey}-${dynamicFieldInfo.name}`}
                    disabled={disabled}
                    required={dynamicFieldInfo.isRequired}
                >
                    {dynamicFieldInfo.displayName}
                </StandardFieldLabel>
                <div className='flex items-center gap-2'>
                    {!hideControls && (
                        <Button
                            type='button'
                            variant={buttonVariant}
                            size='icon'
                            onClick={handleDecrement}
                            disabled={disabled || value === null || value <= min}
                            className='flex-shrink-0'
                        >
                            <MinusCircle className='h-4 w-4' />
                        </Button>
                    )}
                    <Input
                        ref={ref}
                        id={`${entityKey}-${dynamicFieldInfo.name}`}
                        type='number'
                        value={displayValue}
                        onChange={handleChange}
                        disabled={disabled}
                        step={step}
                        min={min}
                        max={max}
                        className={cn('font-mono', densityClasses, error && 'border-destructive', className)}
                    />
                    {!hideControls && (
                        <Button
                            type='button'
                            variant={buttonVariant}
                            size='icon'
                            onClick={handleIncrement}
                            disabled={disabled || value === null || value >= max}
                            className='flex-shrink-0'
                        >
                            <PlusCircle className='h-4 w-4' />
                        </Button>
                    )}
                </div>
                {error && <p className='text-sm text-destructive mt-1'>{error}</p>}
            </div>
        );
    }
);

EntityNumberInput.displayName = 'EntityNumberInput';

export default React.memo(EntityNumberInput);
