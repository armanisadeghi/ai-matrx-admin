// number-handlers/useSerialHandler.ts
import { useState, useEffect, useCallback } from 'react';
import { NumberTypeConfig } from './EntityNumberInput';

interface SerialHandlerProps {
    value: number | null;
    onChange: (value: number | null) => void;
    config: NumberTypeConfig;
}

export function useSerialHandler({ value, onChange, config }: SerialHandlerProps) {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [error, setError] = useState<string>('');
    
    // Format serial number, ensuring it's always a positive integer
    const formatNumber = useCallback((num: number | null): string => {
        if (num === null) return '';
        // Serial numbers should always be positive integers
        return Math.max(Math.floor(num), config.min).toString();
    }, [config.min]);

    // Update display value when the actual value changes
    useEffect(() => {
        setDisplayValue(formatNumber(value));
    }, [value, formatNumber]);

    // Special validation for serial numbers
    const validateSerial = useCallback((inputValue: string): number | null => {
        if (!inputValue) return null;
        
        // Parse as integer and ensure it's positive
        const parsed = parseInt(inputValue, 10);
        if (isNaN(parsed)) {
            setError('Please enter a valid number');
            return null;
        }
    
        // Serial numbers must be positive integers
        if (parsed < config.min) {
            setError(`Serial numbers must be at least ${config.min}`);
            return null;
        }
    
        if (parsed > config.max) {
            setError(`Maximum value is ${config.max}`);
            return null;
        }
    
        // Check for decimal points which aren't allowed in serial numbers
        if (inputValue.includes('.')) {
            setError('Serial numbers must be whole numbers');
            return null;
        }
    
        // Ensure the new value is not less than the current value
        // This maintains the auto-incrementing nature of serial numbers
        if (value !== null && parsed < value) {  // Use the value prop here, not the parameter
            setError('Serial numbers can only be incremented');
            return null;
        }
    
        setError('');
        return parsed;
    }, [config.min, config.max, value]);  // Include value in dependencies
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;
        setDisplayValue(inputValue);
        
        const validatedValue = validateSerial(inputValue);
        if (validatedValue !== null) {
            onChange(validatedValue);
        }
    }, [validateSerial, onChange]);

    const handleBlur = useCallback(() => {
        if (value !== null) {
            setDisplayValue(formatNumber(value));
        } else {
            // For new entries, initialize with minimum value
            const initialValue = config.min;
            setDisplayValue(formatNumber(initialValue));
            onChange(initialValue);
        }
    }, [value, formatNumber, config.min, onChange]);

    const handleIncrement = useCallback(() => {
        const currentValue = value ?? config.min;
        // Ensure we don't exceed the maximum value
        const newValue = Math.min(currentValue + config.step, config.max);
        onChange(newValue);
    }, [value, config, onChange]);

    // For serial numbers, decrement is typically disabled
    // We implement it but make it highly restricted
    const handleDecrement = useCallback(() => {
        const currentValue = value ?? config.min;
        // Only allow decrement if it won't go below the minimum or the current value
        const newValue = Math.max(currentValue - config.step, config.min);
        
        // Prevent decrement if it would go below the original value
        if (newValue < (value ?? config.min)) {
            setError('Serial numbers cannot be decremented below their original value');
            return;
        }
        
        onChange(newValue);
    }, [value, config, onChange]);

    useEffect(() => {
        // Initialize with minimum value if no value is set
        if (value === null) {
            onChange(config.min);
        }
    }, []);

    return {
        displayValue,
        handleChange,
        handleIncrement,
        handleDecrement,
        handleBlur,
        error,
        // Additional property to help the main component disable decrement button
        isDecrementDisabled: true
    };
}