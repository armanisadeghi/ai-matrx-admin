import React from "react";

interface FieldValidationProps {
    value: any;
    required?: boolean;
    minSelections?: number;
    maxSelections?: number;
    multiSelect?: boolean;
    showValidation: boolean;
    fieldType?: string;
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
    value,
    required = false,
    minSelections,
    maxSelections,
    multiSelect = false,
    showValidation,
    fieldType = "item",
}) => {
    // Only validate if showValidation is true (blur event happened)
    if (!showValidation) {
        return null;
    }

    // Get the count of selected items
    const getItemCount = (val: any): number => {
        if (!val) return 0;
        if (Array.isArray(val)) return val.length;
        if (multiSelect) return 1;
        return val ? 1 : 0;
    };

    const itemCount = getItemCount(value);

    // Check various validation conditions
    const validationErrors: string[] = [];

    // Required validation
    if (required && itemCount === 0) {
        validationErrors.push(`Please select at least one ${fieldType}.`);
    }

    // Minimum selections validation
    if (minSelections !== undefined && itemCount < minSelections) {
        validationErrors.push(`Please select at least ${minSelections} ${fieldType}${minSelections !== 1 ? "s" : ""}.`);
    }

    // Maximum selections validation
    if (maxSelections !== undefined && itemCount > maxSelections) {
        validationErrors.push(`Please select no more than ${maxSelections} ${fieldType}${maxSelections !== 1 ? "s" : ""}.`);
    }

    // Only show the first error to keep it simple
    if (validationErrors.length > 0) {
        return <div className="text-red-500 text-sm mt-1">{validationErrors[0]}</div>;
    }

    return null;
};

// Hook to manage validation state
export const useFieldValidation = () => {
    const [hasBlurred, setHasBlurred] = React.useState(false);

    const handleBlur = () => {
        setHasBlurred(true);
    };

    const resetValidation = () => {
        setHasBlurred(false);
    };

    return {
        hasBlurred,
        handleBlur,
        resetValidation,
        showValidation: hasBlurred,
    };
};
