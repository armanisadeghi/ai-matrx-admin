// useDecimalHandler.ts
import { useState, useEffect, useCallback } from 'react';
import { NumberHandlerProps, NumberHandlerResult } from './EntityNumberInput';

export function useDecimalHandler({ value, onChange, config }: NumberHandlerProps): NumberHandlerResult {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [error, setError] = useState<string>('');

    const formatNumber = useCallback((num: number | null): string => {
        if (num === null) return '';
        const safeNum = Number(num);
        if (isNaN(safeNum)) return '';
        return safeNum.toFixed(config.decimals ?? 0);
    }, [config.decimals]);

    useEffect(() => {
        setDisplayValue(formatNumber(value));
    }, [value, formatNumber]);

    const validateDecimal = useCallback((value: string): number | null => {
        if (!value) return null;
        
        const parsed = parseFloat(value);
        if (isNaN(parsed)) {
            setError('Please enter a valid number');
            return null;
        }

        if (parsed < config.min) {
            setError(`Minimum value is ${config.min}`);
            return null;
        }

        if (parsed > config.max) {
            setError(`Maximum value is ${config.max}`);
            return null;
        }

        if (value.includes('.')) {
            const [, decimals] = value.split('.');
            if (decimals && decimals.length > (config.decimals ?? 0)) {
                setError(`Maximum ${config.decimals} decimal places allowed`);
                return null;
            }
        }

        setError('');
        return Number(parsed.toFixed(config.decimals ?? 0));
    }, [config]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue);
        
        const validatedValue = validateDecimal(inputValue);
        if (validatedValue !== null) {
            onChange(validatedValue);
        }
    }, [validateDecimal, onChange]);

    const handleBlur = useCallback(() => {
        if (value !== null) {
            setDisplayValue(formatNumber(value));
        }
    }, [value, formatNumber]);

    const handleIncrement = useCallback(() => {
        const currentValue = value ?? 0;
        const newValue = Math.min(
            Number((currentValue + config.step).toFixed(config.decimals ?? 0)),
            config.max
        );
        onChange(newValue);
    }, [value, config, onChange]);

    const handleDecrement = useCallback(() => {
        const currentValue = value ?? 0;
        const newValue = Math.max(
            Number((currentValue - config.step).toFixed(config.decimals ?? 0)),
            config.min
        );
        onChange(newValue);
    }, [value, config, onChange]);

    return {
        displayValue,
        handleChange,
        handleIncrement,
        handleDecrement,
        handleBlur,
        error,
        isDecrementDisabled: false
    };
}