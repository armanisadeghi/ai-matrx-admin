// number-handlers/useIntegerHandler.ts
import { useState, useEffect, useCallback } from 'react';
import { NumberHandlerResult, NumberTypeConfig } from './EntityNumberInput';


interface IntegerHandlerProps {
    value: number | null;
    onChange: (value: number | null) => void;
    config: NumberTypeConfig;
}

export function useIntegerHandler({ value, onChange, config }: IntegerHandlerProps) {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Format integer to string, removing any decimal places
    const formatNumber = useCallback((num: number | null): string => {
        if (num === null) return '';
        // Use Math.floor to ensure we always get a clean integer
        return Math.floor(num).toString();
    }, []);

    // Update display value when the actual value changes
    useEffect(() => {
        setDisplayValue(formatNumber(value));
    }, [value, formatNumber]);

    const validateInteger = useCallback((value: string): number | null => {
        if (!value) return null;
        
        // Remove any decimal places and convert to integer
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) return null;
        
        // Ensure the value is within bounds
        if (parsed < config.min) {
            setError(`Minimum value is ${config.min}`);
            return null;
        }
        
        if (parsed > config.max) {
            setError(`Maximum value is ${config.max}`);
            return null;
        }
        
        // Check if the input contains a decimal point, which isn't allowed for integers
        if (value.includes('.')) {
            setError('Decimal values are not allowed');
            return null;
        }
        
        setError('');
        return parsed;
    }, [config]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue);
        
        const validatedValue = validateInteger(inputValue);
        if (validatedValue !== null) {
            onChange(validatedValue);
        }
    }, [validateInteger, onChange]);

    const handleBlur = useCallback(() => {
        if (value !== null) {
            setDisplayValue(formatNumber(value));
        }
    }, [value, formatNumber]);

    const handleIncrement = useCallback(() => {
        const currentValue = value ?? 0;
        const newValue = Math.min(currentValue + config.step, config.max);
        onChange(Math.floor(newValue)); // Ensure we always return an integer
    }, [value, config, onChange]);

    const handleDecrement = useCallback(() => {
        const currentValue = value ?? 0;
        const newValue = Math.max(currentValue - config.step, config.min);
        onChange(Math.floor(newValue)); // Ensure we always return an integer
    }, [value, config, onChange]);

    return {
        displayValue,
        handleChange,
        handleIncrement,
        handleDecrement,
        handleBlur,
        error,
        isDecrementDisabled: false  // Integer handler allows decrements
    } as NumberHandlerResult;
}

