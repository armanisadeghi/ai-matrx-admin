import { useState, useEffect } from 'react';

interface UseOtherOptionProps {
    value: string | string[];
    options: string[];
    includeOther: boolean;
    onChange: (value: string | string[]) => void;
}

interface UseOtherOptionReturn {
    showOtherInput: boolean;
    otherValue: string;
    selected: string | string[];
    internalOptions: string[];
    handleChange: (newValue: string | string[]) => void;
    handleOtherInputChange: (value: string) => void;
    getDisplayValue: (value: string) => string;
}

export const useOtherOption = ({
    value,
    options,
    includeOther,
    onChange,
}: UseOtherOptionProps): UseOtherOptionReturn => {
    const internalOptions = includeOther ? [...options, '_other'] : options;
    
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherValue, setOtherValue] = useState('');
    const [selected, setSelected] = useState<string | string[]>(() => {
        if (Array.isArray(value)) {
            return value.map(v => !options.includes(v) ? '_other' : v);
        }
        return value && !options.includes(value) ? '_other' : value || '';
    });

    // Sync component state when value prop changes
    useEffect(() => {
        if (Array.isArray(value)) {
            const hasCustomValue = value.some(v => !options.includes(v));
            if (hasCustomValue) {
                setShowOtherInput(true);
                const customValue = value.find(v => !options.includes(v)) || '';
                setOtherValue(customValue);
                setSelected(value.map(v => !options.includes(v) ? '_other' : v));
            } else {
                setSelected(value);
                setShowOtherInput(false);
            }
        } else {
            if (value && !options.includes(value)) {
                setShowOtherInput(true);
                setOtherValue(value);
                setSelected('_other');
            } else {
                setSelected(value || '');
                setShowOtherInput(false);
            }
        }
    }, [value, options]);

    const handleChange = (newValue: string | string[]) => {
        if (Array.isArray(newValue)) {
            // Handle array values (checkboxes)
            const includesOther = newValue.includes('_other');
            if (includesOther) {
                setShowOtherInput(true);
                setSelected(newValue);
                // Keep the other value if it exists
                if (otherValue) {
                    const standardValues = newValue.filter(v => v !== '_other');
                    onChange([...standardValues, otherValue]);
                }
            } else {
                setShowOtherInput(false);
                setSelected(newValue);
                onChange(newValue);
            }
        } else {
            // Handle single value (select/radio)
            if (newValue === '_other') {
                setShowOtherInput(true);
                setSelected('_other');
                if (otherValue) {
                    onChange(otherValue);
                }
            } else {
                setShowOtherInput(false);
                setSelected(newValue);
                onChange(newValue);
            }
        }
    };

    const handleOtherInputChange = (newValue: string) => {
        setOtherValue(newValue);
        
        if (Array.isArray(selected)) {
            // For checkboxes, maintain selected values plus the new other value
            const standardValues = selected.filter(v => options.includes(v) || v === '_other');
            onChange([...standardValues.filter(v => v !== '_other'), newValue]);
        } else {
            // For single value components
            onChange(newValue);
        }
    };

    const getDisplayValue = (value: string) => {
        return value === '_other' ? 'Other' : value;
    };

    return {
        showOtherInput,
        otherValue,
        selected,
        internalOptions,
        handleChange,
        handleOtherInputChange,
        getDisplayValue,
    };
};