// number-handlers/useBigIntHandler.ts
import { useState, useEffect, useCallback } from 'react';
import { NumberTypeConfig } from './EntityNumberInput';


interface BigIntHandlerProps {
    value: number | null;
    onChange: (value: number | null) => void;
    config: NumberTypeConfig;
}

export function useBigIntHandler({ value, onChange, config }: BigIntHandlerProps) {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [error, setError] = useState<string>('');

    // Format bigint to string, ensuring no scientific notation
    const formatNumber = useCallback((num: number | null): string => {
        if (num === null) return '';
        // Use regular toString() for bigint to avoid scientific notation
        return Math.floor(num).toString();
    }, []);

    // Update display value when the actual value changes
    useEffect(() => {
        setDisplayValue(formatNumber(value));
    }, [value, formatNumber]);

    const validateBigInt = useCallback((value: string): number | null => {
        if (!value) return null;
        
        // First try parsing as regular number to catch scientific notation
        let parsed: number;
        try {
            parsed = Number(value);
            if (!Number.isInteger(parsed)) {
                setError('Only whole numbers are allowed');
                return null;
            }
        } catch {
            setError('Invalid number format');
            return null;
        }

        // Check if the number is too large for safe integer operations
        if (!Number.isSafeInteger(parsed)) {
            setError('Number is too large for safe operations');
            return null;
        }
        
        // Ensure the value is within bounds
        if (parsed < config.min) {
            setError(`Minimum value is ${config.min}`);
            return null;
        }
        
        if (parsed > config.max) {
            setError(`Maximum value is ${config.max}`);
            return null;
        }
        
        // Check for decimal points
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
        
        const validatedValue = validateBigInt(inputValue);
        if (validatedValue !== null) {
            onChange(validatedValue);
        }
    }, [validateBigInt, onChange]);

    const handleBlur = useCallback(() => {
        if (value !== null) {
            setDisplayValue(formatNumber(value));
        }
    }, [value, formatNumber]);

    const handleIncrement = useCallback(() => {
        const currentValue = value ?? 0;
        // Use regular addition but check for safe integer bounds
        const newValue = Math.min(currentValue + config.step, config.max);
        if (!Number.isSafeInteger(newValue)) {
            setError('Increment would exceed safe integer limits');
            return;
        }
        onChange(newValue);
    }, [value, config, onChange]);

    const handleDecrement = useCallback(() => {
        const currentValue = value ?? 0;
        // Use regular subtraction but check for safe integer bounds
        const newValue = Math.max(currentValue - config.step, config.min);
        if (!Number.isSafeInteger(newValue)) {
            setError('Decrement would exceed safe integer limits');
            return;
        }
        onChange(newValue);
    }, [value, config, onChange]);

    return {
        displayValue,
        handleChange,
        handleIncrement,
        handleDecrement,
        handleBlur,
        error
    };
}