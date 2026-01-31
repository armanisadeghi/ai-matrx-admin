// EntityNumberInput.tsx
import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle } from 'lucide-react';

import { MatrxVariant } from '@/components/ui/types';
import { useDecimalHandler } from './useDecimalHandler';
import { FieldComponentProps } from '../../../types';
import { StandardFieldLabel } from '../../add-ons/FloatingFieldLabel';
import { useIntegerHandler } from './useIntegerHandler';
import { useBigIntHandler } from './useBigIntHandler';
import { useSerialHandler } from './useSerialHandler';

export type NumberType = 'default' | 'smallint' | 'integer' | 'bigint' | 'decimal' | 'real' | 'double' | 'serial' | 'bigserial';

export const NUMBER_TYPE_CONFIGS = {
    default: { min: -2147483648, max: 2147483647, step: 1 },
    smallint: { min: -32768, max: 32767, step: 1 },
    integer: { min: -2147483648, max: 2147483647, step: 1 },
    bigint: { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER, step: 1 },
    decimal: { min: -999999999999.999999, max: 999999999999.999999, step: 0.000001, decimals: 6 },
    real: { min: -3.4e38, max: 3.4e38, step: 0.000001, decimals: 6 },
    double: { min: -1.7e308, max: 1.7e308, step: 0.000001, decimals: 15 },
    serial: { min: 1, max: 2147483647, step: 1 },
    bigserial: { min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 },
} as const;

export interface NumberTypeConfig {
    min: number;
    max: number;
    step: number;
    decimals?: number;
}

export interface NumberHandlerResult {
    displayValue: string;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleIncrement: () => void;
    handleDecrement: () => void;
    handleBlur: () => void;
    error: string;
    isDecrementDisabled?: boolean;
}


export interface NumberHandlerProps {
    value: number | null;
    onChange: (value: number | null) => void;
    config: NumberTypeConfig;
}

export const INTEGER_TYPES = ['default', 'smallint', 'integer'] as const;
export const DECIMAL_TYPES = ['decimal', 'real', 'double'] as const;
export const SERIAL_TYPES = ['serial', 'bigserial'] as const;
export const BIGINT_TYPES = ['bigint'] as const;

export interface ComponentCustomProps extends Record<string, unknown> {
    numberType?: NumberType;
    hideControls?: boolean;
    buttonVariant?: MatrxVariant;
    allowNull?: boolean;
    min?: number | 'default';
    max?: number | 'default';
    step?: number | 'default';
    decimals?: number | 'default';
}

type EntityNumberInputProps = FieldComponentProps<number>;

const EntityNumberInput = React.forwardRef<HTMLInputElement, EntityNumberInputProps>(
    ({ entityKey, dynamicFieldInfo, value, onChange, disabled, className, density, variant }, ref) => {
        const customProps = (dynamicFieldInfo.componentProps as ComponentCustomProps) || {};
        const numberType = customProps?.numberType || 'default';
        const hideControls = customProps?.hideControls === true;
        const buttonVariant = customProps?.buttonVariant || 'outline';

        const getNumberHandler = useCallback((): NumberHandlerResult => {
            const config = NUMBER_TYPE_CONFIGS[numberType];

            if (INTEGER_TYPES.includes(numberType as any)) {
                return useIntegerHandler({ value, onChange, config });
            }
            if (DECIMAL_TYPES.includes(numberType as any)) {
                return useDecimalHandler({ value, onChange, config });
            }
            if (BIGINT_TYPES.includes(numberType as any)) {
                return useBigIntHandler({ value, onChange, config });
            }
            if (SERIAL_TYPES.includes(numberType as any)) {
                return useSerialHandler({ value, onChange, config });
            }

            return useIntegerHandler({ value, onChange, config: NUMBER_TYPE_CONFIGS.default });
        }, [numberType, value, onChange]);

        const { displayValue, handleChange, handleIncrement, handleDecrement, handleBlur, error, isDecrementDisabled } = getNumberHandler();

        const densityClasses = {
            compact: 'h-8 text-sm',
            normal: 'h-10 text-base',
            comfortable: 'h-12 text-lg',
        }[density || 'normal'];

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
                            variant={buttonVariant as 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'}
                            size='icon'
                            onClick={handleDecrement}
                            disabled={disabled || isDecrementDisabled}
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
                        onBlur={handleBlur}
                        disabled={disabled}
                        className={cn('font-mono', densityClasses, error && 'border-destructive', className)}
                    />
                    {!hideControls && (
                        <Button
                            type='button'
                            variant={buttonVariant as 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'}
                            size='icon'
                            onClick={handleIncrement}
                            disabled={disabled}
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