// EntityNumberInput.tsx
import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MinusCircle, PlusCircle } from 'lucide-react';

import { useDecimalHandler } from './useDecimalHandler';
import { FieldComponentProps } from "@/app/entities/fields/types";
import { StandardFieldLabel } from '../../add-ons/FloatingFieldLabel';
import { useIntegerHandler } from './useIntegerHandler';
import { useBigIntHandler } from './useBigIntHandler';
import { useSerialHandler } from './useSerialHandler';
import {
  BIGINT_TYPES,
  type ComponentCustomProps,
  DECIMAL_TYPES,
  INTEGER_TYPES,
  NUMBER_TYPE_CONFIGS,
  type NumberHandlerResult,
  SERIAL_TYPES,
} from './entityNumberInputShared';

export type {
  NumberType,
  NumberTypeConfig,
  NumberHandlerResult,
  NumberHandlerProps,
  ComponentCustomProps,
} from './entityNumberInputShared';
export {
  NUMBER_TYPE_CONFIGS,
  INTEGER_TYPES,
  DECIMAL_TYPES,
  SERIAL_TYPES,
  BIGINT_TYPES,
} from './entityNumberInputShared';

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